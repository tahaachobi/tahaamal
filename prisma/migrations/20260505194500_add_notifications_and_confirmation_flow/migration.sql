CREATE TYPE "ClientConfirmationStage" AS ENUM (
  'AWAITING_FIRST_CONFIRMATION',
  'FIRST_CONFIRMED',
  'AWAITING_FINAL_CONFIRMATION',
  'FINAL_CONFIRMED',
  'RESCHEDULE_REQUESTED'
);

CREATE TYPE "NotificationType" AS ENUM (
  'BOOKING_CREATED',
  'BOOKING_STATUS',
  'BOOKING_REMINDER',
  'CLIENT_CONFIRMATION',
  'RESCHEDULE_REQUEST'
);

ALTER TABLE "Booking"
ADD COLUMN "clientConfirmationStage" "ClientConfirmationStage" NOT NULL DEFAULT 'AWAITING_FIRST_CONFIRMATION',
ADD COLUMN "finalConfirmedAt" TIMESTAMP(3),
ADD COLUMN "firstConfirmationSentAt" TIMESTAMP(3),
ADD COLUMN "firstConfirmedAt" TIMESTAMP(3),
ADD COLUMN "reminderSentAt" TIMESTAMP(3);

UPDATE "Booking"
SET
  "firstConfirmationSentAt" = "createdAt",
  "firstConfirmedAt" = CASE
    WHEN "status" IN ('CONFIRMED', 'COMPLETED', 'NO_SHOW') THEN "updatedAt"
    ELSE NULL
  END,
  "finalConfirmedAt" = CASE
    WHEN "status" IN ('COMPLETED', 'NO_SHOW') THEN "updatedAt"
    ELSE NULL
  END,
  "clientConfirmationStage" = CASE
    WHEN "status" IN ('COMPLETED', 'NO_SHOW') THEN 'FINAL_CONFIRMED'::"ClientConfirmationStage"
    WHEN "status" = 'CONFIRMED' THEN 'FIRST_CONFIRMED'::"ClientConfirmationStage"
    ELSE 'AWAITING_FIRST_CONFIRMATION'::"ClientConfirmationStage"
  END;

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "bookingId" TEXT,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX "Notification_bookingId_createdAt_idx" ON "Notification"("bookingId", "createdAt");

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
