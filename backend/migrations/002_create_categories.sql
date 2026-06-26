-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(10) NOT NULL DEFAULT '☕',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for active categories
CREATE INDEX idx_categories_active ON categories(is_active);
CREATE INDEX idx_categories_sort ON categories(sort_order);

-- Insert default categories
INSERT INTO categories (name, slug, icon, sort_order) VALUES 
('قهوه گرم', 'hot-coffee', '☕', 1),
('قهوه سرد', 'cold-coffee', '🧊', 2),
('چای و دمنوش', 'tea-herbal', '🍵', 3),
('کیک', 'cakes', '🎂', 4),
('دسر', 'desserts', '🍰', 5),
('شیرینی', 'pastries', '🥐', 6),
('صبحانه', 'breakfast', '🍳', 7),
('اسنک', 'snacks', '🥪', 8),
('نوشیدنی سرد', 'cold-drinks', '🥤', 9)
ON CONFLICT (slug) DO NOTHING;
