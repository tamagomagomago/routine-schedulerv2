-- Create daily_concerns table for storing user's daily concerns/worries
-- Allows users to track concerns throughout the day and review them in the evening

CREATE TABLE daily_concerns (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id TEXT NOT NULL,
  concern_date DATE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Unique constraint: one entry per user per day
  UNIQUE(user_id, concern_date)
);

-- Enable RLS
ALTER TABLE daily_concerns ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own concerns"
  ON daily_concerns
  FOR SELECT
  USING (user_id = current_user_id());

CREATE POLICY "Users can insert their own concerns"
  ON daily_concerns
  FOR INSERT
  WITH CHECK (user_id = current_user_id());

CREATE POLICY "Users can update their own concerns"
  ON daily_concerns
  FOR UPDATE
  USING (user_id = current_user_id());

CREATE POLICY "Users can delete their own concerns"
  ON daily_concerns
  FOR DELETE
  USING (user_id = current_user_id());

-- Grant permissions to roles
GRANT SELECT, INSERT, UPDATE, DELETE ON daily_concerns TO anon, authenticated, service_role;
