-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(20) UNIQUE NOT NULL,
    customer_first_name VARCHAR(100) NOT NULL,
    customer_last_name VARCHAR(100),
    customer_phone VARCHAR(20),
    subtotal BIGINT NOT NULL,
    discount BIGINT NOT NULL DEFAULT 0,
    total BIGINT NOT NULL,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    order_type VARCHAR(20) NOT NULL DEFAULT 'in-person',
    payment_method VARCHAR(20) NOT NULL DEFAULT 'cash',
    cashier_id UUID REFERENCES users(id) ON DELETE SET NULL,
    cashier_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    price BIGINT NOT NULL,
    quantity INTEGER NOT NULL,
    subtotal BIGINT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Order timeline table
CREATE TABLE IF NOT EXISTS order_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_type ON orders(order_type);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_timeline_order ON order_timeline(order_id);

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR(20) AS $$
DECLARE
    today_count INTEGER;
    new_number VARCHAR(20);
BEGIN
    SELECT COUNT(*) + 1 INTO today_count
    FROM orders
    WHERE DATE(created_at) = CURRENT_DATE;
    
    new_number := 'COOL-' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || '-' || LPAD(today_count::TEXT, 3, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;
