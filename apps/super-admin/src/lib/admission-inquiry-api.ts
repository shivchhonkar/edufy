import type { RequestDb } from '@/lib/request-db';

export type InquiryStatus =
  | 'new'
  | 'contacted'
  | 'visit_scheduled'
  | 'interested'
  | 'registered'
  | 'enrolled'
  | 'lost'
  | 'on_hold';

export type InquirySource =
  | 'walk_in'
  | 'phone'
  | 'website'
  | 'referral'
  | 'social_media'
  | 'other';

export type InquiryPriority = 'low' | 'normal' | 'high';

export type ActivityType = 'note' | 'call' | 'email' | 'visit' | 'sms' | 'status_change';

export const INQUIRY_STATUSES: InquiryStatus[] = [
  'new',
  'contacted',
  'visit_scheduled',
  'interested',
  'registered',
  'enrolled',
  'lost',
  'on_hold',
];

export const INQUIRY_SOURCES: InquirySource[] = [
  'walk_in',
  'phone',
  'website',
  'referral',
  'social_media',
  'other',
];

export function isValidInquiryStatus(value: string): value is InquiryStatus {
  return INQUIRY_STATUSES.includes(value as InquiryStatus);
}

export function isValidInquirySource(value: string): value is InquirySource {
  return INQUIRY_SOURCES.includes(value as InquirySource);
}

export function generateInquiryNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `INQ${year}${random}`;
}

export async function inquiryExists(db: RequestDb, id: number): Promise<boolean> {
  const result = await db.query<{ id: number }>(
    'SELECT id FROM admission_inquiries WHERE id = $1',
    [id]
  );
  return result.rows.length > 0;
}

/** List/detail query: inquiry class interest + actual enrolled student class */
export const INQUIRY_SELECT = `
  i.*,
  c.name AS interested_class_name,
  s.class_id AS enrolled_class_id,
  ec.name AS enrolled_class_name
`;

export const INQUIRY_FROM_JOIN = `
  FROM admission_inquiries i
  LEFT JOIN classes c ON i.interested_class_id = c.id
  LEFT JOIN students s ON i.converted_student_id = s.id
  LEFT JOIN classes ec ON s.class_id = ec.id
`;

export async function logInquiryActivity(
  db: RequestDb,
  params: {
    inquiryId: number;
    activityType: ActivityType;
    description: string;
    oldStatus?: string | null;
    newStatus?: string | null;
    createdBy?: number | null;
  }
): Promise<void> {
  await db.query(
    `INSERT INTO admission_inquiry_activities (
      inquiry_id, activity_type, description, old_status, new_status, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      params.inquiryId,
      params.activityType,
      params.description,
      params.oldStatus ?? null,
      params.newStatus ?? null,
      params.createdBy ?? null,
    ]
  );
}
