type Db = { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> };

export async function ensureClassSubjectsSchema(db: Db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS class_subjects (
      id SERIAL PRIMARY KEY,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (class_id, subject_id)
    );

    CREATE INDEX IF NOT EXISTS idx_class_subjects_class ON class_subjects(class_id);
    CREATE INDEX IF NOT EXISTS idx_class_subjects_subject ON class_subjects(subject_id);
  `);
}
