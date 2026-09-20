CREATE TABLE IF NOT EXISTS class_working_days (
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  day_name VARCHAR(20) NOT NULL,
  is_working BOOLEAN DEFAULT TRUE,
  teaching_period_count INTEGER DEFAULT 8,
  PRIMARY KEY (class_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_class_working_days_class ON class_working_days (class_id);

CREATE TABLE IF NOT EXISTS class_age_restrictions (
  class_id INTEGER PRIMARY KEY REFERENCES classes(id) ON DELETE CASCADE,
  min_age_years NUMERIC(4, 1),
  max_age_years NUMERIC(4, 1),
  as_on_mode VARCHAR(30) NOT NULL DEFAULT 'admission_date',
  as_on_date DATE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
