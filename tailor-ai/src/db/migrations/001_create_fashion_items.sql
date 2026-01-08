CREATE TABLE IF NOT EXISTS fashion_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    original_image_path TEXT NOT NULL,
    generated_image_path TEXT NOT NULL,
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index for user_id lookup
CREATE INDEX IF NOT EXISTS idx_fashion_items_user_id ON fashion_items(user_id);
