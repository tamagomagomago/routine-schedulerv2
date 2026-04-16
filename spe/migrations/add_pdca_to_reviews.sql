-- Add PDCA fields to weekly_reviews_v2
ALTER TABLE weekly_reviews_v2
ADD COLUMN IF NOT EXISTS plan_achievements JSONB,
ADD COLUMN IF NOT EXISTS learnings JSONB,
ADD COLUMN IF NOT EXISTS current_state TEXT,
ADD COLUMN IF NOT EXISTS next_week_adjustments JSONB,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Updated_at トリガー
CREATE OR REPLACE FUNCTION update_weekly_reviews_v2_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_weekly_reviews_v2_updated_at_trigger ON weekly_reviews_v2;

CREATE TRIGGER update_weekly_reviews_v2_updated_at_trigger
BEFORE UPDATE ON weekly_reviews_v2
FOR EACH ROW
EXECUTE FUNCTION update_weekly_reviews_v2_updated_at();
