-- Migration: Add purchases/transactions table
-- Created: 2024-01-10

-- Create purchases table to track paid resource transactions
CREATE TABLE IF NOT EXISTS purchases (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "documentId" UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  "amount" DECIMAL(10, 2) NOT NULL,
  "currency" VARCHAR(3) DEFAULT 'TND',
  "payment_method" VARCHAR(20) DEFAULT 'card',
  "transaction_id" VARCHAR(255) UNIQUE,
  "status" VARCHAR(20) DEFAULT 'completed',
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases("userId");
CREATE INDEX IF NOT EXISTS idx_purchases_document ON purchases("documentId");
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases("status");
CREATE INDEX IF NOT EXISTS idx_purchases_created ON purchases("created_at");

-- Create composite index for user's purchased documents
CREATE INDEX IF NOT EXISTS idx_purchases_user_document ON purchases("userId", "documentId");

-- Add trigger to update analytics when purchase is made
CREATE OR REPLACE FUNCTION increment_document_sales()
RETURNS TRIGGER AS $$
BEGIN
  -- For now, just return NEW. We can add sales count to documents later if needed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_sales
AFTER INSERT ON purchases
FOR EACH ROW
EXECUTE FUNCTION increment_document_sales();
