import { NextResponse } from "next/server";
import { VerificationCodePurpose } from "@/app/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { normalizeEmail } from "@/lib/contact";
import { createHash, randomBytes } from "node:crypto";

const purpose = VerificationCodePurpose.SIGNUP;
const resetTokenTtlMs = 60 * 60 * 1000;

function getBaseUrl() {
  const configuredUrl = process.env.NEXTAUTH_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}

function buildPasswordResetIdentifier(email: string) {
  return `password-reset:${normalizeEmail(email)}`;
}

function hashPasswordResetToken(token: string) {
  const secret = process.env.NEXTAUTH_SECRET?.trim() || "development-secret";

  return createHash("sha256").update(`${token}:${secret}`).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: unknown };
    const email = normalizeEmail(body.email);

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { email: true },
    });

    if (!user) {
      // Don't leak whether user exists or not
      return NextResponse.json({ ok: true });
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = hashPasswordResetToken(token);
    const identifier = buildPasswordResetIdentifier(user.email);
    const expiresAt = new Date(Date.now() + resetTokenTtlMs);

    await prisma.verificationCode.deleteMany({
      where: {
        email: identifier,
        purpose,
        usedAt: null,
      },
    });

    await prisma.verificationCode.create({
      data: {
        email: identifier,
        purpose,
        codeHash: tokenHash,
        expiresAt,
      },
    });

    const resetUrl = `${getBaseUrl()}/reset-password/confirm?token=${token}&email=${encodeURIComponent(user.email)}`;

    await sendMail({
      to: user.email,
      subject: "Reset Your Password - SaaS Booking",
      text: `Reset your password by visiting this link: ${resetUrl}\n\nThis link expires in 1 hour. If you did not request a password reset, ignore this email.`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #152235;">
          <h2 style="color: #101d2a;">Reset Your Password</h2>
          <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
          <p>Click the button below to reset your password:</p>
          <div style="margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #183445; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="font-size: 14px; color: #607086;">Or copy and paste this link into your browser:</p>
          <p style="font-size: 14px; color: #607086; word-break: break-all;">${resetUrl}</p>
          <hr style="border: none; border-top: 1px solid #dce6f4; margin: 30px 0;" />
          <p style="font-size: 12px; color: #7d8ea5;">This link will expire in 1 hour.</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Password reset request failed:", error);
    return NextResponse.json(
      { error: "Could not process request. Please try again later." },
      { status: 500 }
    );
  }
}
