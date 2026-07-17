-- Add takeaway override support to orders
ALTER TABLE orders ADD COLUMN takeaway_override BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN takeaway_fee INTEGER DEFAULT 0;

-- Update payment events to track takeaway overrides
-- (no schema change needed, just documenting the new 'takeaway_override' kind)

CREATE INDEX idx_orders_takeaway_override ON orders(takeaway_override);
