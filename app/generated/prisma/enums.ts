// Browser-safe and Type-safe Enum wrappers for Luna OS
// This uses 'import type' so Webpack completely strips server imports for the browser,
// while preserving 100% nominal type compatibility with the Prisma engine.

import type { $Enums } from "./index";

export type Role = $Enums.Role;
export const Role = {
  CLIENT: "CLIENT",
  SALON_OWNER: "SALON_OWNER",
  ADMIN: "ADMIN",
  CASHIER: "CASHIER",
  STAFF: "STAFF",
  STOCK_MANAGER: "STOCK_MANAGER"
} as const;

export type BookingStatus = $Enums.BookingStatus;
export const BookingStatus = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  CONFIRMED: "CONFIRMED",
  ARRIVING: "ARRIVING",
  IN_SERVICE: "IN_SERVICE",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
  NO_SHOW: "NO_SHOW"
} as const;

export type ClientConfirmationStage = $Enums.ClientConfirmationStage;
export const ClientConfirmationStage = {
  AWAITING_FIRST_CONFIRMATION: "AWAITING_FIRST_CONFIRMATION",
  FIRST_CONFIRMED: "FIRST_CONFIRMED",
  AWAITING_FINAL_CONFIRMATION: "AWAITING_FINAL_CONFIRMATION",
  FINAL_CONFIRMED: "FINAL_CONFIRMED",
  RESCHEDULE_REQUESTED: "RESCHEDULE_REQUESTED"
} as const;

export type PromoType = $Enums.PromoType;
export const PromoType = {
  PERCENTAGE: "PERCENTAGE",
  FIXED: "FIXED"
} as const;

export type NotificationType = $Enums.NotificationType;
export const NotificationType = {
  BOOKING_CREATED: "BOOKING_CREATED",
  BOOKING_STATUS: "BOOKING_STATUS",
  BOOKING_REMINDER: "BOOKING_REMINDER",
  CLIENT_CONFIRMATION: "CLIENT_CONFIRMATION",
  RESCHEDULE_REQUEST: "RESCHEDULE_REQUEST",
  LOYALTY_UPDATE: "LOYALTY_UPDATE"
} as const;

export type VerificationCodePurpose = $Enums.VerificationCodePurpose;
export const VerificationCodePurpose = {
  SIGNUP: "SIGNUP"
} as const;

export type SubscriptionStatus = $Enums.SubscriptionStatus;
export const SubscriptionStatus = {
  TRIAL: "TRIAL",
  ACTIVE: "ACTIVE",
  PAST_DUE: "PAST_DUE",
  EXPIRED: "EXPIRED",
  GRACE_PERIOD: "GRACE_PERIOD"
} as const;

export type ChairState = $Enums.ChairState;
export const ChairState = {
  RESERVED: "RESERVED",
  STARTED: "STARTED",
  PAUSED: "PAUSED",
  COMPLETED: "COMPLETED"
} as const;
