-- Create routines table for daily routine management
CREATE TABLE IF NOT EXISTS routines (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default_user',
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  estimated_minutes INTEGER DEFAULT 30,
  scheduled_start TIME NOT NULL,
  weekday_types JSONB NOT NULL DEFAULT '{"weekdays": true, "weekends": false}',
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, title, scheduled_start)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS routines_user_id_idx ON routines(user_id);
CREATE INDEX IF NOT EXISTS routines_is_enabled_idx ON routines(is_enabled);
CREATE INDEX IF NOT EXISTS routines_scheduled_start_idx ON routines(scheduled_start);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON routines TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON routines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON routines TO service_role;
