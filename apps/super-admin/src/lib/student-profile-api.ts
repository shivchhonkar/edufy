import type { RequestDb } from '@/lib/request-db';
import type {
  GuardianRelationType,
  StudentDocumentType,
} from '@/shared/types';

export const GUARDIAN_RELATIONS: GuardianRelationType[] = ['father', 'mother', 'guardian'];

export const STUDENT_DOCUMENT_TYPES: StudentDocumentType[] = [
  'birth_certificate',
  'aadhaar_card',
  'transfer_certificate',
  'migration_certificate',
  'marksheet',
  'income_certificate',
  'caste_certificate',
  'passport_photo',
  'medical_certificate',
  'report_card',
];

export function parseStudentId(id: string): number | null {
  const parsed = parseInt(id, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function studentExists(db: RequestDb, studentId: number): Promise<boolean> {
  const result = await db.query<{ id: number }>(
    'SELECT id FROM students WHERE id = $1',
    [studentId]
  );
  return result.rows.length > 0;
}

export function isValidGuardianRelation(value: string): value is GuardianRelationType {
  return GUARDIAN_RELATIONS.includes(value as GuardianRelationType);
}

export function isValidDocumentType(value: string): value is StudentDocumentType {
  return STUDENT_DOCUMENT_TYPES.includes(value as StudentDocumentType);
}

export async function clearPrimaryGuardian(db: RequestDb, studentId: number): Promise<void> {
  await db.query(
    'UPDATE student_guardians SET is_primary_contact = false, updated_at = CURRENT_TIMESTAMP WHERE student_id = $1',
    [studentId]
  );
}

export async function ensureStudentMotherColumns(db: RequestDb): Promise<void> {
  await db.query(`
    ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_name VARCHAR(255);
    ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_phone VARCHAR(20);
    ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_email VARCHAR(255);
  `);
}

async function upsertDefaultGuardianRow(
  db: RequestDb,
  studentId: number,
  relationType: GuardianRelationType,
  name: string | null | undefined,
  mobile: string | null | undefined,
  email: string | null | undefined,
  isPrimary: boolean,
): Promise<void> {
  const displayName = name?.trim() || '—';
  const existing = await db.query<{ id: number; name: string }>(
    `SELECT id, name FROM student_guardians
     WHERE student_id = $1 AND relation_type = $2
     LIMIT 1`,
    [studentId, relationType]
  );

  if (existing.rows.length === 0) {
    await db.query(
      `INSERT INTO student_guardians (
        student_id, relation_type, name, mobile, email, is_primary_contact
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        studentId,
        relationType,
        displayName,
        mobile?.trim() || null,
        email?.trim() || null,
        isPrimary,
      ]
    );
    return;
  }

  const row = existing.rows[0];
  const shouldSyncFromProfile = !row.name?.trim() || row.name.trim() === '—';

  if (shouldSyncFromProfile && displayName !== '—') {
    await db.query(
      `UPDATE student_guardians
       SET name = $1,
           mobile = COALESCE($2, mobile),
           email = COALESCE($3, email),
           is_primary_contact = CASE WHEN $4 THEN true ELSE is_primary_contact END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [displayName, mobile?.trim() || null, email?.trim() || null, isPrimary, row.id]
    );
  }
}

export async function ensureDefaultStudentGuardians(
  db: RequestDb,
  studentId: number,
): Promise<void> {
  await ensureStudentMotherColumns(db);

  const studentRes = await db.query<{
    parent_name: string | null;
    parent_phone: string | null;
    parent_email: string | null;
    mother_name: string | null;
    mother_phone: string | null;
    mother_email: string | null;
  }>(
    `SELECT parent_name, parent_phone, parent_email, mother_name, mother_phone, mother_email
     FROM students WHERE id = $1`,
    [studentId]
  );

  if (!studentRes.rows[0]) return;
  const student = studentRes.rows[0];

  await upsertDefaultGuardianRow(
    db,
    studentId,
    'father',
    student.parent_name,
    student.parent_phone,
    student.parent_email,
    true,
  );
  await upsertDefaultGuardianRow(
    db,
    studentId,
    'mother',
    student.mother_name,
    student.mother_phone,
    student.mother_email,
    false,
  );
}

/** Sync blood group from student personal info into the medical record. */
export async function syncStudentMedicalBloodGroup(
  db: RequestDb,
  studentId: number,
  bloodGroup: string | null | undefined,
): Promise<void> {
  if (bloodGroup === undefined) return;

  const normalized = bloodGroup?.trim() || null;

  await db.query(
    `INSERT INTO student_medical_records (student_id, blood_group)
     VALUES ($1, $2)
     ON CONFLICT (student_id) DO UPDATE SET
       blood_group = EXCLUDED.blood_group,
       updated_at = CURRENT_TIMESTAMP`,
    [studentId, normalized],
  );
}

/** Keep current enrollment aligned when class/section is edited on the student record. */
export async function syncCurrentEnrollmentFromStudent(
  db: RequestDb,
  studentId: number,
  classId: number | null | undefined,
  sectionId: number | null | undefined,
  rollNumber: string | null | undefined,
): Promise<void> {
  if (classId === undefined && sectionId === undefined && rollNumber === undefined) {
    return;
  }

  const current = await db.query<{ id: number }>(
    `SELECT id FROM student_enrollments
     WHERE student_id = $1 AND is_current = true
     ORDER BY id DESC
     LIMIT 1`,
    [studentId],
  );

  if (current.rows.length === 0) return;

  await db.query(
    `UPDATE student_enrollments
     SET class_id = COALESCE($2, class_id),
         section_id = COALESCE($3, section_id),
         roll_number = COALESCE($4, roll_number),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [current.rows[0].id, classId ?? null, sectionId ?? null, rollNumber ?? null],
  );
}
