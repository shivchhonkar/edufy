import type { RequestDb } from '@/lib/request-db';

const TEACHER_MESSAGES_SQL = `
CREATE TABLE IF NOT EXISTS parent_message_threads (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, teacher_staff_id, subject)
);
CREATE INDEX IF NOT EXISTS idx_parent_message_threads_teacher ON parent_message_threads(teacher_staff_id);
CREATE INDEX IF NOT EXISTS idx_parent_message_threads_student ON parent_message_threads(student_id);
CREATE INDEX IF NOT EXISTS idx_parent_message_threads_last ON parent_message_threads(last_message_at DESC);

CREATE TABLE IF NOT EXISTS parent_message_posts (
  id SERIAL PRIMARY KEY,
  thread_id INTEGER NOT NULL REFERENCES parent_message_threads(id) ON DELETE CASCADE,
  sender_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('teacher', 'parent')),
  body TEXT NOT NULL,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_parent_message_posts_thread ON parent_message_posts(thread_id, created_at);
`;

export async function ensureTeacherMessagesSchema(db: RequestDb) {
  await db.query(TEACHER_MESSAGES_SQL);
}
