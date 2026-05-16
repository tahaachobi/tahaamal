import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/password";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, email, role, phone, salonId } = await req.json();

    if (!name || !email || !salonId) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "User with this email already exists." }, { status: 400 });

    // Create staff user with a temporary password (they should reset it)
    const hashedPassword = await hashPassword("SalonStaff123!");

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        role: role as any,
        password: hashedPassword,
        salonId,
      }
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Staff creation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
