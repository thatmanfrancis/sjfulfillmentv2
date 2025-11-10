-- DropForeignKey
ALTER TABLE "public"."product_categories" DROP CONSTRAINT "product_categories_merchant_id_fkey";

-- AlterTable
ALTER TABLE "product_categories" ALTER COLUMN "merchant_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
