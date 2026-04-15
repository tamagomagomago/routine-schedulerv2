-- Clean up and reset all tables
DROP TABLE IF EXISTS daily_concerns CASCADE;
DROP TABLE IF EXISTS routines CASCADE;
DROP TABLE IF EXISTS todos CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS weekly_visions CASCADE;

-- Remove any orphaned RLS policies
DROP POLICY IF EXISTS "Users can view their own concerns" ON daily_concerns;
DROP POLICY IF EXISTS "Users can insert their own concerns" ON daily_concerns;
DROP POLICY IF EXISTS "Users can update their own concerns" ON daily_concerns;
DROP POLICY IF EXISTS "Users can delete their own concerns" ON daily_concerns;
