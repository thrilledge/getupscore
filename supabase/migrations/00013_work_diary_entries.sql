-- Work diary entries (time tracking for hourly contracts)
CREATE TABLE IF NOT EXISTS work_diary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours_worked DECIMAL(5,2) NOT NULL CHECK (hours_worked > 0),
  notes TEXT,
  screenshot_count INTEGER DEFAULT 0,
  activity_level INTEGER CHECK (activity_level >= 0 AND activity_level <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_diary_user_id ON work_diary_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_work_diary_contract_id ON work_diary_entries(contract_id);
CREATE INDEX IF NOT EXISTS idx_work_diary_date ON work_diary_entries(date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_work_diary_unique_entry ON work_diary_entries(user_id, contract_id, date);

ALTER TABLE work_diary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own diary entries"
  ON work_diary_entries FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can manage own diary entries"
  ON work_diary_entries FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own diary entries"
  ON work_diary_entries FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own diary entries"
  ON work_diary_entries FOR DELETE
  USING ((select auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION update_work_diary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_work_diary_updated_at
  BEFORE UPDATE ON work_diary_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_work_diary_updated_at();
