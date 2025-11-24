-- CreateTable
CREATE TABLE "OrderWarehousePick" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderWarehousePick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderWarehousePick_orderId_idx" ON "OrderWarehousePick"("orderId");

-- CreateIndex
CREATE INDEX "OrderWarehousePick_productId_idx" ON "OrderWarehousePick"("productId");

-- CreateIndex
CREATE INDEX "OrderWarehousePick_warehouseId_idx" ON "OrderWarehousePick"("warehouseId");

-- AddForeignKey
ALTER TABLE "OrderWarehousePick" ADD CONSTRAINT "OrderWarehousePick_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderWarehousePick" ADD CONSTRAINT "OrderWarehousePick_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderWarehousePick" ADD CONSTRAINT "OrderWarehousePick_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
