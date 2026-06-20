/**
 * Tenant database migrations applied after schema.sql
 * Keep in sync with apps/super-admin/src/lib/platform-school-service.ts
 */

const TENANT_MIGRATION_FILES = [
  'phase1_student_columns.sql',
  'phase2_student_guardians.sql',
  'phase3_student_documents.sql',
  'phase4_student_medical_records.sql',
  'phase5_student_enrollments.sql',
  'phase6_enrollment_history.sql',
  'phase7_sms_communications.sql',
  'phase8_admission_inquiries.sql',
  'phase8_communications_extended.sql',
  'phase9_platform_modules.sql',
  'phase10_classes_is_active.sql',
  'phase11_class_sections.sql',
  'phase12_exams_subject_id.sql',
  'add_academic_years_table.sql',
  'add_system_settings_table.sql',
  'phase13_system_settings.sql',
  'phase14_transfer_certificate_generations.sql',
  'phase15_student_gate_passes.sql',
  'phase16_school_houses.sql',
  'phase17_student_mother_fields.sql',
  'phase18_student_portal_password.sql',
  'phase19_portal_access.sql',
  'add_staff_attendance.sql',
  'phase21_exam_result_engine.sql',
]

const OPTIONAL_SQL_FILES = ['create_inventory_tables.sql']

async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)
}

async function isMigrationApplied(client, filename) {
  const result = await client.query(
    'SELECT 1 FROM schema_migrations WHERE filename = $1 LIMIT 1',
    [filename],
  )
  return result.rows.length > 0
}

async function markMigrationApplied(client, filename) {
  await client.query(
    'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
    [filename],
  )
}

async function applySqlFile(client, filePath, filename, { skipIfApplied = true } = {}) {
  const fs = require('fs')
  if (!fs.existsSync(filePath)) {
    console.log(`  ⏭  Skipped (not found): ${filename}`)
    return false
  }

  if (skipIfApplied && (await isMigrationApplied(client, filename))) {
    console.log(`  ✓ Already applied: ${filename}`)
    return false
  }

  const sql = fs.readFileSync(filePath, 'utf8')
  await client.query(sql)
  await markMigrationApplied(client, filename)
  console.log(`  ✓ Applied: ${filename}`)
  return true
}

module.exports = {
  TENANT_MIGRATION_FILES,
  OPTIONAL_SQL_FILES,
  ensureMigrationTable,
  applySqlFile,
}
