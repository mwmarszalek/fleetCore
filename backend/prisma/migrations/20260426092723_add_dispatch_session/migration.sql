-- CreateTable
CREATE TABLE "DispatchSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispatchSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DispatchSession_lineId_key" ON "DispatchSession"("lineId");

-- CreateIndex
CREATE INDEX "DispatchSession_userId_idx" ON "DispatchSession"("userId");

-- CreateIndex
CREATE INDEX "DispatchSession_cityId_idx" ON "DispatchSession"("cityId");

-- AddForeignKey
ALTER TABLE "DispatchSession" ADD CONSTRAINT "DispatchSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchSession" ADD CONSTRAINT "DispatchSession_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
