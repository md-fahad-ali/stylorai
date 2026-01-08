
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
