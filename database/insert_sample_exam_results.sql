-- Sample Data for Testing Exam Results Feature
-- This script inserts sample exams and results for testing the parent portal

-- Note: Update the IDs below based on your actual data
-- Run these queries first to get your actual IDs:
-- SELECT id, name FROM classes LIMIT 5;
-- SELECT id, name FROM subjects LIMIT 5;
-- SELECT id, first_name, last_name FROM students WHERE class_id = 1 LIMIT 5;

\echo 'Inserting Sample Exam Results Data...'
\echo ''

-- Step 1: Insert Sample Exams
\echo 'Step 1: Creating sample exams...'

INSERT INTO exams (name, class_id, subject_id, exam_type, exam_date, total_marks, passing_marks, created_by)
VALUES 
  ('Mid-Term Mathematics 2024', 1, 1, 'midterm', '2024-01-15', 100, 40, 1),
  ('Final Science Exam 2024', 1, 2, 'final', '2024-03-20', 100, 40, 1),
  ('Unit Test English', 1, 3, 'unit_test', '2024-02-10', 50, 20, 1),
  ('Monthly Test Hindi', 1, 4, 'monthly', '2024-01-25', 50, 20, 1)
ON CONFLICT DO NOTHING;

\echo 'Sample exams created!'
\echo ''

-- Step 2: Get the exam IDs we just created
\echo 'Step 2: Fetching created exam IDs...'
DO $$
DECLARE
  v_math_exam_id INTEGER;
  v_science_exam_id INTEGER;
  v_english_exam_id INTEGER;
  v_hindi_exam_id INTEGER;
  v_student_ids INTEGER[];
  v_student_id INTEGER;
BEGIN
  -- Get exam IDs
  SELECT id INTO v_math_exam_id FROM exams WHERE name = 'Mid-Term Mathematics 2024' LIMIT 1;
  SELECT id INTO v_science_exam_id FROM exams WHERE name = 'Final Science Exam 2024' LIMIT 1;
  SELECT id INTO v_english_exam_id FROM exams WHERE name = 'Unit Test English' LIMIT 1;
  SELECT id INTO v_hindi_exam_id FROM exams WHERE name = 'Monthly Test Hindi' LIMIT 1;

  -- Get first 5 student IDs from class 1 (adjust class_id as needed)
  SELECT ARRAY(SELECT id FROM students WHERE class_id = 1 LIMIT 5) INTO v_student_ids;

  -- Insert results for Mathematics Exam
  IF v_math_exam_id IS NOT NULL AND array_length(v_student_ids, 1) > 0 THEN
    -- Student 1: Excellent (95%)
    INSERT INTO exam_results (exam_id, student_id, marks_obtained, grade, is_absent, remarks, uploaded_by)
    VALUES (v_math_exam_id, v_student_ids[1], 95, 'A+', false, 'Excellent performance!', 1)
    ON CONFLICT (exam_id, student_id) DO NOTHING;

    -- Student 2: Good (78%)
    IF array_length(v_student_ids, 1) >= 2 THEN
      INSERT INTO exam_results (exam_id, student_id, marks_obtained, grade, is_absent, remarks, uploaded_by)
      VALUES (v_math_exam_id, v_student_ids[2], 78, 'B+', false, 'Good work, keep it up!', 1)
      ON CONFLICT (exam_id, student_id) DO NOTHING;
    END IF;

    -- Student 3: Average (62%)
    IF array_length(v_student_ids, 1) >= 3 THEN
      INSERT INTO exam_results (exam_id, student_id, marks_obtained, grade, is_absent, remarks, uploaded_by)
      VALUES (v_math_exam_id, v_student_ids[3], 62, 'B', false, 'Need more practice', 1)
      ON CONFLICT (exam_id, student_id) DO NOTHING;
    END IF;

    -- Student 4: Below Average (45%)
    IF array_length(v_student_ids, 1) >= 4 THEN
      INSERT INTO exam_results (exam_id, student_id, marks_obtained, grade, is_absent, remarks, uploaded_by)
      VALUES (v_math_exam_id, v_student_ids[4], 45, 'D', false, 'Please focus on basics', 1)
      ON CONFLICT (exam_id, student_id) DO NOTHING;
    END IF;

    -- Student 5: Absent
    IF array_length(v_student_ids, 1) >= 5 THEN
      INSERT INTO exam_results (exam_id, student_id, marks_obtained, grade, is_absent, remarks, uploaded_by)
      VALUES (v_math_exam_id, v_student_ids[5], 0, 'F', true, 'Absent due to illness', 1)
      ON CONFLICT (exam_id, student_id) DO NOTHING;
    END IF;

    RAISE NOTICE 'Math exam results inserted for % students', array_length(v_student_ids, 1);
  END IF;

  -- Insert results for Science Exam
  IF v_science_exam_id IS NOT NULL AND array_length(v_student_ids, 1) > 0 THEN
    INSERT INTO exam_results (exam_id, student_id, marks_obtained, grade, is_absent, remarks, uploaded_by)
    VALUES 
      (v_science_exam_id, v_student_ids[1], 88, 'A', false, 'Very good understanding', 1),
      (v_science_exam_id, v_student_ids[2], 72, 'B+', false, 'Good effort', 1),
      (v_science_exam_id, v_student_ids[3], 55, 'C', false, 'Can do better', 1),
      (v_science_exam_id, v_student_ids[4], 65, 'B', false, 'Improved performance!', 1),
      (v_science_exam_id, v_student_ids[5], 42, 'D', false, 'Need improvement', 1)
    ON CONFLICT (exam_id, student_id) DO NOTHING;

    RAISE NOTICE 'Science exam results inserted';
  END IF;

  -- Insert results for English Exam (out of 50)
  IF v_english_exam_id IS NOT NULL AND array_length(v_student_ids, 1) > 0 THEN
    INSERT INTO exam_results (exam_id, student_id, marks_obtained, grade, is_absent, remarks, uploaded_by)
    VALUES 
      (v_english_exam_id, v_student_ids[1], 46, 'A', false, 'Excellent writing skills', 1),
      (v_english_exam_id, v_student_ids[2], 38, 'B+', false, 'Good grammar', 1),
      (v_english_exam_id, v_student_ids[3], 32, 'B', false, NULL, 1),
      (v_english_exam_id, v_student_ids[4], 28, 'C', false, NULL, 1),
      (v_english_exam_id, v_student_ids[5], 22, 'D', false, 'Work on vocabulary', 1)
    ON CONFLICT (exam_id, student_id) DO NOTHING;

    RAISE NOTICE 'English exam results inserted';
  END IF;

  -- Insert results for Hindi Exam (out of 50)
  IF v_hindi_exam_id IS NOT NULL AND array_length(v_student_ids, 1) > 0 THEN
    INSERT INTO exam_results (exam_id, student_id, marks_obtained, grade, is_absent, remarks, uploaded_by)
    VALUES 
      (v_hindi_exam_id, v_student_ids[1], 42, 'A', false, NULL, 1),
      (v_hindi_exam_id, v_student_ids[2], 35, 'B', false, NULL, 1),
      (v_hindi_exam_id, v_student_ids[3], 40, 'A', false, 'Great improvement!', 1),
      (v_hindi_exam_id, v_student_ids[4], 30, 'B', false, NULL, 1),
      (v_hindi_exam_id, v_student_ids[5], 25, 'C', false, NULL, 1)
    ON CONFLICT (exam_id, student_id) DO NOTHING;

    RAISE NOTICE 'Hindi exam results inserted';
  END IF;

END $$;

\echo ''
\echo 'Sample data insertion complete!'
\echo ''

-- Show what was inserted
\echo 'Summary of inserted data:'
\echo ''

SELECT 
    e.name as exam_name,
    COUNT(er.id) as total_results,
    AVG(er.marks_obtained) as avg_marks,
    e.total_marks,
    COUNT(CASE WHEN er.is_absent THEN 1 END) as absent_count
FROM exams e
LEFT JOIN exam_results er ON e.id = er.exam_id
WHERE e.name LIKE '%2024%' OR e.name LIKE '%Test%'
GROUP BY e.id, e.name, e.total_marks
ORDER BY e.created_at DESC;

\echo ''
\echo 'Sample exam results have been inserted successfully!'
\echo 'You can now test the parent portal results page.'

























































