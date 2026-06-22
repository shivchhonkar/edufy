import { existsSync, readFileSync } from 'fs';
import path from 'path';

/** Tenant migrations applied when registering a new school via API */
export const REGISTER_SCHOOL_MIGRATION_FILES = [
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
  'phase20_school_visitors.sql',
  'phase22_admission_inquiry_parent_relation.sql',
] as const;

function getDatabaseRootCandidates(): string[] {
  const cwd = process.cwd();
  const candidates: string[] = [];

  if (process.env.EDUFY_DATABASE_DIR) {
    candidates.push(process.env.EDUFY_DATABASE_DIR);
  }

  candidates.push(
    path.join(cwd, 'database'),
    path.join(cwd, '..', '..', 'database'),
    path.join(cwd, '..', 'database'),
  );

  return [...new Set(candidates.map((p) => path.normalize(p)))];
}

export function resolveDatabaseFile(...segments: string[]): string {
  for (const root of getDatabaseRootCandidates()) {
    const filePath = path.join(root, ...segments);
    if (existsSync(filePath)) {
      return filePath;
    }
  }

  const label = segments.join('/');
  throw new Error(
    `${label} not found. Set EDUFY_DATABASE_DIR or run: npm run db:sync-sql`,
  );
}

export function readDatabaseSql(...segments: string[]): string {
  return readFileSync(resolveDatabaseFile(...segments), 'utf8');
}
