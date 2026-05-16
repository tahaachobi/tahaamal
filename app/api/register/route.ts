import { NextResponse } from "next/server";
import { Role } from "@/app/generated/prisma/enums";
import { isValidPhone, normalizeEmail, normalizePhone } from "@/lib/contact";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      name?: string;
      password?: string;
      phone?: string;
      role?: string;
      verificationId?: string;
      verificationMethod?: string;
    };

    const name = cleanText(body.name);
    const email = normalizeEmail(body.email);
    const phone = normalizePhone(body.phone);
    const password =
      typeof body.password === "string" ? body.password.trim() : "";
    const role = body.role;

    if (name.length < 2) {
      return NextResponse.json(
        { error: "Please enter a full name with at least 2 characters." },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    if (!phone || !isValidPhone(phone)) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid phone number with country code if needed.",
        },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Passwords must be at least 8 characters long." },
        { status: 400 },
      );
    }

    if (role !== Role.CLIENT && role !== Role.SALON_OWNER) {
      return NextResponse.json(
        { error: "Please choose either Client or Salon Owner." },
        { status: 400 },
      );
    }

    const existingUserByEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUserByEmail) {
      return NextResponse.json(
        {
          error: "An account with this email already exists.",
        },
        { status: 409 },
      );
    }

    const existingUserByPhone = await prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });

    if (existingUserByPhone) {
      return NextResponse.json(
        {
          error: "An account with this phone number already exists.",
        },
        { status: 409 },
      );
    }

    const hashedPassword = await hashPassword(password);

    await prisma.$transaction(async (transaction) => {
      await transaction.user.create({
        data: {
          email,
          emailVerifiedAt: new Date(),
          name,
          password: hashedPassword,
          phone,
          profileCompletedAt: new Date(),
          role,
        },
      });
    });

    return NextResponse.json(
      {
        ok: true,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration failed", error);

    return NextResponse.json(
      {
        error: "We could not create your account. Please try again.",
      },
      { status: 500 },
    );
  }
}
