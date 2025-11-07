/*
  Warnings:

  - You are about to drop the `user_roles` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."user_roles" DROP CONSTRAINT "user_roles_merchant_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_roles" DROP CONSTRAINT "user_roles_role_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_roles" DROP CONSTRAINT "user_roles_user_id_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "RoleName" NOT NULL DEFAULT 'MERCHANT';

-- DropTable
DROP TABLE "public"."user_roles";
