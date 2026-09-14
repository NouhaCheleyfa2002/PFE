-- Migration 038: Create Stripe Payment System
-- Creates orders, order_items, and payments tables for marketplace checkout flow

-- Orders table: Represents a complete checkout session
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'TND',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- pending, paid, failed, cancelled, refunded
  stripe_session_id VARCHAR(255) UNIQUE,
  -- Stripe Checkout Session ID
  stripe_payment_intent_id VARCHAR(255),
  -- Stripe PaymentIntent ID
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Order items table: Individual resources in an order
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  resource_type VARCHAR(20) NOT NULL DEFAULT 'document',
  -- document or exam
  price DECIMAL(10, 2) NOT NULL,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Who gets paid for this resource
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table: Payment transaction details from Stripe
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'TND',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- pending, succeeded, failed, cancelled, refunded
  payment_method VARCHAR(50),
  -- card brand, payment method type
  last4 VARCHAR(4),
  -- Last 4 digits of card
  stripe_charge_id VARCHAR(255),
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_orders_user_id ON orders(user_id);

CREATE INDEX idx_orders_status ON orders(status);

CREATE INDEX idx_orders_stripe_session_id ON orders(stripe_session_id);

CREATE INDEX idx_orders_created_at ON orders(created_at);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);

CREATE INDEX idx_order_items_resource_id ON order_items(resource_id);

CREATE INDEX idx_order_items_teacher_id ON order_items(teacher_id);

CREATE INDEX idx_payments_order_id ON payments(order_id);

CREATE INDEX idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);

CREATE INDEX idx_payments_status ON payments(status);

-- Add stripe checkout fields to existing purchases table for backward compatibility
ALTER TABLE purchases
ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

ALTER TABLE purchases
ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255);

-- Update trigger for orders updated_at
CREATE OR REPLACE FUNCTION update_orders_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP;

RETURN NEW;

END;

$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at_trigger BEFORE
UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_orders_updated_at();

-- Update trigger for payments updated_at
CREATE OR REPLACE FUNCTION update_payments_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP;

RETURN NEW;

END;

$$ LANGUAGE plpgsql;

CREATE TRIGGER payments_updated_at_trigger BEFORE
UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_payments_updated_at();

-- Insert migration record
INSERT INTO
  migrations (name, executed_at)
VALUES
  ('038-create-stripe-payment-system', CURRENT_TIMESTAMP);
