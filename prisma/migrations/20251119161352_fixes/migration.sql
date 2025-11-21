/*
  Warnings:

  - A unique constraint covering the columns `[trackingNumber]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `trackingNumber` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "trackingNumber" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Order_trackingNumber_key" ON "Order"("trackingNumber");
