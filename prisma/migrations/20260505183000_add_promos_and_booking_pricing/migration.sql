CREATE TYPE "PromoType" AS ENUM ('PERCENTAGE', 'FIXED');

ALTER TABLE "Booking"
ADD COLUMN "promoCodeId" TEXT,
ADD COLUMN "originalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "finalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "appliedPromoCode" TEXT;

CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "PromoType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "usageLimit" INTEGER,
    "oneTimePerClient" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Booking_promoCodeId_idx" ON "Booking"("promoCodeId");
CREATE INDEX "PromoCode_salonId_isActive_idx" ON "PromoCode"("salonId", "isActive");
CREATE UNIQUE INDEX "PromoCode_salonId_code_key" ON "PromoCode"("salonId", "code");

ALTER TABLE "Booking"
ADD CONSTRAINT "Booking_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PromoCode"
ADD CONSTRAINT "PromoCode_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "Booking" AS booking
SET
  "originalPrice" = service."price",
  "discountAmount" = 0,
  "finalPrice" = service."price"
FROM "Service" AS service
WHERE booking."serviceId" = service."id";
