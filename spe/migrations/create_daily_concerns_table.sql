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

-- RLS is disabled for simplicity (uses default_user)
-- If using auth in future, enable and update policies to use auth.uid()

-- Grant permissions to roles
GRANT SELECT, INSERT, UPDATE, DELETE ON daily_concerns TO anon, authenticated, service_role;
