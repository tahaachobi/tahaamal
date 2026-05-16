import { NextResponse } from "next/server";
import { Role } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { isValidPhone, normalizePhone } from "@/lib/contact";
import { hashPassword } from "@/lib/password";
import { combineProfileName } from "@/lib/profile-fields";
import prisma from "@/lib/prisma";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Sign in first to complete your profile." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      firstName?: string;
      lastName?: string;
      password?: string;
      phone?: string;
      role?: string;
    };

    const firstName = cleanText(body.firstName);
    const lastName = cleanText(body.lastName);
    const phoneInput =
      typeof body.phone === "string" ? body.phone.trim() : "";
    const phone = phoneInput ? normalizePhone(phoneInput) : "";
    const password =
      typeof body.password === "string" ? body.password.trim() : "";
    const role = body.role;
    const name = combineProfileName(firstName, lastName);

    if (firstName.length < 2) {
      return NextResponse.json(
        { error: "Please enter a first name with at least 2 characters." },
        { status: 400 },
      );
    }

    if (lastName.length < 2) {
      return NextResponse.json(
        { error: "Please enter a last name with at least 2 characters." },
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

    if (role !== Role.CLIENT && role !== Role.SALON_OWNER) {
      return NextResponse.json(
        { error: "Please choose either Client or Salon Owner." },
        { status: 400 },
      );
    }

    if (password && password.length < 8) {
      return NextResponse.json(
        {
          error:
            "If you set a password for email sign-in, it must be at least 8 characters long.",
        },
        { status: 400 },
      );
    }

    const conflictingPhone = await prisma.user.findFirst({
      where: {
        phone,
        id: {
          not: session.user.id,
        },
      },
      select: { id: true },
    });

    if (conflictingPhone) {
      return NextResponse.json(
        { error: "An account with this phone number already exists." },
        { status: 409 },
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        password: password ? await hashPassword(password) : undefined,
        phone,
        profileCompletedAt: new Date(),
        role,
      },
      select: {
        role: true,
      },
    });

    return NextResponse.json({
      destination:
        updatedUser.role === Role.SALON_OWNER ? "/dashboard" : "/account",
      ok: true,
    });
  } catch (error) {
    console.error("Profile completion failed", error);

    return NextResponse.json(
      { error: "We could not save your profile right now. Please try again." },
      { status: 500 },
    );
  }
}
