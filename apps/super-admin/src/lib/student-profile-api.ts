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
