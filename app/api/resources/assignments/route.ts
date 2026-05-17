import { NextResponse } from "next/server";
import { Role } from "@/app/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { validateTenantContext } from "@/lib/modules/auth/tenant-guard";
import { logAuditAction } from "@/lib/modules/audit/audit-logger";

export async function POST(req: Request) {
  try {
    const { resourceId, staffId, action } = await req.json(); // action: "ASSIGN" | "REVOKE"

    // Only Owners, Cashiers, and Admins can assign or revoke staff from stations
    const authResult = await validateTenantContext([
      Role.SALON_OWNER,
      Role.CASHIER,
      Role.ADMIN,
    ]);

    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 400 });
    }

    const context = authResult.context!;
    const targetSalonId = context.salonId;

    if (!targetSalonId) {
      return NextResponse.json({ error: "Missing salon identifier." }, { status: 400 });
    }

    if (!resourceId || !staffId) {
      return NextResponse.json({ error: "Missing required fields: resourceId and staffId" }, { status: 400 });
    }

    // 1. Verify resource exists, belongs to this salon, and is of type "CHAIR"
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      return NextResponse.json({ error: "Resource station not found." }, { status: 404 });
    }

    if (context.role !== Role.ADMIN && resource.salonId !== targetSalonId) {
      return NextResponse.json({ error: "Forbidden. Resource does not belong to your salon." }, { status: 403 });
    }

    // 2. Verify staff exists, belongs to this salon, and is a staff member
    const staff = await prisma.user.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
    }

    if (context.role !== Role.ADMIN && staff.salonId !== targetSalonId) {
      return NextResponse.json({ error: "Forbidden. Staff member does not belong to your salon." }, { status: 403 });
    }

    if (staff.role === Role.CLIENT) {
      return NextResponse.json({ error: "Cannot assign client users to chairs." }, { status: 400 });
    }

    if (action === "REVOKE") {
      // Find active assignment
      const activeAssignment = await prisma.chairAssignment.findFirst({
        where: {
          resourceId,
          staffId,
          revokedAt: null,
        },
      });

      if (!activeAssignment) {
        return NextResponse.json({ error: "No active assignment found for this pair." }, { status: 400 });
      }

      const revoked = await prisma.chairAssignment.update({
        where: { id: activeAssignment.id },
        data: { revokedAt: new Date() },
      });

      await logAuditAction({
        action: "CHAIR_ASSIGNMENT_REVOKED",
        entity: "ChairAssignment",
        entityId: revoked.id,
        details: { resourceName: resource.name, staffName: staff.name },
        userId: context.userId,
        salonId: targetSalonId,
      });

      return NextResponse.json({ success: true, assignment: revoked });
    }

    // Default action: ASSIGN
    // Revoke any existing active assignments for this chair first (to enforce mutual exclusivity)
    await prisma.chairAssignment.updateMany({
      where: {
        resourceId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    const newAssignment = await prisma.chairAssignment.create({
      data: {
        resourceId,
        staffId,
      },
    });

    await logAuditAction({
      action: "CHAIR_ASSIGNMENT_CREATED",
      entity: "ChairAssignment",
      entityId: newAssignment.id,
      details: { resourceName: resource.name, staffName: staff.name },
      userId: context.userId,
      salonId: targetSalonId,
    });

    return NextResponse.json({ success: true, assignment: newAssignment }, { status: 201 });
  } catch (error) {
    console.error("Chair assignment POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
