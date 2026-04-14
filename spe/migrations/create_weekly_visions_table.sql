-- Create weekly_visions table for storing weekly vision states
CREATE TABLE IF NOT EXISTS weekly_visions (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default_user',
  week_start DATE NOT NULL,
  monday_vision TEXT,
  sunday_vision TEXT,
  is_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS weekly_visions_user_id_idx ON weekly_visions(user_id);
CREATE INDEX IF NOT EXISTS weekly_visions_week_start_idx ON weekly_visions(week_start);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON weekly_visions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON weekly_visions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON weekly_visions TO service_role;
