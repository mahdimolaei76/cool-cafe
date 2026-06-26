-- Menu items table
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price BIGINT NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    image_url VARCHAR(500),
    is_available BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_available ON menu_items(is_available);
CREATE INDEX idx_menu_items_featured ON menu_items(is_featured);

-- Insert sample menu items
INSERT INTO menu_items (name, description, price, category_id, image_url, is_available, is_featured)
SELECT 
    'اسپرسو',
    'اسپرسو غلیظ و قوی با طعم عالی از دانه‌های مرغوب',
    45000,
    (SELECT id FROM categories WHERE slug = 'hot-coffee'),
    '/images/coffee-hot.jpg',
    true,
    true
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'اسپرسو');

INSERT INTO menu_items (name, description, price, category_id, image_url, is_available, is_featured)
SELECT 
    'کاپوچینو',
    'ترکیب عالی اسپرسو، شیر بخار داده و کف شیر نرم',
    65000,
    (SELECT id FROM categories WHERE slug = 'hot-coffee'),
    '/images/coffee-hot.jpg',
    true,
    true
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'کاپوچینو');

INSERT INTO menu_items (name, description, price, category_id, image_url, is_available, is_featured)
SELECT 
    'آیس لاته',
    'اسپرسو سرد با شیر و یخ، خنک و دلچسب',
    75000,
    (SELECT id FROM categories WHERE slug = 'cold-coffee'),
    '/images/coffee-cold.jpg',
    true,
    true
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'آیس لاته');

INSERT INTO menu_items (name, description, price, category_id, image_url, is_available, is_featured)
SELECT 
    'چیزکیک',
    'چیزکیک نیویورکی با بیسکوئیت کره‌ای',
    110000,
    (SELECT id FROM categories WHERE slug = 'cakes'),
    '/images/cake.jpg',
    true,
    true
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'چیزکیک');

INSERT INTO menu_items (name, description, price, category_id, image_url, is_available, is_featured)
SELECT 
    'کروسان',
    'کروسان تازه کره‌ای با لایه‌های طلایی',
    55000,
    (SELECT id FROM categories WHERE slug = 'pastries'),
    '/images/pastry.jpg',
    true,
    true
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'کروسان');
