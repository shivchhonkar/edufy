-- Phase 21: Examination Result Processing Engine
-- Centralized compilation, grading, ranking, publishing, and promotion recommendations

-- Workflow on exams (legacy rows default to 'published' for backward compatibility)
ALTER TABLE exams ADD COLUMN IF NOT EXISTS result_workflow_status VARCHAR(20)
  DEFAULT 'published'
  CHECK (result_workflow_status IN ('draft', 'under_review', 'approved', 'published'));

ALTER TABLE exams ADD COLUMN IF NOT EXISTS academic_year_id INTEGER REFERENCES academic_years(id);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS submitted_for_review_at TIMESTAMP;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS submitted_for_review_by INTEGER REFERENCES users(id);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS published_by INTEGER REFERENCES users(id);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS minimum_overall_percentage DECIMAL(5,2) DEFAULT 33.00;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS last_compiled_at TIMESTAMP;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS last_compiled_by INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_exams_result_workflow ON exams(result_workflow_status);
CREATE INDEX IF NOT EXISTS idx_exams_academic_year_id ON exams(academic_year_id);

-- Configurable grading scale (CBSE defaults)
CREATE TABLE IF NOT EXISTS grading_config (
  id SERIAL PRIMARY KEY,
  min_percentage DECIMAL(5,2) NOT NULL,
  max_percentage DECIMAL(5,2) NOT NULL,
  grade VARCHAR(5) NOT NULL,
  grade_point DECIMAL(4,2),
  remarks VARCHAR(100),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT grading_config_range_chk CHECK (min_percentage <= max_percentage)
);

CREATE UNIQUE INDEX IF NOT EXISTS grading_config_grade_active_idx
  ON grading_config (grade) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_grading_config_active_sort
  ON grading_config (is_active, sort_order DESC);

INSERT INTO grading_config (min_percentage, max_percentage, grade, grade_point, remarks, sort_order)
SELECT v.min_p, v.max_p, v.grade, v.gp, v.rem, v.ord
FROM (VALUES
  (91.00, 100.00, 'A1', 10.0, 'EXCELLENT', 8),
  (81.00, 90.99,  'A2', 9.0,  'VERY GOOD', 7),
  (71.00, 80.99,  'B1', 8.0,  'GOOD', 6),
  (61.00, 70.99,  'B2', 7.0,  'FAIR', 5),
  (51.00, 60.99,  'C1', 6.0,  'SATISFACTORY', 4),
  (41.00, 50.99,  'C2', 5.0,  'AVERAGE', 3),
  (33.00, 40.99,  'D',  4.0,  'NEEDS IMPROVEMENT', 2),
  (0.00,  32.99,  'E',  0.0,  'NEEDS IMPROVEMENT', 1)
) AS v(min_p, max_p, grade, gp, rem, ord)
WHERE NOT EXISTS (SELECT 1 FROM grading_config LIMIT 1);

-- Compiled student summaries (single source of truth after compilation)
CREATE TABLE IF NOT EXISTS student_exam_summary (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER,
  academic_year_id INTEGER REFERENCES academic_years(id),
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
  total_subjects INTEGER NOT NULL DEFAULT 0,
  passed_subjects INTEGER NOT NULL DEFAULT 0,
  failed_subjects INTEGER NOT NULL DEFAULT 0,
  total_marks DECIMAL(10,2) NOT NULL DEFAULT 0,
  obtained_marks DECIMAL(10,2) NOT NULL DEFAULT 0,
  percentage DECIMAL(6,2) NOT NULL DEFAULT 0,
  overall_grade VARCHAR(5),
  result_status VARCHAR(10) NOT NULL DEFAULT 'FAIL'
    CHECK (result_status IN ('PASS', 'FAIL')),
  class_rank INTEGER,
  section_rank INTEGER,
  school_rank INTEGER,
  compiled_at TIMESTAMP,
  compiled_by INTEGER REFERENCES users(id),
  publish_status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (publish_status IN ('draft', 'published')),
  published_at TIMESTAMP,
  published_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (exam_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_student_exam_summary_exam ON student_exam_summary(exam_id);
CREATE INDEX IF NOT EXISTS idx_student_exam_summary_student ON student_exam_summary(student_id);
CREATE INDEX IF NOT EXISTS idx_student_exam_summary_class ON student_exam_summary(class_id);
CREATE INDEX IF NOT EXISTS idx_student_exam_summary_section ON student_exam_summary(section_id);
CREATE INDEX IF NOT EXISTS idx_student_exam_summary_publish ON student_exam_summary(publish_status);
CREATE INDEX IF NOT EXISTS idx_student_exam_summary_ranks ON student_exam_summary(exam_id, class_rank, section_rank, school_rank);
CREATE INDEX IF NOT EXISTS idx_student_exam_summary_result ON student_exam_summary(exam_id, result_status);

-- Promotion rules per class
CREATE TABLE IF NOT EXISTS promotion_rules (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  academic_year_id INTEGER REFERENCES academic_years(id),
  max_failed_subjects INTEGER NOT NULL DEFAULT 0,
  minimum_percentage DECIMAL(5,2) NOT NULL DEFAULT 33.00,
  promote_if_pass BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (class_id, academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_promotion_rules_class ON promotion_rules(class_id);

-- Recommendations after annual / final compilation
CREATE TABLE IF NOT EXISTS student_promotion_recommendations (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER,
  academic_year_id INTEGER REFERENCES academic_years(id),
  exam_id INTEGER REFERENCES exams(id) ON DELETE SET NULL,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
  recommendation VARCHAR(20) NOT NULL
    CHECK (recommendation IN ('PROMOTE', 'DETAIN', 'REVIEW')),
  percentage DECIMAL(6,2),
  failed_subjects INTEGER NOT NULL DEFAULT 0,
  summary_id INTEGER REFERENCES student_exam_summary(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (student_id, academic_year_id, exam_id)
);

CREATE INDEX IF NOT EXISTS idx_promotion_rec_class ON student_promotion_recommendations(class_id);
CREATE INDEX IF NOT EXISTS idx_promotion_rec_recommendation ON student_promotion_recommendations(recommendation);

-- Audit trail for exam result workflow
CREATE TABLE IF NOT EXISTS exam_result_audit_log (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  actor_id INTEGER REFERENCES users(id),
  actor_role VARCHAR(50),
  previous_status VARCHAR(20),
  new_status VARCHAR(20),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exam_result_audit_exam ON exam_result_audit_log(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_result_audit_created ON exam_result_audit_log(created_at DESC);
