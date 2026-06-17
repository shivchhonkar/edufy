-- Verification Script for Exam Results System
-- Run this to check if everything is set up correctly

\echo '=========================================='
\echo 'Verifying Exam Results Setup'
\echo '=========================================='
\echo ''

-- 1. Check if exam_results table exists
\echo '1. Checking if exam_results table exists...'
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'exam_results'
        ) THEN 'âœ" exam_results table exists'
        ELSE 'âœ— exam_results table DOES NOT exist - Run create_exam_results_table.sql'
    END as status;

\echo ''

-- 2. Check table structure
\echo '2. Checking table columns...'
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'exam_results' 
ORDER BY ordinal_position;

\echo ''

-- 3. Check foreign key constraints
\echo '3. Checking foreign key constraints...'
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'exam_results';

\echo ''

-- 4. Check if there are any exam results
\echo '4. Checking existing exam results...'
SELECT 
    COUNT(*) as total_results,
    COUNT(DISTINCT exam_id) as total_exams,
    COUNT(DISTINCT student_id) as total_students
FROM exam_results;

\echo ''

-- 5. Check if exams table has required columns
\echo '5. Checking exams table structure...'
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'exams' AND column_name = 'subject_id'
        ) THEN 'âœ" exams.subject_id column exists'
        ELSE 'âœ— exams.subject_id column MISSING - Run FIX_EXAMS_NOW.sql'
    END as subject_id_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'exams' AND column_name = 'passing_marks'
        ) THEN 'âœ" exams.passing_marks column exists'
        ELSE 'âœ— exams.passing_marks column MISSING'
    END as passing_marks_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'exams' AND column_name = 'exam_date'
        ) THEN 'âœ" exams.exam_date column exists'
        ELSE 'âœ— exams.exam_date column MISSING'
    END as exam_date_check;

\echo ''

-- 6. Sample data (if any)
\echo '6. Sample exam results (latest 5)...'
SELECT 
    er.id,
    e.name as exam_name,
    s.first_name || ' ' || s.last_name as student_name,
    er.marks_obtained,
    e.total_marks,
    er.grade,
    er.is_absent,
    er.created_at
FROM exam_results er
LEFT JOIN exams e ON er.exam_id = e.id
LEFT JOIN students s ON er.student_id = s.id
ORDER BY er.created_at DESC
LIMIT 5;

\echo ''

-- 7. Check for orphaned records
\echo '7. Checking for data integrity issues...'
SELECT 
    (SELECT COUNT(*) FROM exam_results WHERE exam_id NOT IN (SELECT id FROM exams)) as orphaned_exam_ids,
    (SELECT COUNT(*) FROM exam_results WHERE student_id NOT IN (SELECT id FROM students)) as orphaned_student_ids;

\echo ''

-- 8. Summary
\echo '=========================================='
\echo 'Verification Complete!'
\echo '=========================================='
\echo 'If all checks pass, the system is ready to use.'
\echo 'Otherwise, follow the instructions above to fix issues.'
\echo ''

























































