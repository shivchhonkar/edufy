-- Father/mother contact fields on students (parent_* = father legacy columns)

ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_name VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_phone VARCHAR(20);
ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_email VARCHAR(255);

-- Ensure default father/mother guardian rows for students with profile data
INSERT INTO student_guardians (student_id, relation_type, name, mobile, email, is_primary_contact)
SELECT s.id, 'father', TRIM(s.parent_name), s.parent_phone, s.parent_email, true
FROM students s
WHERE s.parent_name IS NOT NULL
  AND TRIM(s.parent_name) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM student_guardians g
    WHERE g.student_id = s.id AND g.relation_type = 'father'
  );

INSERT INTO student_guardians (student_id, relation_type, name, mobile, email, is_primary_contact)
SELECT s.id, 'mother', TRIM(s.mother_name), s.mother_phone, s.mother_email, false
FROM students s
WHERE s.mother_name IS NOT NULL
  AND TRIM(s.mother_name) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM student_guardians g
    WHERE g.student_id = s.id AND g.relation_type = 'mother'
  );

-- Placeholder mother/father rows so guardians tab always has both slots
INSERT INTO student_guardians (student_id, relation_type, name, mobile, email, is_primary_contact)
SELECT s.id, 'father', '—', NULL, NULL, false
FROM students s
WHERE NOT EXISTS (
  SELECT 1 FROM student_guardians g
  WHERE g.student_id = s.id AND g.relation_type = 'father'
);

INSERT INTO student_guardians (student_id, relation_type, name, mobile, email, is_primary_contact)
SELECT s.id, 'mother', '—', NULL, NULL, false
FROM students s
WHERE NOT EXISTS (
  SELECT 1 FROM student_guardians g
  WHERE g.student_id = s.id AND g.relation_type = 'mother'
);
