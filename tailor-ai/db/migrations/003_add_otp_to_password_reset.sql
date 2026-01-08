-- Add OTP column to password_reset_tokens table
ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS otp VARCHAR(6);

-- Create index on OTP for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_otp ON password_reset_tokens(otp);
