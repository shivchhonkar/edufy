import type { RequestDb } from '@/lib/request-db';

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS exams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  exam_type VARCHAR(50) NOT NULL,
  exam_date DATE,
  total_marks INTEGER,
  passing_marks INTEGER,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE exams ADD COLUMN IF NOT EXISTS exam_date DATE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS subject_id INTEGER;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS passing_marks INTEGER;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS total_marks INTEGER;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'exams' AND column_name = 'start_date'
  ) THEN
    UPDATE exams SET exam_date = start_date
    WHERE exam_date IS NULL AND start_date IS NOT NULL;
  END IF;
END $$;

ALTER TABLE exams DROP CONSTRAINT IF EXISTS exams_exam_type_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exams_subject_id_fkey'
  ) THEN
    ALTER TABLE exams
      ADD CONSTRAINT exams_subject_id_fkey
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS exam_subjects (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  total_marks INTEGER,
  passing_marks INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_id, subject_id)
);

ALTER TABLE exam_subjects ADD COLUMN IF NOT EXISTS total_marks INTEGER;
ALTER TABLE exam_subjects ADD COLUMN IF NOT EXISTS passing_marks INTEGER;
ALTER TABLE exam_subjects ADD COLUMN IF NOT EXISTS max_marks INTEGER;
ALTER TABLE exam_subjects ADD COLUMN IF NOT EXISTS pass_marks INTEGER;
ALTER TABLE exam_subjects ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

UPDATE exam_subjects SET total_marks = max_marks WHERE total_marks IS NULL AND max_marks IS NOT NULL;
UPDATE exam_subjects SET passing_marks = pass_marks WHERE passing_marks IS NULL AND pass_marks IS NOT NULL;
UPDATE exam_subjects SET max_marks = total_marks WHERE max_marks IS NULL AND total_marks IS NOT NULL;
UPDATE exam_subjects SET pass_marks = passing_marks WHERE pass_marks IS NULL AND passing_marks IS NOT NULL;

CREATE TABLE IF NOT EXISTS exam_results (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  marks_obtained DECIMAL(5,2) NOT NULL DEFAULT 0,
  grade VARCHAR(2),
  remarks TEXT,
  is_absent BOOLEAN DEFAULT FALSE,
  uploaded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS subject_id INTEGER REFERENCES subjects(id);

UPDATE exam_results er
SET subject_id = e.subject_id
FROM exams e
WHERE er.exam_id = e.id AND er.subject_id IS NULL AND e.subject_id IS NOT NULL;

INSERT INTO exam_subjects (exam_id, subject_id, total_marks, passing_marks, max_marks, pass_marks)
SELECT e.id, e.subject_id, e.total_marks, e.passing_marks, e.total_marks, e.passing_marks
FROM exams e
WHERE e.subject_id IS NOT NULL
  AND e.total_marks IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM exam_subjects es WHERE es.exam_id = e.id AND es.subject_id = e.subject_id
  );

ALTER TABLE exam_results DROP CONSTRAINT IF EXISTS exam_results_exam_id_student_id_key;
ALTER TABLE exam_results DROP CONSTRAINT IF EXISTS unique_exam_student;

CREATE UNIQUE INDEX IF NOT EXISTS exam_results_exam_student_subject_idx
  ON exam_results (exam_id, student_id, subject_id);

CREATE INDEX IF NOT EXISTS idx_exams_class ON exams(class_id);
CREATE INDEX IF NOT EXISTS idx_exams_subject ON exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_exams_date ON exams(exam_date);
CREATE UNIQUE INDEX IF NOT EXISTS exam_subjects_exam_subject_unique ON exam_subjects(exam_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_exam_subjects_exam ON exam_subjects(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_exam ON exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_student ON exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_subject ON exam_results(subject_id);
`;

/** Idempotent — ensures exams / exam_results schema on tenant DBs. */
export async function ensureExamsSchema(db: RequestDb): Promise<void> {
  await db.query(MIGRATION_SQL);
}

export type ExamSubjectRow = {
  subject_id: number;
  subject_name: string;
  total_marks: number;
  passing_marks: number;
};

export async function fetchExamSubjects(db: RequestDb, examId: number): Promise<ExamSubjectRow[]> {
  const result = await db.query<ExamSubjectRow>(
    `SELECT es.subject_id, s.name AS subject_name,
            COALESCE(es.total_marks, es.max_marks) AS total_marks,
            COALESCE(es.passing_marks, es.pass_marks) AS passing_marks
     FROM exam_subjects es
     JOIN subjects s ON es.subject_id = s.id
     WHERE es.exam_id = $1
     ORDER BY s.name`,
    [examId]
  );
  if (result.rows.length > 0) return result.rows;

  const legacy = await db.query<ExamSubjectRow>(
    `SELECT e.subject_id, s.name AS subject_name, e.total_marks, e.passing_marks
     FROM exams e
     LEFT JOIN subjects s ON e.subject_id = s.id
     WHERE e.id = $1 AND e.subject_id IS NOT NULL`,
    [examId]
  );
  return legacy.rows;
}
