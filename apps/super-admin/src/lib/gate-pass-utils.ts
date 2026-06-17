import type { RequestDb } from '@/lib/request-db';
import type { Student } from '@/shared/types';
import { studentFullName } from '@/features/students/utils/student-profile';

export const GATE_PASS_COLLECTOR_RELATIONSHIPS = [
  'father',
  'mother',
  'guardian',
  'relative',
  'other',
] as const;

export type GatePassCollectorRelationship = (typeof GATE_PASS_COLLECTOR_RELATIONSHIPS)[number];

export const GATE_PASS_APPROVER_ROLES = ['super_admin', 'admin'] as const;

export const GATE_PASS_APPROVAL_LABELS: Record<string, string> = {
  parent_otp: 'Parent OTP',
  principal: 'Principal',
  authorized_staff: 'Authorized Staff',
};

export interface GatePassGuardianPhoto {
  name: string;
  relation_type: string;
  photo_url: string;
}

export interface GatePassStudentSnapshot {
  id: number;
  admission_number: string;
  full_name: string;
  class_name?: string | null;
  section_name?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  photo_url?: string | null;
  guardian_photos?: GatePassGuardianPhoto[];
}

export async function fetchGuardianPhotosForStudent(
  db: RequestDb,
  studentId: number
): Promise<GatePassGuardianPhoto[]> {
  const result = await db.query<{
    name: string;
    relation_type: string;
    photo: string | null;
  }>(
    `SELECT name, relation_type, photo
     FROM student_guardians
     WHERE student_id = $1
       AND photo IS NOT NULL
       AND TRIM(photo) <> ''
     ORDER BY
       CASE relation_type WHEN 'father' THEN 1 WHEN 'mother' THEN 2 ELSE 3 END,
       is_primary_contact DESC,
       id ASC`,
    [studentId]
  );

  return result.rows.map((row) => ({
    name: row.name,
    relation_type: row.relation_type,
    photo_url: row.photo!.trim(),
  }));
}

export async function buildGatePassStudentSnapshot(
  db: RequestDb,
  student: Student & { class_name?: string | null; section_name?: string | null }
): Promise<GatePassStudentSnapshot> {
  const guardianPhotos = await fetchGuardianPhotosForStudent(db, student.id);

  return {
    id: student.id,
    admission_number: student.admission_number,
    full_name: studentFullName(student),
    class_name: student.class_name ?? null,
    section_name: student.section_name ?? null,
    parent_name: student.parent_name ?? null,
    parent_phone: student.parent_phone ?? null,
    photo_url: student.photo_url?.trim() || null,
    guardian_photos: guardianPhotos,
  };
}

/** Merge live student/guardian photos into stored snapshot (for older records). */
export async function enrichGatePassStudentSnapshot(
  db: RequestDb,
  studentId: number,
  snapshot: GatePassStudentSnapshot | Record<string, unknown>
): Promise<GatePassStudentSnapshot> {
  const base = snapshot as GatePassStudentSnapshot;
  const needsStudentPhoto = !base.photo_url?.trim();
  const needsGuardians = !base.guardian_photos?.length;

  if (!needsStudentPhoto && !needsGuardians) {
    return base;
  }

  const studentResult = await db.query<{ photo_url: string | null }>(
    'SELECT photo_url FROM students WHERE id = $1',
    [studentId]
  );

  const guardianPhotos = needsGuardians
    ? await fetchGuardianPhotosForStudent(db, studentId)
    : base.guardian_photos || [];

  return {
    ...base,
    photo_url: base.photo_url?.trim() || studentResult.rows[0]?.photo_url?.trim() || null,
    guardian_photos: guardianPhotos,
  };
}

export async function generateGatePassNumber(db: RequestDb): Promise<string> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `GP-${today}-`;
  const result = await db.query<{ pass_number: string }>(
    `SELECT pass_number FROM student_gate_passes
     WHERE pass_number LIKE $1
     ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );

  let seq = 1;
  const last = result.rows[0]?.pass_number;
  if (last) {
    const part = last.split('-').pop();
    const parsed = parseInt(part || '0', 10);
    if (!Number.isNaN(parsed)) seq = parsed + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

export function isValidCollectorRelationship(value: string): value is GatePassCollectorRelationship {
  return (GATE_PASS_COLLECTOR_RELATIONSHIPS as readonly string[]).includes(value);
}
