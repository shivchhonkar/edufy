import type { GuardianRelationType, StudentDocumentType } from '@/shared/types';

export const DOCUMENT_TYPE_LABELS: Record<StudentDocumentType, string> = {
  birth_certificate: 'Birth Certificate',
  aadhaar_card: 'Aadhaar Card',
  transfer_certificate: 'Transfer Certificate',
  migration_certificate: 'Migration Certificate',
  marksheet: 'Marksheet',
  income_certificate: 'Income Certificate',
  caste_certificate: 'Caste Certificate',
  passport_photo: 'Passport Photo',
  medical_certificate: 'Medical Certificate',
  report_card: 'Report Card',
};

export const DOCUMENT_TYPE_OPTIONS = Object.entries(DOCUMENT_TYPE_LABELS).map(
  ([value, label]) => ({ value: value as StudentDocumentType, label })
);

export const GUARDIAN_RELATION_LABELS: Record<GuardianRelationType, string> = {
  father: 'Father',
  mother: 'Mother',
  guardian: 'Guardian',
};

export function formatStudentDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const PLACEHOLDER_NAME_VALUES = new Set(['—', '-', 'n/a', 'na', 'none']);

export function isPlaceholderName(value?: string | null): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_NAME_VALUES.has(trimmed.toLowerCase()) || trimmed === '—';
}

export function studentFullName(student: {
  first_name: string;
  middle_name?: string | null;
  last_name?: string | null;
}): string {
  return [student.first_name, student.middle_name, student.last_name]
    .filter((part) => part && !isPlaceholderName(part))
    .join(' ');
}

export function studentInitials(student: {
  first_name: string;
  last_name?: string | null;
}): string {
  const first = student.first_name?.trim().charAt(0) || '';
  const last = !isPlaceholderName(student.last_name)
    ? student.last_name!.trim().charAt(0)
    : '';
  return (first + last).toUpperCase() || '?';
}

/** Primary contact phone: father's number, falling back to mother's. */
export function getStudentContactPhone(student: {
  parent_phone?: string | null;
  mother_phone?: string | null;
}): string {
  const fatherPhone = student.parent_phone?.trim();
  if (fatherPhone) return fatherPhone;
  return student.mother_phone?.trim() || '';
}
