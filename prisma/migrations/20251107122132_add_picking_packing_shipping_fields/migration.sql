-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "packed_quantity" INTEGER,
ADD COLUMN     "picked_quantity" INTEGER;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "delivered_at" TIMESTAMP(3),
ADD COLUMN     "shipped_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "shipments" ADD COLUMN     "created_by" TEXT;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
