-- CreateTable
CREATE TABLE "call_logs" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "caller_id" TEXT NOT NULL,
    "duration" INTEGER,
    "notes" TEXT,
    "call_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_balances" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "total_collected" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_remitted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pending_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_remittance_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remittances" (
    "id" TEXT NOT NULL,
    "merchant_balance_id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "remittance_date" TIMESTAMP(3) NOT NULL,
    "payment_method" TEXT NOT NULL,
    "reference_number" TEXT,
    "notes" TEXT,
    "processed_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "remittances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_payment_collections" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "amount_collected" DOUBLE PRECISION NOT NULL,
    "collected_by" TEXT NOT NULL,
    "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_method" TEXT NOT NULL DEFAULT 'CASH',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_payment_collections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "call_logs_order_id_idx" ON "call_logs"("order_id");

-- CreateIndex
CREATE INDEX "call_logs_customer_id_idx" ON "call_logs"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_balances_merchant_id_key" ON "merchant_balances"("merchant_id");

-- CreateIndex
CREATE INDEX "remittances_merchant_id_idx" ON "remittances"("merchant_id");

-- CreateIndex
CREATE INDEX "order_payment_collections_order_id_idx" ON "order_payment_collections"("order_id");

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_caller_id_fkey" FOREIGN KEY ("caller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_balances" ADD CONSTRAINT "merchant_balances_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remittances" ADD CONSTRAINT "remittances_merchant_balance_id_fkey" FOREIGN KEY ("merchant_balance_id") REFERENCES "merchant_balances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remittances" ADD CONSTRAINT "remittances_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remittances" ADD CONSTRAINT "remittances_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_payment_collections" ADD CONSTRAINT "order_payment_collections_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_payment_collections" ADD CONSTRAINT "order_payment_collections_collected_by_fkey" FOREIGN KEY ("collected_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
