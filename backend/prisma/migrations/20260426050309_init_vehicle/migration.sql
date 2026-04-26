-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "depot" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vehicle_cityId_idx" ON "Vehicle"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_number_cityId_key" ON "Vehicle"("number", "cityId");
