import { NextResponse } from "next/server";
import { Role } from "@/app/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { validateTenantContext } from "@/lib/modules/auth/tenant-guard";
import { logAuditAction } from "@/lib/modules/audit/audit-logger";

import { dispatchLunaEvent, LunaEvent } from "@/lib/events/event-dispatcher";

export async function POST(req: Request) {
  try {
    // Only Salon Owner and Admin can register new chairs/stations
    const authResult = await validateTenantContext([Role.SALON_OWNER, Role.ADMIN]);
    
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 400 });
    }

    const context = authResult.context!;
    const body = await req.json();
    const { name, type } = body;

    // Use body salonId only if logged in user is platform ADMIN; otherwise enforce session salonId
    const targetSalonId = context.role === Role.ADMIN ? (body.salonId || context.salonId) : context.salonId;

    if (!name || !type || !targetSalonId) {
      return NextResponse.json({ error: "Missing required fields: name, type, and/or salonId" }, { status: 400 });
    }

    // Check unique name constraint within this salon to avoid db crash
    const existing = await prisma.resource.findFirst({
      where: { salonId: targetSalonId, name },
    });

    if (existing) {
      return NextResponse.json({ error: "A resource with this name already exists in your salon." }, { status: 409 });
    }

    const resource = await prisma.resource.create({
      data: { name, type, salonId: targetSalonId },
    });

    // Write audit log
    await logAuditAction({
      action: "RESOURCE_CREATED",
      entity: "Resource",
      entityId: resource.id,
      details: { name, type, salonId: targetSalonId },
      userId: context.userId,
      salonId: targetSalonId,
    });

    return NextResponse.json({ success: true, resource }, { status: 201 });
  } catch (error) {
    console.error("Resource POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    // Owners, Cashiers, Staff, and Admins can update resource status
    const authResult = await validateTenantContext([
      Role.SALON_OWNER,
      Role.CASHIER,
      Role.STAFF,
      Role.ADMIN,
    ]);

    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 400 });
    }

    const context = authResult.context!;
    const { id, status } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ error: "Missing required fields: id and status" }, { status: 400 });
    }

    // Strict multi-tenant data leak guard: Check if the resource belongs to this salon
    const existingResource = await prisma.resource.findUnique({
      where: { id },
      select: { id: true, status: true, type: true, salonId: true, name: true },
    });

    if (!existingResource) {
      return NextResponse.json({ error: "Resource not found." }, { status: 404 });
    }

    if (context.role !== Role.ADMIN && existingResource.salonId !== context.salonId) {
      return NextResponse.json({ error: "Forbidden. Cross-tenant modification blocked." }, { status: 403 });
    }

    const previousStatus = existingResource.status;

    const resource = await prisma.resource.update({
      where: { id },
      data: { status },
    });

    // Write audit log for the state change
    await logAuditAction({
      action: "RESOURCE_STATUS_UPDATED",
      entity: "Resource",
      entityId: resource.id,
      details: {
        name: existingResource.name,
        previousStatus,
        nextStatus: status,
      },
      userId: context.userId,
      salonId: existingResource.salonId,
    });

    if (existingResource.type === "CHAIR") {
      dispatchLunaEvent(LunaEvent.ChairUpdated, {
        chairId: resource.id,
        salonId: existingResource.salonId,
        previousStatus,
        nextStatus: status,
        userId: context.userId,
      });
    }

    return NextResponse.json({ success: true, resource });
  } catch (error) {
    console.error("Resource PATCH error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
