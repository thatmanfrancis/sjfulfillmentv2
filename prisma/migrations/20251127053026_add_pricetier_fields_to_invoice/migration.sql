-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "priceTierBreakdown" JSONB,
ADD COLUMN     "priceTierGroupId" TEXT;
