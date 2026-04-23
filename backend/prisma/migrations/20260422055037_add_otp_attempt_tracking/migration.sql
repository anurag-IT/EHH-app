-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetOtpAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "resetOtpLockedAt" TIMESTAMP(3);
