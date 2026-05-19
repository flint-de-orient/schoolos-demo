-- Add atomic receipt counter to Tenant for collision-free sequential receipt numbers
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "receiptCounter" INTEGER NOT NULL DEFAULT 0;
