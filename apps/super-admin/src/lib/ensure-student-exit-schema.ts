import type { RequestDb } from '@/lib/request-db';

export async function ensureStudentExitSchema(db: RequestDb): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS student_exits (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      exit_reason_code VARCHAR(20) NOT NULL,
      exit_reason_label VARCHAR(120) NOT NULL,
      exit_date DATE NOT NULL,
      remarks TEXT,
      status VARCHAR(30) NOT NULL DEFAULT 'EXIT_INITIATED' CHECK (
        status IN (
          'EXIT_INITIATED',
          'CLEARANCE_PENDING',
          'PRINCIPAL_PENDING',
          'CERTIFICATES_PENDING',
          'EXITED',
          'CANCELLED'
        )
      ),
      validation_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
      clearance JSONB NOT NULL DEFAULT '{}'::jsonb,
      certificates JSONB NOT NULL DEFAULT '{}'::jsonb,
      student_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
      initiated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      initiated_by_name VARCHAR(200),
      initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      validated_at TIMESTAMP,
      clearance_completed_at TIMESTAMP,
      principal_approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      principal_approved_by_name VARCHAR(200),
      principal_approved_at TIMESTAMP,
      completed_at TIMESTAMP,
      cancelled_at TIMESTAMP,
      cancel_reason TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_student_exits_student
      ON student_exits (student_id, initiated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_student_exits_status
      ON student_exits (status, initiated_at DESC);
  `);
}
