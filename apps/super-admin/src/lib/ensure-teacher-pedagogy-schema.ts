import type { RequestDb } from '@/lib/request-db';

const TEACHER_PEDAGOGY_SQL = `
CREATE TABLE IF NOT EXISTS teacher_daily_activities (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  activity_date DATE NOT NULL,
  topic_covered TEXT,
  periods_taught INTEGER DEFAULT 1,
  homework_given BOOLEAN DEFAULT FALSE,
  remarks TEXT,
  status VARCHAR(20) DEFAULT 'completed',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_teacher_activities_staff ON teacher_daily_activities(staff_id);
CREATE INDEX IF NOT EXISTS idx_teacher_activities_date ON teacher_daily_activities(activity_date);

CREATE TABLE IF NOT EXISTS syllabus_chapters (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  total_periods INTEGER DEFAULT 1,
  academic_year VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_syllabus_chapters_class_subject ON syllabus_chapters(class_id, subject_id);

CREATE TABLE IF NOT EXISTS syllabus_progress (
  id SERIAL PRIMARY KEY,
  chapter_id INTEGER NOT NULL REFERENCES syllabus_chapters(id) ON DELETE CASCADE,
  staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
  academic_year VARCHAR(20),
  periods_completed INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'not_started',
  completed_at TIMESTAMP,
  notes TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_syllabus_progress_chapter ON syllabus_progress(chapter_id);

CREATE TABLE IF NOT EXISTS lesson_plans (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  lesson_date DATE NOT NULL,
  duration_minutes INTEGER DEFAULT 40,
  topic VARCHAR(255),
  objectives TEXT,
  materials TEXT,
  procedure TEXT,
  assessment TEXT,
  homework TEXT,
  status VARCHAR(20) DEFAULT 'scheduled',
  academic_year VARCHAR(20),
  week_number INTEGER,
  period_number INTEGER,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_class ON lesson_plans(class_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_date ON lesson_plans(lesson_date);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_subject ON lesson_plans(subject_id);
`;

export async function ensureTeacherPedagogySchema(db: RequestDb) {
  await db.query(TEACHER_PEDAGOGY_SQL);
}
