import { NextResponse } from "next/server";
import { VerificationCodePurpose } from "@/app/generated/prisma/enums";
import {
  EMAIL_CODE_TTL_MINUTES,
  buildLoginVerificationIdentifier,
  generateVerificationCode,
  getVerificationCodeExpiryDate,
  hashVerificationCode,
} from "@/lib/auth-flow";
import { normalizeEmail } from "@/lib/contact";
import { sendLoginVerificationCodeEmail } from "@/lib/mail";
import prisma from "@/lib/prisma";

const purpose = VerificationCodePurpose.SIGNUP;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildLoginIdentifierCandidates(email: string) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return [];
  }

  return [buildLoginVerificationIdentifier(normalizedEmail)];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: string;
      code?: string;
      email?: string;
    };

    const action = typeof body.action === "string" ? body.action : "";
    const email = normalizeEmail(body.email);

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    const identifier = buildLoginVerificationIdentifier(email);
    const identifierCandidates = buildLoginIdentifierCandidates(email);

    await prisma.verificationCode.deleteMany({
      where: {
        email: {
          in: identifierCandidates,
        },
        purpose,
        OR: [
          {
            expiresAt: {
              lte: new Date(),
            },
          },
          {
            usedAt: {
              not: null,
            },
          },
        ],
      },
    });

    if (action === "send") {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (!user) {
        return NextResponse.json(
          { error: "No account was found for this email address." },
          { status: 404 },
        );
      }

      await prisma.verificationCode.deleteMany({
        where: {
          email: {
            in: identifierCandidates,
          },
          purpose,
        },
      });

      const code = generateVerificationCode();

      await prisma.verificationCode.create({
        data: {
          codeHash: hashVerificationCode(identifier, code),
          email: identifier,
          expiresAt: getVerificationCodeExpiryDate(),
          purpose,
        },
      });

      const result = await sendLoginVerificationCodeEmail({
        code,
        email,
      });

      if (result.fallback && process.env.NODE_ENV === "production") {
        await prisma.verificationCode.deleteMany({
          where: {
            email: {
              in: identifierCandidates,
            },
            purpose,
          },
        });

        return NextResponse.json(
          {
            error:
              "Email delivery is not configured yet. Add SMTP settings before using email verification.",
          },
          { status: 503 },
        );
      }

      return NextResponse.json({
        contact: email,
        debugCode: process.env.NODE_ENV !== "production" ? code : undefined,
        expiresInMinutes: EMAIL_CODE_TTL_MINUTES,
        fallback: result.fallback,
        ok: true,
      });
    }

    if (action === "verify") {
      const code = typeof body.code === "string" ? body.code.trim() : "";

      if (!/^\d{6}$/.test(code)) {
        return NextResponse.json(
          { error: "Enter the 6-digit code we sent to you." },
          { status: 400 },
        );
      }

      const record = await prisma.verificationCode.findFirst({
        where: {
          email: {
            in: identifierCandidates,
          },
          purpose,
          usedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          codeHash: true,
          email: true,
          id: true,
        },
      });

      if (!record || record.codeHash !== hashVerificationCode(record.email, code)) {
        return NextResponse.json(
          { error: "That code is invalid or has expired. Request a new one." },
          { status: 400 },
        );
      }

      await prisma.verificationCode.update({
        where: { id: record.id },
        data: {
          verifiedAt: new Date(),
        },
      });

      return NextResponse.json({
        ok: true,
        verificationId: record.id,
      });
    }

    return NextResponse.json(
      { error: "Unsupported verification action." },
      { status: 400 },
    );
  } catch (error) {
    console.error("Login code flow failed", error);

    return NextResponse.json(
      { error: "We could not process that verification request right now." },
      { status: 500 },
    );
  }
}
