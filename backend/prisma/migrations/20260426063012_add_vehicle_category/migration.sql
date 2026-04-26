-- CreateEnum
CREATE TYPE "VehicleCategory" AS ENUM ('BUS', 'TRAM');

-- AlterTable: dodaj z DEFAULT, potem usuń default (standard dla NOT NULL na istniejącej tabeli)
ALTER TABLE "Vehicle" ADD COLUMN "category" "VehicleCategory" NOT NULL DEFAULT 'BUS';
ALTER TABLE "Vehicle" ALTER COLUMN "category" DROP DEFAULT;
