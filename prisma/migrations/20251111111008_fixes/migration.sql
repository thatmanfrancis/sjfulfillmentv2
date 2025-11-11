-- CreateTable
CREATE TABLE "logistics_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "coverageStates" JSONB NOT NULL DEFAULT '[]',
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logistics_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delegation_requests" (
    "id" TEXT NOT NULL,
    "delivery_attempt_id" TEXT NOT NULL,
    "from_user_id" TEXT NOT NULL,
    "to_user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "delegation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "logistics_profiles_user_id_key" ON "logistics_profiles"("user_id");

-- AddForeignKey
ALTER TABLE "logistics_profiles" ADD CONSTRAINT "logistics_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegation_requests" ADD CONSTRAINT "delegation_requests_delivery_attempt_id_fkey" FOREIGN KEY ("delivery_attempt_id") REFERENCES "delivery_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegation_requests" ADD CONSTRAINT "delegation_requests_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegation_requests" ADD CONSTRAINT "delegation_requests_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
