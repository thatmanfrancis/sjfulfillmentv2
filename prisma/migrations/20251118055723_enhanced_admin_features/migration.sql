/*
  Warnings:

  - Added the required column `title` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Setting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Warehouse` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'WARNING', 'ERROR', 'SUCCESS', 'PROMOTIONAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "actionLabel" TEXT,
ADD COLUMN     "actionUrl" TEXT,
ADD COLUMN     "audienceType" TEXT,
ADD COLUMN     "channels" TEXT[] DEFAULT ARRAY['IN_APP']::TEXT[],
ADD COLUMN     "content" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "priority" "NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "readCount" INTEGER DEFAULT 0,
ADD COLUMN     "scheduledFor" TIMESTAMP(3),
ADD COLUMN     "sentAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT DEFAULT 'PENDING',
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "totalRecipients" INTEGER DEFAULT 0,
ADD COLUMN     "type" "NotificationType" NOT NULL DEFAULT 'INFO',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN     "category" TEXT DEFAULT 'GENERAL',
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "defaultValue" TEXT,
ADD COLUMN     "isEditable" BOOLEAN DEFAULT true,
ADD COLUMN     "isPublic" BOOLEAN DEFAULT false,
ADD COLUMN     "isRequired" BOOLEAN DEFAULT false,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "scope" TEXT DEFAULT 'GLOBAL',
ADD COLUMN     "type" TEXT DEFAULT 'STRING',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedById" TEXT,
ADD COLUMN     "validationRules" JSONB;

-- AlterTable
ALTER TABLE "Warehouse" ADD COLUMN     "address" TEXT,
ADD COLUMN     "capacity" INTEGER DEFAULT 0,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "currentStock" INTEGER DEFAULT 0,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "manager" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "status" TEXT DEFAULT 'ACTIVE',
ADD COLUMN     "type" TEXT DEFAULT 'STORAGE',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "zipCode" TEXT,
ALTER COLUMN "code" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "type" TEXT,
    "category" TEXT,
    "status" TEXT DEFAULT 'DRAFT',
    "format" TEXT DEFAULT 'PDF',
    "frequency" TEXT DEFAULT 'ONCE',
    "filePath" TEXT,
    "fileSize" TEXT,
    "configuration" JSONB,
    "scheduledFor" TIMESTAMP(3),
    "lastGeneratedAt" TIMESTAMP(3),
    "nextScheduledAt" TIMESTAMP(3),
    "generationCount" INTEGER DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Report_createdById_idx" ON "Report"("createdById");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_createdById_idx" ON "Notification"("createdById");

-- CreateIndex
CREATE INDEX "Setting_updatedById_idx" ON "Setting"("updatedById");

-- CreateIndex
CREATE INDEX "Setting_category_idx" ON "Setting"("category");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
