-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'cashier',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for username lookup
CREATE INDEX idx_users_username ON users(username);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password_hash, name, role) VALUES 
('admin', '$2a$10$rQEYkj.mJKvNxHpWGvmwxOHJwmPMjSqXBfqXS0xJ5mZp4FhC5Kqgu', 'مدیر سیستم', 'admin'),
('cashier', '$2a$10$rQEYkj.mJKvNxHpWGvmwxOHJwmPMjSqXBfqXS0xJ5mZp4FhC5Kqgu', 'صندوق‌دار', 'cashier')
ON CONFLICT (username) DO NOTHING;
