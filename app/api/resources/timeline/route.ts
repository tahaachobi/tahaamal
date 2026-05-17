import { NextResponse } from "next/server";
import { ChairState, Role } from "@/app/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { validateTenantContext } from "@/lib/modules/auth/tenant-guard";
import { dispatchLunaEvent, LunaEvent } from "@/lib/events/event-dispatcher";

export async function POST(req: Request) {
  try {
    const { resourceId, bookingId, nextState, notes } = await req.json();

    // Stylists (STAFF), Cashiers, Owners, and Admins can advance timeline states
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
    const targetSalonId = context.salonId;

    if (!targetSalonId) {
      return NextResponse.json({ error: "Missing salon identifier." }, { status: 400 });
    }

    if (!resourceId || !nextState) {
      return NextResponse.json({ error: "Missing required fields: resourceId and nextState" }, { status: 400 });
    }

    const validStates = [
      ChairState.RESERVED,
      ChairState.STARTED,
      ChairState.PAUSED,
      ChairState.COMPLETED,
    ];

    if (!validStates.includes(nextState as ChairState)) {
      return NextResponse.json({ error: `Invalid state. Permitted: ${validStates.join(", ")}` }, { status: 400 });
    }

    // 1. Verify resource exists, belongs to this salon
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      return NextResponse.json({ error: "Resource station not found." }, { status: 404 });
    }

    if (context.role !== Role.ADMIN && resource.salonId !== targetSalonId) {
      return NextResponse.json({ error: "Forbidden. Resource does not belong to your salon." }, { status: 403 });
    }

    // 2. Fetch the active assignment for staff context (if any)
    const activeAssignment = await prisma.chairAssignment.findFirst({
      where: {
        resourceId,
        revokedAt: null,
      },
      select: { staffId: true },
    });

    // 3. Find or create timeline node
    let timeline = await prisma.chairTimeline.findFirst({
      where: {
        resourceId,
        salonId: targetSalonId,
        state: { not: ChairState.COMPLETED },
      },
    });

    const now = new Date();
    const stateTransition = nextState as ChairState;

    if (!timeline) {
      // Create a brand new timeline tracker
      timeline = await prisma.chairTimeline.create({
        data: {
          salonId: targetSalonId,
          resourceId,
          bookingId: bookingId || null,
          staffId: activeAssignment?.staffId || context.userId,
          state: stateTransition,
          notes: notes || null,
          startedAt: stateTransition === ChairState.STARTED ? now : null,
          pausedAt: stateTransition === ChairState.PAUSED ? now : null,
        },
      });
    } else {
      // Update existing timeline tracker
      const updateData: any = {
        state: stateTransition,
        notes: notes !== undefined ? notes : timeline.notes,
      };

      if (stateTransition === ChairState.STARTED && !timeline.startedAt) {
        updateData.startedAt = now;
      } else if (stateTransition === ChairState.PAUSED) {
        updateData.pausedAt = now;
      } else if (stateTransition === ChairState.COMPLETED) {
        updateData.completedAt = now;
      }

      timeline = await prisma.chairTimeline.update({
        where: { id: timeline.id },
        data: updateData,
      });
    }

    // 4. Align Resource model status with Timeline state transitions
    let nextResourceStatus = "FREE";
    if (stateTransition === ChairState.RESERVED) {
      nextResourceStatus = "FREE"; // Still technically free until occupied
    } else if (stateTransition === ChairState.STARTED) {
      nextResourceStatus = "BUSY";
    } else if (stateTransition === ChairState.PAUSED) {
      nextResourceStatus = "CLEANING"; // Or intermediate status
    } else if (stateTransition === ChairState.COMPLETED) {
      nextResourceStatus = "FREE";
    }

    const previousStatus = resource.status;

    await prisma.resource.update({
      where: { id: resourceId },
      data: { status: nextResourceStatus },
    });

    // 5. Emit event to eventBus to asynchronously write audit logs in background
    dispatchLunaEvent(LunaEvent.ChairUpdated, {
      chairId: resourceId,
      salonId: targetSalonId,
      previousStatus,
      nextStatus: nextResourceStatus,
      userId: context.userId,
    });

    return NextResponse.json({
      success: true,
      timeline,
      resourceStatus: nextResourceStatus,
    });
  } catch (error) {
    console.error("Chair timeline POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
