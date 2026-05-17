import { NextResponse } from "next/server";
import { Role } from "@/app/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { validateTenantContext } from "@/lib/modules/auth/tenant-guard";
import { logAuditAction } from "@/lib/modules/audit/audit-logger";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, role, phone, salonId: requestSalonId } = body;

    // Enforce that only Salon Owners and Platform Admins can register new staff members
    const authResult = await validateTenantContext(
      [Role.SALON_OWNER, Role.ADMIN],
      requestSalonId
    );

    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 400 });
    }

    const context = authResult.context!;
    const targetSalonId = context.salonId;

    if (!targetSalonId) {
      return NextResponse.json({ error: "Missing salon identifier." }, { status: 400 });
    }

    if (!name || !email || !role) {
      return NextResponse.json({ error: "Missing required fields: name, email, and role." }, { status: 400 });
    }

    // Verify role belongs to permissible staff roles (no one can register another ADMIN or SALON_OWNER this way)
    const permissibleRoles: Role[] = [Role.CASHIER, Role.STAFF, Role.STOCK_MANAGER];
    if (!permissibleRoles.includes(role as Role)) {
      return NextResponse.json({ error: "Invalid role assigned to staff member." }, { status: 400 });
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
    }

    // Create staff user with a secure temporary password
    const hashedPassword = await hashPassword("SalonStaff123!");

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        role: role as Role,
        password: hashedPassword,
        salonId: targetSalonId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        salonId: true,
      }
    });

    // Log the event securely
    await logAuditAction({
      action: "STAFF_REGISTERED",
      entity: "User",
      entityId: user.id,
      details: { name, email, role, phone },
      userId: context.userId,
      salonId: targetSalonId,
    });

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    console.error("Staff creation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
