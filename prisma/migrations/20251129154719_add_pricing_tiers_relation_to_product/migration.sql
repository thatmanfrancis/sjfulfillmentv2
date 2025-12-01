-- AlterTable
ALTER TABLE "PricingTier" ADD COLUMN     "productId" TEXT,
ADD COLUMN     "quantity" INTEGER DEFAULT 1;

-- AddForeignKey
ALTER TABLE "PricingTier" ADD CONSTRAINT "PricingTier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
