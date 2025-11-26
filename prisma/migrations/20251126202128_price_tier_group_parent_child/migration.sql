-- AlterTable
ALTER TABLE "PricingTier" ADD COLUMN     "groupId" TEXT;

-- CreateTable
CREATE TABLE "PriceTierGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceTierGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PricingTier_groupId_idx" ON "PricingTier"("groupId");

-- AddForeignKey
ALTER TABLE "PricingTier" ADD CONSTRAINT "PricingTier_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PriceTierGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
