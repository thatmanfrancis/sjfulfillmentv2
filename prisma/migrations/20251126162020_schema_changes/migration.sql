-- CreateTable
CREATE TABLE "AdminApiKey" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminApiKey_apiKey_key" ON "AdminApiKey"("apiKey");

-- CreateIndex
CREATE INDEX "AdminApiKey_adminId_idx" ON "AdminApiKey"("adminId");

-- AddForeignKey
ALTER TABLE "AdminApiKey" ADD CONSTRAINT "AdminApiKey_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
