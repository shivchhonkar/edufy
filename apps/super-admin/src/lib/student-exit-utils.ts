export const EXIT_REASONS = [
  { code: 'TRANSFER', label: 'Transferred to another school' },
  { code: 'TC', label: 'Transfer Certificate Issued' },
  { code: 'COMPLETED', label: 'Passed Final Class' },
  { code: 'DROPOUT', label: 'Dropped Out' },
  { code: 'MIGRATION', label: 'Family Relocated' },
  { code: 'EXPELLED', label: 'Disciplinary Action' },
  { code: 'DECEASED', label: 'Deceased' },
  { code: 'OTHER', label: 'Other' },
] as const;

export type ExitReasonCode = (typeof EXIT_REASONS)[number]['code'];

export const EXIT_STATUSES = [
  'EXIT_INITIATED',
  'CLEARANCE_PENDING',
  'PRINCIPAL_PENDING',
  'CERTIFICATES_PENDING',
  'EXITED',
  'CANCELLED',
] as const;

export type ExitStatus = (typeof EXIT_STATUSES)[number];

export const CLEARANCE_DEPARTMENTS = [
  { key: 'fees', label: 'Fees' },
  { key: 'library', label: 'Library' },
  { key: 'transport', label: 'Transport' },
  { key: 'hostel', label: 'Hostel' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'examination', label: 'Examination' },
  { key: 'accounts', label: 'Accounts' },
] as const;

export type ClearanceDepartmentKey = (typeof CLEARANCE_DEPARTMENTS)[number]['key'];

export type ValidationItemStatus = 'cleared' | 'pending' | 'not_applicable';

export interface ExitValidationItem {
  department: ClearanceDepartmentKey;
  label: string;
  status: ValidationItemStatus;
  summary: string;
  amount_due?: number;
  pending_count?: number;
}

export interface ExitValidationSnapshot {
  items: ExitValidationItem[];
  validated_at: string;
  has_blockers: boolean;
}

export type ClearanceItemStatus = 'pending' | 'approved' | 'not_applicable';

export interface ExitClearanceItem {
  status: ClearanceItemStatus;
  approved_by?: number;
  approved_by_name?: string;
  approved_at?: string;
  notes?: string;
}

export type ExitClearanceMap = Partial<Record<ClearanceDepartmentKey, ExitClearanceItem>>;

export interface ExitCertificates {
  transfer_certificate?: boolean;
  character_certificate?: boolean;
  bonafide?: boolean;
  tc_generation_id?: number | null;
  generated_at?: string | null;
}

export interface StudentExitRecord {
  id: number;
  student_id: number;
  exit_reason_code: ExitReasonCode;
  exit_reason_label: string;
  exit_date: string;
  remarks?: string | null;
  status: ExitStatus;
  validation_snapshot: ExitValidationSnapshot;
  clearance: ExitClearanceMap;
  certificates: ExitCertificates;
  student_snapshot: Record<string, unknown>;
  initiated_by?: number | null;
  initiated_by_name?: string | null;
  initiated_at: string;
  validated_at?: string | null;
  clearance_completed_at?: string | null;
  principal_approved_by?: number | null;
  principal_approved_by_name?: string | null;
  principal_approved_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
}

export const EXIT_STATUS_LABELS: Record<ExitStatus, string> = {
  EXIT_INITIATED: 'Exit Initiated',
  CLEARANCE_PENDING: 'Clearance Pending',
  PRINCIPAL_PENDING: 'Principal Approval',
  CERTIFICATES_PENDING: 'Generate Certificates',
  EXITED: 'Exited',
  CANCELLED: 'Cancelled',
};

export const PRINCIPAL_APPROVER_ROLES = ['super_admin', 'admin'] as const;

export function isValidExitReasonCode(code: string): code is ExitReasonCode {
  return EXIT_REASONS.some((reason) => reason.code === code);
}

export function getExitReasonLabel(code: string): string {
  return EXIT_REASONS.find((reason) => reason.code === code)?.label || code;
}

export function mapExitReasonToStudentStatus(code: ExitReasonCode): 'transferred' | 'graduated' | 'inactive' {
  switch (code) {
    case 'TRANSFER':
    case 'TC':
    case 'MIGRATION':
      return 'transferred';
    case 'COMPLETED':
      return 'graduated';
    default:
      return 'inactive';
  }
}

export function mapExitReasonToEnrollmentStatus(code: ExitReasonCode): 'transferred' | 'left' {
  switch (code) {
    case 'TRANSFER':
    case 'TC':
    case 'MIGRATION':
      return 'transferred';
    default:
      return 'left';
  }
}

export function buildInitialClearance(validation: ExitValidationSnapshot): ExitClearanceMap {
  const clearance: ExitClearanceMap = {};
  for (const dept of CLEARANCE_DEPARTMENTS) {
    const validationItem = validation.items.find((item) => item.department === dept.key);
    clearance[dept.key] = {
      status:
        validationItem?.status === 'not_applicable'
          ? 'not_applicable'
          : validationItem?.status === 'cleared'
            ? 'approved'
            : 'pending',
    };
  }
  return clearance;
}

export function allClearancesApproved(clearance: ExitClearanceMap): boolean {
  return CLEARANCE_DEPARTMENTS.every((dept) => {
    const item = clearance[dept.key];
    return item?.status === 'approved' || item?.status === 'not_applicable';
  });
}

export function isActiveExitStatus(status: ExitStatus): boolean {
  return status !== 'EXITED' && status !== 'CANCELLED';
}
