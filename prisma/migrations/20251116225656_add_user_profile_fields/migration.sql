-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "language" TEXT DEFAULT 'en',
ADD COLUMN     "location" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "position" TEXT,
ADD COLUMN     "profileImage" TEXT,
ADD COLUMN     "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "timezone" TEXT DEFAULT 'UTC',
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
