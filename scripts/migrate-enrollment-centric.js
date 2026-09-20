/**
 * Enrollment-centric migration runner (all phases).
 * Usage: node scripts/migrate-enrollment-centric.js [--db-name=tenant_db]
 */
const { Pool } = require('pg');
const path = require('path');

async function main() {
  const dbNameArg = process.argv.find((a) => a.startsWith('--db-name='));
  const database = dbNameArg ? dbNameArg.split('=')[1] : process.env.DB_NAME || 'edulakhya';

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  const client = await pool.connect();
  try {
    console.log(`Running enrollment migration on database: ${database}`);

    await client.query(`
      ALTER TABLE student_enrollments ADD COLUMN IF NOT EXISTS academic_year_id INTEGER;
      CREATE INDEX IF NOT EXISTS idx_student_enrollments_academic_year_id ON student_enrollments(academic_year_id);

      ALTER TABLE attendance ADD COLUMN IF NOT EXISTS enrollment_id INTEGER REFERENCES student_enrollments(id) ON DELETE SET NULL;
      ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS enrollment_id INTEGER REFERENCES student_enrollments(id) ON DELETE SET NULL;
      ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS enrollment_id INTEGER REFERENCES student_enrollments(id) ON DELETE SET NULL;
      ALTER TABLE student_transport ADD COLUMN IF NOT EXISTS enrollment_id INTEGER REFERENCES student_enrollments(id) ON DELETE SET NULL;
      ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS enrollment_id INTEGER REFERENCES student_enrollments(id) ON DELETE SET NULL;
      ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS enrollment_id INTEGER REFERENCES student_enrollments(id) ON DELETE SET NULL;
    `);

    await client.query(`
      UPDATE student_enrollments e
      SET academic_year_id = ay.id
      FROM academic_years ay
      WHERE e.academic_year_id IS NULL
        AND LOWER(TRIM(e.academic_year)) = LOWER(TRIM(ay.name));
    `);

    await client.query(`
      UPDATE student_fees sf
      SET enrollment_id = (
        SELECT e.id FROM student_enrollments e
        WHERE e.student_id = sf.student_id AND e.academic_year = sf.academic_year
        ORDER BY e.is_current DESC, e.id DESC LIMIT 1
      )
      WHERE sf.enrollment_id IS NULL;
    `);

    await client.query(`
      UPDATE attendance a
      SET enrollment_id = (
        SELECT e.id FROM student_enrollments e
        LEFT JOIN academic_years ay ON ay.id = e.academic_year_id
        WHERE e.student_id = a.student_id
        ORDER BY e.is_current DESC, e.id DESC LIMIT 1
      )
      WHERE a.enrollment_id IS NULL;
    `);

    console.log('Enrollment migration completed.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
