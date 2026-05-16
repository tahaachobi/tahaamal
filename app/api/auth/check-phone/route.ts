import { NextResponse } from "next/server";
import { isValidPhone, normalizePhone } from "@/lib/contact";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      phone?: unknown;
    };
    const phone = normalizePhone(body.phone);

    if (!phone || !isValidPhone(phone)) {
      return NextResponse.json(
        { error: "Please enter a valid phone number." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        phone,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account was found for this phone number." },
        { status: 404 },
      );
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("Phone login check failed", error);

    return NextResponse.json(
      { error: "We could not check that phone number right now." },
      { status: 500 },
    );
  }
}
