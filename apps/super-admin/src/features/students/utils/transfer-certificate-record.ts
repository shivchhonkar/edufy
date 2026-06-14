import type { Student } from '@/shared/types';
import type {
  TransferCertificateOptions,
  TransferCertificateSchoolInfo,
} from '@/features/students/components/TransferCertificate';
import { studentFullName } from '@/features/students/utils/student-profile';

export interface TransferCertificateStudentSnapshot {
  id: number;
  admission_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  full_name: string;
  date_of_birth?: string | null;
  gender?: string | null;
  class_name?: string | null;
  section_name?: string | null;
  roll_number?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  admission_date?: string | null;
  city?: string | null;
  photo_url?: string | null;
  address?: string | null;
  state?: string | null;
  pincode?: string | null;
}

export interface TransferCertificateLogEntry {
  student_id: number;
  tc_number: string;
  options: TransferCertificateOptions;
  student_snapshot: TransferCertificateStudentSnapshot;
  school_snapshot: TransferCertificateSchoolInfo;
}

function toIsoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

export function buildStudentSnapshot(student: Student): TransferCertificateStudentSnapshot {
  return {
    id: student.id,
    admission_number: student.admission_number,
    first_name: student.first_name,
    middle_name: student.middle_name,
    last_name: student.last_name,
    full_name: studentFullName(student),
    date_of_birth: toIsoDate(student.date_of_birth),
    gender: student.gender,
    class_name: student.class_name,
    section_name: student.section_name,
    roll_number: student.roll_number,
    parent_name: student.parent_name,
    parent_phone: student.parent_phone,
    admission_date: toIsoDate(student.admission_date),
    city: student.city,
    photo_url: student.photo_url,
    address: student.address,
    state: student.state,
    pincode: student.pincode,
  };
}

export function snapshotToStudent(snapshot: TransferCertificateStudentSnapshot): Student {
  const fallbackDate = new Date();
  return {
    id: snapshot.id,
    admission_number: snapshot.admission_number,
    first_name: snapshot.first_name,
    middle_name: snapshot.middle_name,
    last_name: snapshot.last_name,
    date_of_birth: snapshot.date_of_birth ? new Date(snapshot.date_of_birth) : fallbackDate,
    gender: (snapshot.gender as Student['gender']) || 'Other',
    admission_date: snapshot.admission_date ? new Date(snapshot.admission_date) : fallbackDate,
    class_name: snapshot.class_name ?? undefined,
    section_name: snapshot.section_name ?? undefined,
    roll_number: snapshot.roll_number ?? undefined,
    parent_name: snapshot.parent_name ?? undefined,
    parent_phone: snapshot.parent_phone ?? undefined,
    city: snapshot.city ?? undefined,
    photo_url: snapshot.photo_url ?? undefined,
    address: snapshot.address ?? undefined,
    state: snapshot.state ?? undefined,
    pincode: snapshot.pincode ?? undefined,
    status: 'active',
    created_at: fallbackDate,
    updated_at: fallbackDate,
  };
}

export function parseSchoolSnapshot(
  snapshot: Record<string, unknown> | TransferCertificateSchoolInfo
): TransferCertificateSchoolInfo {
  const s = snapshot as TransferCertificateSchoolInfo;
  return {
    name: s.name || 'School',
    address: s.address,
    logoUrl: s.logoUrl,
    academicYear: s.academicYear,
    phone: s.phone,
    email: s.email,
    principalName: s.principalName,
    signatureUrl: s.signatureUrl,
  };
}

export function parseOptionsSnapshot(
  snapshot: Record<string, unknown> | TransferCertificateOptions
): TransferCertificateOptions {
  const o = snapshot as TransferCertificateOptions;
  return {
    tcNumber: o.tcNumber || '',
    issueDate: o.issueDate || '',
    dateOfLeaving: o.dateOfLeaving || '',
    reasonForLeaving: o.reasonForLeaving || '',
    conduct: o.conduct || '',
    qualifiedForPromotion: o.qualifiedForPromotion || 'Yes',
  };
}

export function parseStudentSnapshot(
  snapshot: Record<string, unknown> | TransferCertificateStudentSnapshot
): TransferCertificateStudentSnapshot {
  return snapshot as TransferCertificateStudentSnapshot;
}
