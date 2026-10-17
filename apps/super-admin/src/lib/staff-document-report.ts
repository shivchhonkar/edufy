import {
  documentStatusLabel,
  getDocumentStatusStyle,
  type DocumentReportStatus,
} from '@/lib/student-document-report';

export type StaffDocumentReportStatus = DocumentReportStatus;

export const STAFF_DOCUMENT_COLUMNS = [
  'photo',
  'aadhaar',
  'id_proof',
  'certificate',
  'contract',
  'resume',
] as const;

export type StaffDocumentColumn = (typeof STAFF_DOCUMENT_COLUMNS)[number];

export const STAFF_DOCUMENT_COLUMN_LABELS: Record<StaffDocumentColumn, string> = {
  photo: 'PHOTO',
  aadhaar: 'AADHAAR',
  id_proof: 'ID PROOF',
  certificate: 'CERTIFICATE',
  contract: 'CONTRACT',
  resume: 'RESUME',
};

export interface StaffDocumentReportRow {
  id: number;
  employee_id: string;
  staff_name: string;
  department_name: string;
  designation: string;
  photo: StaffDocumentReportStatus;
  aadhaar: StaffDocumentReportStatus;
  id_proof: StaffDocumentReportStatus;
  certificate: StaffDocumentReportStatus;
  contract: StaffDocumentReportStatus;
  resume: StaffDocumentReportStatus;
}

export interface StaffDocumentReportInput {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  department_name?: string | null;
  designation?: string | null;
  photo_url?: string | null;
  aadhaar_number?: string | null;
  document_types: string[];
}

function submitted(value: boolean): StaffDocumentReportStatus {
  return value ? 'submitted' : 'not_submitted';
}

export function buildStaffDocumentReportRow(staff: StaffDocumentReportInput): StaffDocumentReportRow {
  const docs = new Set(staff.document_types);
  return {
    id: staff.id,
    employee_id: staff.employee_id || '—',
    staff_name: [staff.first_name, staff.last_name].filter(Boolean).join(' '),
    department_name: staff.department_name?.trim() || '—',
    designation: staff.designation?.trim() || '—',
    photo: submitted(Boolean(staff.photo_url?.trim())),
    aadhaar: submitted(Boolean(staff.aadhaar_number?.trim())),
    id_proof: submitted(docs.has('id_proof')),
    certificate: submitted(docs.has('certificate')),
    contract: submitted(docs.has('contract')),
    resume: submitted(docs.has('resume')),
  };
}

export function staffRowHasMissingDocuments(row: StaffDocumentReportRow): boolean {
  return STAFF_DOCUMENT_COLUMNS.some((column) => row[column] === 'not_submitted');
}

export { documentStatusLabel, getDocumentStatusStyle };
