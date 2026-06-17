-- Phase 2: student_guardians — father, mother, guardian per student

CREATE TABLE IF NOT EXISTS student_guardians (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    relation_type VARCHAR(20) NOT NULL CHECK (relation_type IN ('father', 'mother', 'guardian')),
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20),
    alternate_mobile VARCHAR(20),
    email VARCHAR(255),
    occupation VARCHAR(100),
    annual_income DECIMAL(12, 2),
    company_name VARCHAR(255),
    aadhaar_no VARCHAR(20),
    photo TEXT,
    is_primary_contact BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_guardians_student_id
  ON student_guardians (student_id);

CREATE INDEX IF NOT EXISTS idx_student_guardians_relation
  ON student_guardians (student_id, relation_type);

-- Backfill legacy parent fields from students (one guardian row per student)
INSERT INTO student_guardians (student_id, relation_type, name, mobile, email, is_primary_contact)
SELECT s.id, 'guardian', s.parent_name, s.parent_phone, s.parent_email, true
FROM students s
WHERE s.parent_name IS NOT NULL
  AND TRIM(s.parent_name) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM student_guardians g
    WHERE g.student_id = s.id AND g.relation_type = 'guardian'
  );
