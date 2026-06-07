-- Migration 002: Add Google SSO fields to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_id  TEXT,
  ADD COLUMN IF NOT EXISTS picture    TEXT,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Make password_hash nullable so Google-only users don't need a password
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Unique index on google_id (sparse — only applies to non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)
  WHERE google_id IS NOT NULL;
