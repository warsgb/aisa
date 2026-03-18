-- Add API Token field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS api_token VARCHAR(255) UNIQUE;
CREATE UNIQUE INDEX IF NOT EXISTS UQ_users_api_token ON users(api_token) WHERE api_token IS NOT NULL;
