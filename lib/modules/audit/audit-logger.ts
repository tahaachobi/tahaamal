import prisma from "@/lib/prisma";

export interface AuditLogPayload {
  action: string;      // e.g., 'BOOKING_CREATED', 'PAYMENT_RECEIVED', 'CHAIR_UPDATED'
  entity: string;      // e.g., 'Booking', 'Transaction', 'Resource'
  entityId?: string;   // Optional primary key of the targeted record
  details?: Record<string, any> | string; // Metadata, custom reason, or before/after state
  userId?: string;     // User performing the action
  salonId: string;     // Associated salon for multi-tenant querying
}

/**
 * Creates an immutable audit log entry.
 * Financial adjustments, status transitions, and user actions flow here.
 */
export async function logAuditAction(payload: AuditLogPayload) {
  try {
    const detailsString = 
      typeof payload.details === "object" 
        ? JSON.stringify(payload.details) 
        : payload.details ?? "";

    const log = await prisma.auditLog.create({
      data: {
        action: payload.action,
        entity: payload.entity,
        entityId: payload.entityId ?? null,
        details: detailsString || null,
        userId: payload.userId ?? null,
        salonId: payload.salonId,
      },
    });

    return log;
  } catch (error) {
    console.error("Failed to write to AuditLog table:", error);
    // In production environments, we degrade gracefully rather than crash the request
    return null;
  }
}
