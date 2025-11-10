-- AlterTable
ALTER TABLE "inventory" ADD COLUMN     "packed_quantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "picked_quantity" INTEGER NOT NULL DEFAULT 0;
