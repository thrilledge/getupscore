-- Add portfolio JSONB column to store portfolio items
ALTER TABLE upwork_profiles
ADD COLUMN IF NOT EXISTS portfolio JSONB DEFAULT '[]'::jsonb;
