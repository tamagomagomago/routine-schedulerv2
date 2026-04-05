-- Focus Sessions Table
CREATE TABLE IF NOT EXISTS focus_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  mode_name TEXT NOT NULL,
  target_minutes INTEGER NOT NULL,
  actual_minutes INTEGER,
  break_minutes INTEGER,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  break_end_time TIMESTAMP WITH TIME ZONE,
  session_status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Focus Modes Table
CREATE TABLE IF NOT EXISTS focus_modes (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  mode_name TEXT NOT NULL UNIQUE,
  color_hex TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Focus Goals Table
CREATE TABLE IF NOT EXISTS focus_goals (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  goal_type TEXT NOT NULL,
  target_minutes INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_date ON focus_sessions(user_id, DATE(start_time));
CREATE INDEX IF NOT EXISTS idx_focus_modes_user ON focus_modes(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_goals_user ON focus_goals(user_id);
