-- Shopping Lists Table
CREATE TABLE IF NOT EXISTS shopping_lists (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default_user',
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weekly Tasks Table
CREATE TABLE IF NOT EXISTS weekly_tasks (
  id BIGSERIAL PRIMARY KEY,
  goal_id TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT 'default_user',
  category TEXT NOT NULL,
  allocated_minutes INTEGER DEFAULT 0,
  actual_minutes INTEGER DEFAULT 0,
  week_number INTEGER NOT NULL,
  month TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weekly Subtasks Table
CREATE TABLE IF NOT EXISTS weekly_subtasks (
  id BIGSERIAL PRIMARY KEY,
  weekly_task_id BIGINT NOT NULL REFERENCES weekly_tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  estimated_minutes INTEGER DEFAULT 0,
  actual_minutes INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Extend Goals table (if not already extended)
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS breakdown_config JSONB,
ADD COLUMN IF NOT EXISTS decomposed_at TIMESTAMP WITH TIME ZONE;

-- Extend Focus Sessions table (if not already extended)
ALTER TABLE focus_sessions
ADD COLUMN IF NOT EXISTS linked_subtask_id BIGINT,
ADD COLUMN IF NOT EXISTS linked_weekly_task_id BIGINT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_id ON shopping_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_category ON shopping_lists(category);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_is_completed ON shopping_lists(is_completed);

CREATE INDEX IF NOT EXISTS idx_weekly_tasks_goal_id ON weekly_tasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_weekly_tasks_user_id ON weekly_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_tasks_week_number ON weekly_tasks(week_number);
CREATE INDEX IF NOT EXISTS idx_weekly_tasks_month ON weekly_tasks(month);

CREATE INDEX IF NOT EXISTS idx_weekly_subtasks_weekly_task_id ON weekly_subtasks(weekly_task_id);
