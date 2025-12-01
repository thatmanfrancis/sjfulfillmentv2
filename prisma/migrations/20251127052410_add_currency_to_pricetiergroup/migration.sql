-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "priceTierBreakdown" JSONB,
ADD COLUMN     "priceTierGroupId" TEXT;

-- AlterTable
ALTER TABLE "PriceTierGroup" ALTER COLUMN "currency" DROP NOT NULL,
ALTER COLUMN "currency" DROP DEFAULT;
