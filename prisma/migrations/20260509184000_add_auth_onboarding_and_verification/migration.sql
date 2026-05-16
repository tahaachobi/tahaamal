CREATE TYPE "VerificationCodePurpose" AS ENUM ('SIGNUP');

ALTER TABLE "User"
ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN "googleId" TEXT,
ADD COLUMN "profileCompletedAt" TIMESTAMP(3);

UPDATE "User"
SET
  "emailVerifiedAt" = COALESCE("emailVerifiedAt", "createdAt"),
  "profileCompletedAt" = COALESCE("profileCompletedAt", "createdAt");

CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

CREATE TABLE "VerificationCode" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "purpose" "VerificationCodePurpose" NOT NULL DEFAULT 'SIGNUP',
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VerificationCode_email_purpose_createdAt_idx"
ON "VerificationCode"("email", "purpose", "createdAt");

CREATE INDEX "VerificationCode_expiresAt_idx"
ON "VerificationCode"("expiresAt");
