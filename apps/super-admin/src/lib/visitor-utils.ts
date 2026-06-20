import type { RequestDb } from '@/lib/request-db';

export const VISITOR_ID_PROOF_TYPES = [
  'aadhaar',
  'pan',
  'driving_license',
  'voter_id',
  'passport',
  'other',
] as const;

export type VisitorIdProofType = (typeof VISITOR_ID_PROOF_TYPES)[number];

export const VISITOR_ID_PROOF_LABELS: Record<VisitorIdProofType, string> = {
  aadhaar: 'Aadhaar',
  pan: 'PAN',
  driving_license: 'Driving License',
  voter_id: 'Voter ID',
  passport: 'Passport',
  other: 'Other',
};

export interface SchoolVisitor {
  id: number;
  visitor_number: string;
  visitor_name: string;
  phone: string;
  email?: string | null;
  purpose: string;
  person_to_meet: string;
  host_phone?: string | null;
  department?: string | null;
  id_proof_type?: string | null;
  id_proof_number?: string | null;
  vehicle_number?: string | null;
  check_in_at: string;
  check_out_at?: string | null;
  status: 'checked_in' | 'checked_out';
  sms_sent_at?: string | null;
  sms_sent_to?: string | null;
  sms_status?: 'pending' | 'sent' | 'failed' | 'skipped' | null;
  sms_error?: string | null;
  created_by?: number | null;
  created_by_name?: string | null;
  notes?: string | null;
  created_at: string;
}

export async function generateVisitorNumber(db: RequestDb): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `VIS-${year}-`;
  const result = await db.query<{ visitor_number: string }>(
    `SELECT visitor_number FROM school_visitors
     WHERE visitor_number LIKE $1
     ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`],
  );

  let seq = 1;
  const last = result.rows[0]?.visitor_number;
  if (last) {
    const part = last.split('-').pop();
    const parsed = parseInt(part || '0', 10);
    if (!Number.isNaN(parsed)) seq = parsed + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

export function isValidIdProofType(value: string): value is VisitorIdProofType {
  return (VISITOR_ID_PROOF_TYPES as readonly string[]).includes(value);
}

export async function fetchSchoolName(db: RequestDb): Promise<string> {
  try {
    const result = await db.query<{ school_name: string | null }>(
      'SELECT school_name FROM system_settings LIMIT 1',
    );
    return result.rows[0]?.school_name?.trim() || 'School';
  } catch {
    return 'School';
  }
}
