-- Phase 4: student_medical_records — one medical profile per student

CREATE TABLE IF NOT EXISTS student_medical_records (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
    blood_group VARCHAR(10),
    allergies TEXT,
    chronic_disease TEXT,
    disability TEXT,
    doctor_name VARCHAR(255),
    doctor_contact VARCHAR(20),
    emergency_contact VARCHAR(20),
    medical_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_medical_records_student_id
  ON student_medical_records (student_id);

-- Backfill blood_group from students master (if present)
INSERT INTO student_medical_records (student_id, blood_group)
SELECT s.id, s.blood_group
FROM students s
WHERE s.blood_group IS NOT NULL
  AND TRIM(s.blood_group) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM student_medical_records m WHERE m.student_id = s.id
  );
