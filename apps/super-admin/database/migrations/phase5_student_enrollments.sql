-- Phase 5: student_enrollments — session-wise class history (preserves promotions)

-- Ensure academic_years exists (required for enrollment FK)
CREATE TABLE IF NOT EXISTS academic_years (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_enrollments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
    academic_year VARCHAR(20) NOT NULL,
    class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
    section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
    roll_number VARCHAR(50),
    stream_id INTEGER,
    house_id INTEGER,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'promoted', 'repeated', 'transferred', 'left')),
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (student_id, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_student_id
  ON student_enrollments (student_id);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_current
  ON student_enrollments (student_id, is_current)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_student_enrollments_session
  ON student_enrollments (academic_year_id, class_id, section_id);

-- Backfill current enrollment from students.class_id / section_id
INSERT INTO student_enrollments (
    student_id,
    academic_year_id,
    academic_year,
    class_id,
    section_id,
    roll_number,
    status,
    is_current
)
SELECT
    s.id,
    (SELECT id FROM academic_years WHERE is_active = true LIMIT 1),
    COALESCE(
        (SELECT name FROM academic_years WHERE is_active = true LIMIT 1),
        TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || TO_CHAR((CURRENT_DATE + INTERVAL '1 year')::date, 'YYYY')
    ),
    CASE WHEN EXISTS (SELECT 1 FROM classes c WHERE c.id = s.class_id) THEN s.class_id ELSE NULL END,
    CASE WHEN EXISTS (SELECT 1 FROM sections sec WHERE sec.id = s.section_id) THEN s.section_id ELSE NULL END,
    s.roll_number,
    CASE WHEN s.status = 'active' THEN 'active' ELSE s.status END,
    true
FROM students s
WHERE s.class_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM student_enrollments e
    WHERE e.student_id = s.id
      AND e.is_current = true
  );
