import type { RequestDb } from '@/lib/request-db';
import { JOIN_CURRENT_ENROLLMENT_ON_STUDENT } from '@/lib/enrollment-sql';
import { prepareEnrollmentSchema } from '@/lib/enrollment-service';
import type { Student } from '@/shared/types';

export const INTERACTION_TYPES = [
  'query',
  'call',
  'principal_meet',
  'parent_counselling',
  'student_counselling',
] as const;

export type InteractionType = (typeof INTERACTION_TYPES)[number];

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  query: 'Query',
  call: 'Call',
  principal_meet: 'Principal Meet',
  parent_counselling: 'Parent Counselling',
  student_counselling: 'Student Counselling',
};

export const CERTIFICATE_TYPES = ['dob', 'character', 'study'] as const;
export type IssuedCertificateType = (typeof CERTIFICATE_TYPES)[number];

export const CERTIFICATE_TYPE_LABELS: Record<IssuedCertificateType, string> = {
  dob: 'Date of Birth Certificate',
  character: 'Character Certificate',
  study: 'Study Certificate',
};

export const CERTIFICATE_PREFIX: Record<IssuedCertificateType, string> = {
  dob: 'DOB',
  character: 'CH',
  study: 'ST',
};

export function isInteractionType(value: string): value is InteractionType {
  return INTERACTION_TYPES.includes(value as InteractionType);
}

export function isCertificateType(value: string): value is IssuedCertificateType {
  return CERTIFICATE_TYPES.includes(value as IssuedCertificateType);
}

export function actorName(user: { id: number; email?: string; full_name?: string }): string {
  return user.full_name || user.email || `User #${user.id}`;
}

export function calculateBmi(heightCm?: number | null, weightKg?: number | null): number | null {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
  const meters = heightCm / 100;
  return Number((weightKg / (meters * meters)).toFixed(2));
}

const NUMBER_SOURCES = {
  student_registrations: 'registration_number',
  student_issued_certificates: 'certificate_number',
  student_late_passes: 'pass_number',
} as const;

export async function generatePrefixedNumber(
  db: RequestDb,
  table: keyof typeof NUMBER_SOURCES,
  column: (typeof NUMBER_SOURCES)[keyof typeof NUMBER_SOURCES],
  prefix: string
): Promise<string> {
  if (NUMBER_SOURCES[table] !== column) {
    throw new Error('Invalid number sequence source');
  }
  const year = new Date().getFullYear();
  const like = `${prefix}${year}%`;
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${table} WHERE ${column} LIKE $1`,
    [like]
  );
  const next = parseInt(result.rows[0]?.count || '0', 10) + 1;
  return `${prefix}${year}${String(next).padStart(4, '0')}`;
}

export type StudentWithClass = Student & { class_name?: string | null; section_name?: string | null };

export async function loadStudentWithClass(
  db: RequestDb,
  studentId: number
): Promise<StudentWithClass | null> {
  await prepareEnrollmentSchema(db);
  const result = await db.query<StudentWithClass>(
    `SELECT s.*,
            COALESCE(ce.class_id, s.class_id) AS class_id,
            COALESCE(ce.section_id, s.section_id) AS section_id,
            c.name AS class_name,
            sec.name AS section_name
     FROM students s
     ${JOIN_CURRENT_ENROLLMENT_ON_STUDENT}
     LEFT JOIN classes c ON COALESCE(ce.class_id, s.class_id) = c.id
     LEFT JOIN sections sec ON COALESCE(ce.section_id, s.section_id) = sec.id
     WHERE s.id = $1`,
    [studentId]
  );
  return result.rows[0] ?? null;
}

export function studentSnapshot(student: StudentWithClass) {
  return {
    id: student.id,
    admission_number: student.admission_number,
    first_name: student.first_name,
    last_name: student.last_name,
    full_name: [student.first_name, student.last_name].filter(Boolean).join(' '),
    date_of_birth: student.date_of_birth,
    gender: student.gender,
    class_name: student.class_name ?? null,
    section_name: student.section_name ?? null,
    roll_number: student.roll_number ?? null,
    parent_name: student.parent_name ?? null,
    parent_phone: student.parent_phone ?? null,
    mother_name: student.mother_name ?? null,
    admission_date: student.admission_date ?? null,
    address: student.address ?? null,
    photo_url: student.photo_url ?? null,
  };
}

export function parseOptionalNumber(value: unknown): number | null {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}
