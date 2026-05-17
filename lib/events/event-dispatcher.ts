import { EventEmitter } from "events";
import { logAuditAction } from "@/lib/modules/audit/audit-logger";

export const eventBus = new EventEmitter();

// Define canonical domain events
export enum LunaEvent {
  BookingCreated = "BookingCreated",
  BookingConfirmed = "BookingConfirmed",
  PaymentReceived = "PaymentReceived",
  ServiceCompleted = "ServiceCompleted",
  ChairUpdated = "ChairUpdated",
  ClientCreated = "ClientCreated"
}

// Structs for payload compliance
export interface BookingCreatedPayload {
  bookingId: string;
  salonId: string;
  userId: string;
  serviceName: string;
  price: number;
  dateTime: Date | string;
}

export interface BookingConfirmedPayload {
  bookingId: string;
  salonId: string;
  userId: string;
  confirmedBy: string;
}

export interface PaymentReceivedPayload {
  transactionId: string;
  bookingId?: string;
  salonId: string;
  amount: number;
  paymentMethod: "CASH" | "CARD";
  cashierId: string;
}

export interface ServiceCompletedPayload {
  bookingId: string;
  salonId: string;
  staffId: string;
  clientId: string;
}

export interface ChairUpdatedPayload {
  chairId: string;
  salonId: string;
  previousStatus: string;
  nextStatus: string;
  userId: string;
}

export interface ClientCreatedPayload {
  clientId: string;
  salonId: string;
  email: string;
  name: string;
}

/**
 * Dispatches an event onto the async internal bus.
 */
export function dispatchLunaEvent(event: LunaEvent, payload: any) {
  // Use setImmediate to ensure execution is completely non-blocking and decoupled
  setImmediate(() => {
    try {
      eventBus.emit(event, payload);
    } catch (error) {
      console.error(`Error emitting event ${event}:`, error);
    }
  });
}

// ── Register Standard Listeners ──

// 1. Audit log listener (auto-logs all actions in the background)
eventBus.on(LunaEvent.BookingCreated, async (payload: BookingCreatedPayload) => {
  await logAuditAction({
    action: "BOOKING_CREATED",
    entity: "Booking",
    entityId: payload.bookingId,
    details: {
      service: payload.serviceName,
      price: payload.price,
      dateTime: payload.dateTime,
    },
    userId: payload.userId,
    salonId: payload.salonId,
  });
});

eventBus.on(LunaEvent.BookingConfirmed, async (payload: BookingConfirmedPayload) => {
  await logAuditAction({
    action: "BOOKING_CONFIRMED",
    entity: "Booking",
    entityId: payload.bookingId,
    details: { confirmedBy: payload.confirmedBy },
    userId: payload.confirmedBy,
    salonId: payload.salonId,
  });
});

eventBus.on(LunaEvent.PaymentReceived, async (payload: PaymentReceivedPayload) => {
  await logAuditAction({
    action: "TRANSACTION_CREATED",
    entity: "Transaction",
    entityId: payload.transactionId,
    details: {
      amount: payload.amount,
      paymentMethod: payload.paymentMethod,
      bookingId: payload.bookingId,
    },
    userId: payload.cashierId,
    salonId: payload.salonId,
  });
});

eventBus.on(LunaEvent.ChairUpdated, async (payload: ChairUpdatedPayload) => {
  await logAuditAction({
    action: "CHAIR_STATUS_UPDATED",
    entity: "Resource",
    entityId: payload.chairId,
    details: {
      previousStatus: payload.previousStatus,
      nextStatus: payload.nextStatus,
    },
    userId: payload.userId,
    salonId: payload.salonId,
  });
});

eventBus.on(LunaEvent.ClientCreated, async (payload: ClientCreatedPayload) => {
  await logAuditAction({
    action: "CLIENT_REGISTERED",
    entity: "User",
    entityId: payload.clientId,
    details: { email: payload.email, name: payload.name },
    salonId: payload.salonId,
  });
});
