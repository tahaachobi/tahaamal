import { NextResponse } from "next/server";
import { VerificationCodePurpose } from "@/app/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { normalizeEmail } from "@/lib/contact";
import { createHash } from "node:crypto";

const purpose = VerificationCodePurpose.SIGNUP;

function buildPasswordResetIdentifier(email: string) {
  return `password-reset:${normalizeEmail(email)}`;
}

function hashPasswordResetToken(token: string) {
  const secret = process.env.NEXTAUTH_SECRET?.trim() || "development-secret";

  return createHash("sha256").update(`${token}:${secret}`).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: unknown;
      password?: unknown;
      token?: unknown;
    };
    const email = normalizeEmail(body.email);
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !token || !password || password.length < 8) {
      return NextResponse.json({ error: "Invalid request parameters." }, { status: 400 });
    }

    const identifier = buildPasswordResetIdentifier(email);
    const tokenHash = hashPasswordResetToken(token);

    // Find the verification code
    const verificationRecord = await prisma.verificationCode.findFirst({
      where: {
        email: identifier,
        purpose,
        codeHash: tokenHash,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
      },
    });

    if (!verificationRecord) {
      return NextResponse.json(
        { error: "This password reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    await prisma.$transaction(async (transaction) => {
      // Update the user's password
      await transaction.user.update({
        where: { email },
        data: { password: hashedPassword },
      });

      // Mark the token as used
      await transaction.verificationCode.update({
        where: { id: verificationRecord.id },
        data: { usedAt: new Date() },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Password reset confirmation failed:", error);
    return NextResponse.json(
      { error: "Could not reset password. Please try again later." },
      { status: 500 }
    );
  }
}
