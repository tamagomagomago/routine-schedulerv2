-- Add description column to goals_v2 table
ALTER TABLE goals_v2
ADD COLUMN IF NOT EXISTS description TEXT;
