-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT;

-- CreateIndex
CREATE INDEX "Business_deletedAt_idx" ON "Business"("deletedAt");
