-- Add vision column to todos_v2
-- Run this in Supabase SQL Editor

ALTER TABLE todos_v2 ADD COLUMN IF NOT EXISTS vision TEXT;
