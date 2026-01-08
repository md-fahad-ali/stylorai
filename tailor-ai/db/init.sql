CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    full_name VARCHAR(255),
    avatar VARCHAR(255),
    apple_id VARCHAR(255) UNIQUE,
    birthdate DATE,
    gender VARCHAR(50),
    country VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fashion Preferences Table
CREATE TABLE IF NOT EXISTS fashion_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Multiple selections (stored as JSONB arrays)
    season JSONB DEFAULT '[]',              -- ["Spring", "Summer", "Autumn", "Winter"]
    style JSONB DEFAULT '[]',               -- ["Casual", "Smart Casual", "Formal", "Streetwear", "Minimalist", "Party", "Artistic", "Vintage", "Sporty"]
    preferences_color JSONB DEFAULT '[]',   -- ["Neutrals", "Warm Tones", "Cool Tones", "Earthy Tones", "Pastels", "Vibrant", "Monochrome", "Jewel Tones", "Metallics"]
    
    -- Single selections
    body_type VARCHAR(50),                  -- "Curvy", "Athletic", "Slim", "Pear", "Rectangle", "Round"
    skin_tone VARCHAR(50),                  -- "Fair", "Light-Medium", "Medium", "Dark", "Medium-Dark"
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_fashion_preferences_user_id ON fashion_preferences(user_id);

CREATE TABLE IF NOT EXISTS wardrobe (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    image_path VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wardrobe_user_id ON wardrobe(user_id);

-- Products Table for Awin Feed
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(255) UNIQUE NOT NULL, -- Awin Product ID
    product_name TEXT NOT NULL,
    description TEXT,
    product_url TEXT NOT NULL,
    image_url TEXT,
    price DECIMAL(10, 2),
    currency VARCHAR(10),
    category VARCHAR(255),
    advertiser_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
-- Full text search index
CREATE INDEX IF NOT EXISTS idx_products_product_name_fts ON products USING GIN (to_tsvector('english', product_name));

-- Add new columns for enhanced product data
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS keywords TEXT,
ADD COLUMN IF NOT EXISTS specifications TEXT,
ADD COLUMN IF NOT EXISTS rrp_price DECIMAL(10, 2), -- Recommended Retail Price (Old Price)
ADD COLUMN IF NOT EXISTS savings_percent DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS merchant_category_path TEXT;

-- Update full text search index to include keywords
DROP INDEX IF EXISTS idx_products_product_name_fts;
CREATE INDEX IF NOT EXISTS idx_products_full_search ON products USING GIN (to_tsvector('english', product_name || ' ' || COALESCE(keywords, '') || ' ' || COALESCE(description, '')));

-- Favorites Table for Smart Recommendations
CREATE TABLE IF NOT EXISTS favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    product_url TEXT NOT NULL,
    image_url TEXT,
    price TEXT,
    search_query TEXT, -- Stores the context (keywords) used to generate/find this item
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);

-- Favorite Outfits Table (Snapshot of entire outfit generation)
CREATE TABLE IF NOT EXISTS favorite_outfits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    title VARCHAR(255),
    description TEXT,
    products JSONB DEFAULT '[]', -- Stores the array of recommended products with search_query
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_favorite_outfits_user_id ON favorite_outfits(user_id);
