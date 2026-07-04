-- ================================================
-- COOL Café — Full Database Schema
-- ================================================

-- 1) Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'cashier',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Placeholder password_hash — the Go app replaces these on startup
INSERT INTO users (username, password_hash, name, role) VALUES
  ('admin',   'NEEDS_RESET', 'مدیر سیستم', 'admin'),
  ('cashier', 'NEEDS_RESET', 'صندوق‌دار',  'cashier')
ON CONFLICT (username) DO NOTHING;

-- 2) Categories
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(10) NOT NULL DEFAULT '☕',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_sort   ON categories(sort_order);

INSERT INTO categories (name, slug, icon, sort_order) VALUES
  ('قهوه گرم',     'hot-coffee',   '☕', 1),
  ('قهوه سرد',     'cold-coffee',  '🧊', 2),
  ('چای و دمنوش',  'tea-herbal',   '🍵', 3),
  ('کیک',          'cakes',        '🎂', 4),
  ('دسر',          'desserts',     '🍰', 5),
  ('شیرینی',       'pastries',     '🥐', 6),
  ('صبحانه',       'breakfast',    '🍳', 7),
  ('اسنک',         'snacks',       '🥪', 8),
  ('نوشیدنی سرد',  'cold-drinks',  '🥤', 9)
ON CONFLICT (slug) DO NOTHING;

-- 3) Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
    price BIGINT NOT NULL DEFAULT 0,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    image_url VARCHAR(500) DEFAULT '',
    is_available BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_category  ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(is_available);
CREATE INDEX IF NOT EXISTS idx_menu_items_featured  ON menu_items(is_featured);

-- 4) Orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(30) UNIQUE NOT NULL,
    customer_first_name VARCHAR(100) NOT NULL DEFAULT 'مشتری',
    customer_last_name VARCHAR(100) DEFAULT '',
    customer_phone VARCHAR(20) DEFAULT '',
    subtotal BIGINT NOT NULL DEFAULT 0,
    discount BIGINT NOT NULL DEFAULT 0,
    total BIGINT NOT NULL DEFAULT 0,
    notes TEXT DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    order_type VARCHAR(20) NOT NULL DEFAULT 'in-person',
    payment_method VARCHAR(20) NOT NULL DEFAULT 'cash',
    cashier_id UUID REFERENCES users(id) ON DELETE SET NULL,
    cashier_name VARCHAR(100) DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_type    ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_number  ON orders(order_number);

-- 5) Order Items
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    price BIGINT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    subtotal BIGINT NOT NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- 6) Order Timeline
CREATE TABLE IF NOT EXISTS order_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    note TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_timeline_order ON order_timeline(order_id);
