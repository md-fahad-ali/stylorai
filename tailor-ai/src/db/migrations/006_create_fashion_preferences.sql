CREATE TABLE IF NOT EXISTS fashion_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    season JSONB,
    style JSONB,
    preferences_color JSONB,
    body_type TEXT,
    skin_tone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_fashion_preferences_user_id ON fashion_preferences(user_id);
