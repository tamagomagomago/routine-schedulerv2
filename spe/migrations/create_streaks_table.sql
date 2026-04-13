-- Create streaks table for tracking consecutive daily completions by category
CREATE TABLE IF NOT EXISTS streaks (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL UNIQUE,
  current_streak INTEGER DEFAULT 0,
  last_completed_date DATE,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default streaks for main categories
INSERT INTO streaks (category, current_streak, enabled)
VALUES
  ('engineer', 0, true),
  ('english', 0, true),
  ('video', 0, true)
ON CONFLICT (category) DO NOTHING;
