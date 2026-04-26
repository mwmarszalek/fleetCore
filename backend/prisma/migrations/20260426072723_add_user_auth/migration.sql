-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CENTRAL_DISPATCHER', 'DEPOT_DISPATCHER', 'DRIVER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "cityId" TEXT NOT NULL,
    "depotId" TEXT,
    "vehicleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_cityId_idx" ON "User"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_cityId_key" ON "User"("email", "cityId");
