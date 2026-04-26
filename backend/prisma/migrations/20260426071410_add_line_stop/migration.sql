-- CreateTable
CREATE TABLE "Line" (
    "id" TEXT NOT NULL,
    "zditmId" INTEGER NOT NULL,
    "number" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subtype" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "onDemand" BOOLEAN NOT NULL DEFAULT false,
    "highlighted" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "depots" TEXT[],
    "cityId" TEXT NOT NULL,

    CONSTRAINT "Line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stop" (
    "id" TEXT NOT NULL,
    "zditmId" INTEGER NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "requestStop" BOOLEAN NOT NULL DEFAULT false,
    "parkAndRide" BOOLEAN NOT NULL DEFAULT false,
    "technical" BOOLEAN NOT NULL DEFAULT false,
    "railwayStationName" TEXT,
    "cityId" TEXT NOT NULL,

    CONSTRAINT "Stop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Line_zditmId_key" ON "Line"("zditmId");

-- CreateIndex
CREATE INDEX "Line_cityId_idx" ON "Line"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "Line_number_cityId_key" ON "Line"("number", "cityId");

-- CreateIndex
CREATE UNIQUE INDEX "Stop_zditmId_key" ON "Stop"("zditmId");

-- CreateIndex
CREATE INDEX "Stop_cityId_idx" ON "Stop"("cityId");

-- CreateIndex
CREATE INDEX "Stop_name_cityId_idx" ON "Stop"("name", "cityId");
