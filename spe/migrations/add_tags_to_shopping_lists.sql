-- Add tags column to shopping_lists table
ALTER TABLE shopping_lists
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{"百均"}';
