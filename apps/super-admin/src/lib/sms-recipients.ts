import type { RequestDb } from '@/lib/request-db';

export type SmsAudienceType =
  | 'all_parents'
  | 'class_parents'
  | 'section_parents'
  | 'all_staff';

export interface SmsRecipient {
  phone: string;
  name: string;
  student_id?: number;
  student_name?: string;
  source: 'guardian' | 'parent_phone' | 'staff';
}

const AUDIENCE_TYPES: SmsAudienceType[] = [
  'all_parents',
  'class_parents',
  'section_parents',
  'all_staff',
];

export function isValidAudienceType(value: string): value is SmsAudienceType {
  return AUDIENCE_TYPES.includes(value as SmsAudienceType);
}

function addRecipient(
  map: Map<string, SmsRecipient>,
  phone: string | null | undefined,
  recipient: Omit<SmsRecipient, 'phone'>
) {
  if (!phone) return;
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 10) return;
  const key = cleaned.slice(-10);
  if (!map.has(key)) {
    map.set(key, { phone, name: recipient.name, ...recipient });
  }
}

export async function resolveSmsRecipients(
  db: RequestDb,
  audienceType: SmsAudienceType,
  classId?: number | null,
  sectionId?: number | null
): Promise<SmsRecipient[]> {
  const map = new Map<string, SmsRecipient>();

  if (audienceType === 'all_staff') {
    const staffResult = await db.query<{
      phone: string | null;
      first_name: string;
      last_name: string;
    }>(
      `SELECT phone, first_name, last_name FROM staff
       WHERE status = 'active' AND phone IS NOT NULL AND phone <> ''`
    );
    staffResult.rows.forEach((row) => {
      addRecipient(map, row.phone, {
        name: `${row.first_name} ${row.last_name}`.trim(),
        source: 'staff',
      });
    });
    return Array.from(map.values());
  }

  let studentQuery = `
    SELECT s.id, s.first_name, s.last_name, s.parent_phone, s.parent_name
    FROM students s
    WHERE s.status = 'active'`;
  const params: number[] = [];

  if (audienceType === 'class_parents') {
    if (!classId) return [];
    params.push(classId);
    studentQuery += ` AND COALESCE(
      (SELECT e.class_id FROM student_enrollments e
       WHERE e.student_id = s.id AND e.is_current = true LIMIT 1),
      s.class_id
    ) = $1`;
  } else if (audienceType === 'section_parents') {
    if (!classId || !sectionId) return [];
    params.push(classId, sectionId);
    studentQuery += ` AND COALESCE(
      (SELECT e.class_id FROM student_enrollments e
       WHERE e.student_id = s.id AND e.is_current = true LIMIT 1),
      s.class_id
    ) = $1 AND COALESCE(
      (SELECT e.section_id FROM student_enrollments e
       WHERE e.student_id = s.id AND e.is_current = true LIMIT 1),
      s.section_id
    ) = $2`;
  }

  const students = await db.query<{
    id: number;
    first_name: string;
    last_name: string;
    parent_phone: string | null;
    parent_name: string | null;
  }>(studentQuery, params);

  for (const student of students.rows) {
    const studentName = `${student.first_name} ${student.last_name}`.trim();

    try {
      const guardians = await db.query<{
        name: string;
        mobile: string | null;
        alternate_mobile: string | null;
        is_primary_contact: boolean;
      }>(
        `SELECT name, mobile, alternate_mobile, is_primary_contact
         FROM student_guardians
         WHERE student_id = $1
         ORDER BY is_primary_contact DESC`,
        [student.id]
      );

      guardians.rows.forEach((g) => {
        addRecipient(map, g.mobile, {
          name: g.name,
          student_id: student.id,
          student_name: studentName,
          source: 'guardian',
        });
        addRecipient(map, g.alternate_mobile, {
          name: g.name,
          student_id: student.id,
          student_name: studentName,
          source: 'guardian',
        });
      });
    } catch {
      // student_guardians may not exist
    }

    addRecipient(map, student.parent_phone, {
      name: student.parent_name || `Parent of ${studentName}`,
      student_id: student.id,
      student_name: studentName,
      source: 'parent_phone',
    });
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export const SMS_TEMPLATES: Record<
  string,
  { label: string; message: string; sms_type: 'transactional' | 'promotional' }
> = {
  fee_reminder: {
    label: 'Fee Reminder',
    message:
      'Dear Parent, this is a reminder that school fees are pending for {{student_name}}. Please pay at the earliest. - Shribi Edufy',
    sms_type: 'transactional',
  },
  attendance_alert: {
    label: 'Attendance Alert',
    message:
      'Dear Parent, {{student_name}} was marked absent today. Contact the school office for details. - Shribi Edufy',
    sms_type: 'transactional',
  },
  homework_reminder: {
    label: 'Homework Reminder',
    message:
      'Dear Parent, homework is pending for {{student_name}}. Please check the parent portal. - Shribi Edufy',
    sms_type: 'transactional',
  },
  exam_notice: {
    label: 'Exam Notice',
    message:
      'Dear Parent, exam schedule has been updated for {{student_name}}. Check the parent portal for details. - Shribi Edufy',
    sms_type: 'transactional',
  },
  holiday_notice: {
    label: 'Holiday Notice',
    message:
      'Dear Parent, school will remain closed tomorrow. - Shribi Edufy',
    sms_type: 'transactional',
  },
  promotion_notice: {
    label: 'Promotion Notice',
    message:
      'Dear Parent, {{student_name}} has been promoted to the new class. Login to parent portal for details. - Shribi Edufy',
    sms_type: 'transactional',
  },
};

export function applyTemplate(
  template: string,
  recipient: SmsRecipient,
  schoolName = 'Shribi Edufy'
): string {
  return template
    .replace(/\{\{student_name\}\}/g, recipient.student_name || 'your ward')
    .replace(/\{\{parent_name\}\}/g, recipient.name || 'Parent')
    .replace(/\{\{school_name\}\}/g, schoolName);
}
