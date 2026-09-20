import type { RequestDb } from '@/lib/request-db';
import { ensureExamResultEngineSchema } from '@/lib/ensure-exam-result-engine';

export async function ensureExamOperationsSchema(db: RequestDb) {
  await ensureExamResultEngineSchema(db);

  await db.query(`
    CREATE TABLE IF NOT EXISTS exam_schedule (
      id SERIAL PRIMARY KEY,
      exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      exam_date DATE,
      start_time VARCHAR(20),
      end_time VARCHAR(20),
      syllabus TEXT,
      max_marks INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (exam_id, subject_id)
    );

    CREATE TABLE IF NOT EXISTS exam_activity_masters (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      category VARCHAR(80) NOT NULL DEFAULT 'co-scholastic',
      description TEXT,
      grade_type VARCHAR(20) NOT NULL DEFAULT 'letter',
      is_active BOOLEAN NOT NULL DEFAULT true,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS exam_activity_selections (
      id SERIAL PRIMARY KEY,
      activity_id INTEGER NOT NULL REFERENCES exam_activity_masters(id) ON DELETE CASCADE,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
      academic_year VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (activity_id, class_id, exam_id)
    );

    CREATE TABLE IF NOT EXISTS exam_activity_grades (
      id SERIAL PRIMARY KEY,
      activity_id INTEGER NOT NULL REFERENCES exam_activity_masters(id) ON DELETE CASCADE,
      exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
      grade VARCHAR(20) NOT NULL,
      remarks TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (activity_id, exam_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS exam_online_marks (
      id SERIAL PRIMARY KEY,
      exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
      marks_obtained DECIMAL(6, 2) NOT NULL DEFAULT 0,
      is_absent BOOLEAN DEFAULT false,
      source VARCHAR(40) DEFAULT 'online',
      status VARCHAR(20) DEFAULT 'pending',
      remarks TEXT,
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      imported_at TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_exam_schedule_exam ON exam_schedule(exam_id);
    CREATE INDEX IF NOT EXISTS idx_exam_activity_selections_class ON exam_activity_selections(class_id, exam_id);
    CREATE INDEX IF NOT EXISTS idx_exam_activity_grades_exam ON exam_activity_grades(exam_id, student_id);
    ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS enrollment_id INTEGER;

    CREATE INDEX IF NOT EXISTS idx_exam_online_marks_status ON exam_online_marks(status, exam_id);
  `);

  await db.query(`
    INSERT INTO exam_activity_masters (name, category, description, sort_order)
    SELECT v.name, v.category, v.description, v.sort_order
    FROM (VALUES
      ('Discipline', 'co-scholastic', 'Conduct, regularity, and behaviour', 1),
      ('Work Education', 'co-scholastic', 'Work education and life skills', 2),
      ('Art Education', 'co-scholastic', 'Art, music, and creative expression', 3),
      ('Health & Physical Education', 'health', 'Games, yoga, and physical fitness', 4),
      ('Attendance', 'co-scholastic', 'Regularity and punctuality', 5)
    ) AS v(name, category, description, sort_order)
    WHERE NOT EXISTS (SELECT 1 FROM exam_activity_masters LIMIT 1);
  `);
}
