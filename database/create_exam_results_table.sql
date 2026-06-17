-- Create exam_results table
-- This table stores the results/marks of students for each exam

CREATE TABLE IF NOT EXISTS exam_results (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  marks_obtained DECIMAL(10, 2) NOT NULL DEFAULT 0,
  grade VARCHAR(5) NOT NULL DEFAULT 'F',
  remarks TEXT,
  is_absent BOOLEAN NOT NULL DEFAULT false,
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one result per student per exam
  CONSTRAINT unique_exam_student UNIQUE (exam_id, student_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_exam_results_exam_id ON exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_student_id ON exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_uploaded_by ON exam_results(uploaded_by);

-- Add comments for documentation
COMMENT ON TABLE exam_results IS 'Stores exam results and marks for students';
COMMENT ON COLUMN exam_results.id IS 'Primary key';
COMMENT ON COLUMN exam_results.exam_id IS 'Foreign key to exams table';
COMMENT ON COLUMN exam_results.student_id IS 'Foreign key to students table';
COMMENT ON COLUMN exam_results.marks_obtained IS 'Marks scored by student (0 if absent)';
COMMENT ON COLUMN exam_results.grade IS 'Calculated grade (A+, A, B+, B, C, D, F)';
COMMENT ON COLUMN exam_results.remarks IS 'Optional remarks or notes about the result';
COMMENT ON COLUMN exam_results.is_absent IS 'Whether student was absent for the exam';
COMMENT ON COLUMN exam_results.uploaded_by IS 'User ID who uploaded/updated the result';
COMMENT ON COLUMN exam_results.created_at IS 'Timestamp when result was first created';
COMMENT ON COLUMN exam_results.updated_at IS 'Timestamp when result was last updated';

