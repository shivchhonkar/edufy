import { formatClassNameRoman } from '@/lib/class-display';

export type DocumentReportStatus = 'submitted' | 'not_submitted' | 'not_required';

export interface StudentDocumentReportRow {
  id: number;
  admission_number: string;
  class_name: string;
  section_name: string;
  student_name: string;
  father_name: string;
  first_adm_class: string;
  tc: DocumentReportStatus;
  bc: DocumentReportStatus;
  student_aadhar: DocumentReportStatus;
  parents_aadhar: DocumentReportStatus;
  student_photo: DocumentReportStatus;
  father_photo: DocumentReportStatus;
  mother_photo: DocumentReportStatus;
}

export interface GuardianSnapshot {
  relation_type: string;
  aadhaar_no?: string | null;
  photo?: string | null;
  name?: string | null;
}

export interface StudentDocumentReportInput {
  id: number;
  admission_number: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  parent_name?: string | null;
  aadhaar_no?: string | null;
  photo_url?: string | null;
  class_name?: string | null;
  section_name?: string | null;
  first_adm_class?: string | null;
  document_types: string[];
  has_tc_generation: boolean;
  guardians: GuardianSnapshot[];
}

const DOCUMENT_COLUMNS = [
  'tc',
  'bc',
  'student_aadhar',
  'parents_aadhar',
  'student_photo',
  'father_photo',
  'mother_photo',
] as const;

export type DocumentReportColumn = (typeof DOCUMENT_COLUMNS)[number];

export const DOCUMENT_REPORT_COLUMN_LABELS: Record<DocumentReportColumn, string> = {
  tc: 'TC',
  bc: 'BC',
  student_aadhar: 'STUDENT AADHAR',
  parents_aadhar: 'PARENTS AADHAR',
  student_photo: 'STUDENT PHOTO',
  father_photo: 'FATHER PHOTO',
  mother_photo: 'MOTHER PHOTO',
};

export function hasText(value: string | null | undefined): boolean {
  return Boolean(String(value || '').trim());
}

export function isFirstAdmissionClass(className: string | null | undefined): boolean {
  if (!className) return false;
  const normalized = className.trim().toLowerCase().replace(/^class\s+/i, '');
  return normalized === '1' || normalized === 'i' || normalized === 'one';
}

function guardianByRelation(
  guardians: GuardianSnapshot[],
  relation: 'father' | 'mother',
): GuardianSnapshot | undefined {
  return guardians.find((g) => g.relation_type === relation);
}

function buildStudentName(student: StudentDocumentReportInput): string {
  return [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ');
}

function resolveFatherName(student: StudentDocumentReportInput): string {
  const father = guardianByRelation(student.guardians, 'father');
  return father?.name?.trim() || student.parent_name?.trim() || '—';
}

function resolveParentsAadharStatus(guardians: GuardianSnapshot[]): DocumentReportStatus {
  const father = guardianByRelation(guardians, 'father');
  const mother = guardianByRelation(guardians, 'mother');

  if (father && mother) {
    return hasText(father.aadhaar_no) && hasText(mother.aadhaar_no)
      ? 'submitted'
      : 'not_submitted';
  }
  if (father) {
    return hasText(father.aadhaar_no) ? 'submitted' : 'not_submitted';
  }
  if (mother) {
    return hasText(mother.aadhaar_no) ? 'submitted' : 'not_submitted';
  }
  return 'not_submitted';
}

export function buildStudentDocumentReportRow(
  student: StudentDocumentReportInput,
): StudentDocumentReportRow {
  const docTypes = new Set(student.document_types);
  const rawFirstAdmClass = student.first_adm_class?.trim() || student.class_name?.trim() || '—';
  const rawClassName = student.class_name?.trim() || '—';
  const father = guardianByRelation(student.guardians, 'father');
  const mother = guardianByRelation(student.guardians, 'mother');

  const tcSubmitted =
    docTypes.has('transfer_certificate') || student.has_tc_generation;
  const tc: DocumentReportStatus = isFirstAdmissionClass(rawFirstAdmClass)
    ? 'not_required'
    : tcSubmitted
      ? 'submitted'
      : 'not_submitted';

  const bc: DocumentReportStatus = docTypes.has('birth_certificate')
    ? 'submitted'
    : 'not_submitted';

  const studentAadhar: DocumentReportStatus =
    hasText(student.aadhaar_no) || docTypes.has('aadhaar_card')
      ? 'submitted'
      : 'not_submitted';

  const studentPhoto: DocumentReportStatus =
    hasText(student.photo_url) || docTypes.has('passport_photo')
      ? 'submitted'
      : 'not_submitted';

  return {
    id: student.id,
    admission_number: student.admission_number,
    class_name: formatClassNameRoman(rawClassName),
    section_name: student.section_name?.trim() || '—',
    student_name: buildStudentName(student),
    father_name: resolveFatherName(student),
    first_adm_class: formatClassNameRoman(rawFirstAdmClass),
    tc,
    bc,
    student_aadhar: studentAadhar,
    parents_aadhar: resolveParentsAadharStatus(student.guardians),
    student_photo: studentPhoto,
    father_photo: hasText(father?.photo) ? 'submitted' : 'not_submitted',
    mother_photo: hasText(mother?.photo) ? 'submitted' : 'not_submitted',
  };
}

export function documentStatusLabel(status: DocumentReportStatus): string {
  switch (status) {
    case 'submitted':
      return 'Submitted';
    case 'not_required':
      return 'Not Required';
    default:
      return 'Not Submitted';
  }
}

export const DOCUMENT_REPORT_STATUS_COLORS = {
  submitted: {
    background: '#ffffff',
    text: '#111827',
  },
  not_submitted: {
    background: '#fecaca',
    text: '#991b1b',
  },
  not_required: {
    background: '#ffff99',
    text: '#854d0e',
  },
} as const;

export function getDocumentStatusStyle(status: DocumentReportStatus): {
  backgroundColor: string;
  color: string;
} {
  const colors = DOCUMENT_REPORT_STATUS_COLORS[status];
  return {
    backgroundColor: colors.background,
    color: colors.text,
  };
}

export function documentStatusCssClass(status: DocumentReportStatus): string {
  return `doc-status doc-status-${status.replace(/_/g, '-')}`;
}

export function documentStatusScreenClass(status: DocumentReportStatus): string {
  return documentStatusCssClass(status);
}

export function documentStatusPrintStyle(status: DocumentReportStatus): string {
  const { backgroundColor, color } = getDocumentStatusStyle(status);
  return `background-color:${backgroundColor} !important;color:${color} !important;`;
}

export const DOCUMENT_REPORT_PRINT_STATUS_CSS = `
  .doc-status {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .doc-status-submitted {
    background-color: #ffffff !important;
    color: #111827 !important;
  }
  .doc-status-not-submitted {
    background-color: #fecaca !important;
    color: #991b1b !important;
  }
  .doc-status-not-required {
    background-color: #ffff99 !important;
    color: #854d0e !important;
  }
`;

export const DOCUMENT_REPORT_TABLE_MIN_WIDTH = 1760;

export function rowHasMissingDocuments(row: StudentDocumentReportRow): boolean {
  return DOCUMENT_COLUMNS.some((column) => row[column] === 'not_submitted');
}

export function countMissingDocuments(row: StudentDocumentReportRow): number {
  return DOCUMENT_COLUMNS.filter((column) => row[column] === 'not_submitted').length;
}
