-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_changedById_fkey";

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "changedById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
