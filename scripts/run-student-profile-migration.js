const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'edu_crm',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'shiv',
});

const PHASES = [
  'phase1_student_columns.sql',
  'phase2_student_guardians.sql',
  'phase3_student_documents.sql',
  'phase4_student_medical_records.sql',
  'phase5_student_enrollments.sql',
  'phase6_enrollment_history.sql',
  'phase7_sms_communications.sql',
  'phase8_admission_inquiries.sql',
  'phase9_platform_modules.sql',
];

async function runPhase(filename) {
  const filePath = path.join(__dirname, '../database/migrations', filename);
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`\n▶ Running ${filename}...`);
  await pool.query(sql);
  console.log(`✅ ${filename} complete`);
}

async function verify() {
  const tables = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
      'student_guardians', 'student_documents',
      'student_medical_records', 'student_enrollments'
    )
    ORDER BY table_name
  `);

  const columns = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'students'
    AND column_name IN (
      'middle_name', 'student_code', 'aadhaar_no', 'religion',
      'caste', 'category', 'nationality', 'mother_tongue', 'remarks'
    )
    ORDER BY column_name
  `);

  console.log('\n📋 New tables:');
  tables.rows.forEach((r) => console.log(`   - ${r.table_name}`));

  console.log('\n📋 New student columns:');
  columns.rows.forEach((r) => console.log(`   - students.${r.column_name}`));

  const enrollments = await pool.query(
    'SELECT COUNT(*)::int AS count FROM student_enrollments WHERE is_current = true'
  );
  const guardians = await pool.query('SELECT COUNT(*)::int AS count FROM student_guardians');
  console.log(`\n📊 Backfill: ${enrollments.rows[0].count} current enrollments, ${guardians.rows[0].count} guardian rows`);
}

async function main() {
  console.log('🚀 Student profile migration (Phases 1–7)\n');

  try {
    for (const phase of PHASES) {
      await runPhase(phase);
    }
    await verify();
    console.log('\n🎉 All phases applied successfully.\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
