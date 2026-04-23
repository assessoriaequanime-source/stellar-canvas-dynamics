-- CreateTable
CREATE TABLE "TimeCapsule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "unlockDate" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeCapsule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalLegacy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "beneficiaries" JSONB NOT NULL,
    "assets" JSONB,
    "contractAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigitalLegacy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimeCapsule_userId_idx" ON "TimeCapsule"("userId");

-- CreateIndex
CREATE INDEX "TimeCapsule_unlockDate_idx" ON "TimeCapsule"("unlockDate");

-- CreateIndex
CREATE INDEX "DigitalLegacy_userId_idx" ON "DigitalLegacy"("userId");

-- AddForeignKey
ALTER TABLE "TimeCapsule" ADD CONSTRAINT "TimeCapsule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalLegacy" ADD CONSTRAINT "DigitalLegacy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
