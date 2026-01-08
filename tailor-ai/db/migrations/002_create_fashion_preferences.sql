-- Migration: Create fashion_preferences table
-- Created: 2025-12-29
-- Description: Store user's fashion DNA preferences

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
CREATE INDEX idx_fashion_preferences_user_id ON fashion_preferences(user_id);

-- Add comment to table
COMMENT ON TABLE fashion_preferences IS 'Stores user fashion DNA preferences for personalized outfit generation';

-- Add comments to columns
COMMENT ON COLUMN fashion_preferences.season IS 'User preferred seasons (multiple selections allowed)';
COMMENT ON COLUMN fashion_preferences.style IS 'User preferred styles (multiple selections allowed)';
COMMENT ON COLUMN fashion_preferences.preferences_color IS 'User preferred color palettes (multiple selections allowed)';
COMMENT ON COLUMN fashion_preferences.body_type IS 'User body type (single selection)';
COMMENT ON COLUMN fashion_preferences.skin_tone IS 'User skin tone (single selection)';
