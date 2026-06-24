import type { RequestDb } from '@/lib/request-db';
import { ensureStudentMessagingSchema } from '@/lib/ensure-student-messaging-schema';
import { applyTemplate, type SmsRecipient } from '@/lib/sms-recipients';
import { isTwoFactorSmsReady, sendOpenSms, type SmsType } from '@/lib/two-factor-sms';

export type MessageRecipientTarget = 'all' | 'father' | 'mother' | 'primary';
export type MessageCategory =
  | 'manual'
  | 'fee_reminder'
  | 'attendance_alert'
  | 'homework_reminder'
  | 'exam_result'
  | 'promotional'
  | 'scheduled';

export interface StudentMessagingSettings {
  student_id: number;
  automation_enabled: boolean;
  exclude_fee_reminders: boolean;
  exclude_attendance_alerts: boolean;
  exclude_homework_reminders: boolean;
  exclude_exam_results: boolean;
  exclude_promotional: boolean;
  updated_at?: string;
}

export const DEFAULT_STUDENT_MESSAGING_SETTINGS: Omit<
  StudentMessagingSettings,
  'student_id' | 'updated_at'
> = {
  automation_enabled: true,
  exclude_fee_reminders: false,
  exclude_attendance_alerts: false,
  exclude_homework_reminders: false,
  exclude_exam_results: false,
  exclude_promotional: false,
};

function normalizePhoneKey(phone: string) {
  return phone.replace(/\D/g, '').slice(-10);
}

function relationLabel(relationType: string) {
  if (relationType === 'father') return 'Father';
  if (relationType === 'mother') return 'Mother';
  if (relationType === 'guardian') return 'Guardian';
  return relationType;
}

export async function getStudentMessagingSettings(
  db: RequestDb,
  studentId: number,
): Promise<StudentMessagingSettings> {
  await ensureStudentMessagingSchema(db);
  const result = await db.query<StudentMessagingSettings>(
    `SELECT * FROM student_messaging_settings WHERE student_id = $1`,
    [studentId],
  );
  if (result.rows[0]) return result.rows[0];
  return { student_id: studentId, ...DEFAULT_STUDENT_MESSAGING_SETTINGS };
}

export async function upsertStudentMessagingSettings(
  db: RequestDb,
  studentId: number,
  settings: Partial<Omit<StudentMessagingSettings, 'student_id' | 'updated_at'>>,
): Promise<StudentMessagingSettings> {
  await ensureStudentMessagingSchema(db);
  const current = await getStudentMessagingSettings(db, studentId);
  const merged = { ...current, ...settings, student_id: studentId };

  await db.query(
    `INSERT INTO student_messaging_settings (
      student_id, automation_enabled, exclude_fee_reminders, exclude_attendance_alerts,
      exclude_homework_reminders, exclude_exam_results, exclude_promotional, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    ON CONFLICT (student_id) DO UPDATE SET
      automation_enabled = EXCLUDED.automation_enabled,
      exclude_fee_reminders = EXCLUDED.exclude_fee_reminders,
      exclude_attendance_alerts = EXCLUDED.exclude_attendance_alerts,
      exclude_homework_reminders = EXCLUDED.exclude_homework_reminders,
      exclude_exam_results = EXCLUDED.exclude_exam_results,
      exclude_promotional = EXCLUDED.exclude_promotional,
      updated_at = CURRENT_TIMESTAMP`,
    [
      studentId,
      merged.automation_enabled,
      merged.exclude_fee_reminders,
      merged.exclude_attendance_alerts,
      merged.exclude_homework_reminders,
      merged.exclude_exam_results,
      merged.exclude_promotional,
    ],
  );

  return getStudentMessagingSettings(db, studentId);
}

export async function resolveStudentMessageRecipients(
  db: RequestDb,
  studentId: number,
  target: MessageRecipientTarget = 'all',
): Promise<Array<SmsRecipient & { label: string }>> {
  const studentResult = await db.query<{
    first_name: string;
    last_name: string;
    parent_name: string | null;
    parent_phone: string | null;
    mother_name: string | null;
    mother_phone: string | null;
  }>(
    `SELECT first_name, last_name, parent_name, parent_phone, mother_name, mother_phone
     FROM students WHERE id = $1`,
    [studentId],
  );
  const student = studentResult.rows[0];
  if (!student) return [];

  const studentName = `${student.first_name} ${student.last_name}`.trim();
  const map = new Map<string, SmsRecipient & { label: string }>();

  const add = (
    phone: string | null | undefined,
    name: string,
    label: string,
    source: SmsRecipient['source'],
  ) => {
    if (!phone?.trim()) return;
    const key = normalizePhoneKey(phone);
    if (key.length < 10 || map.has(key)) return;
    map.set(key, {
      phone: phone.trim(),
      name,
      label,
      student_id: studentId,
      student_name: studentName,
      source,
    });
  };

  try {
    const guardians = await db.query<{
      relation_type: string;
      name: string;
      mobile: string | null;
      alternate_mobile: string | null;
      is_primary_contact: boolean;
    }>(
      `SELECT relation_type, name, mobile, alternate_mobile, is_primary_contact
       FROM student_guardians WHERE student_id = $1
       ORDER BY is_primary_contact DESC, id ASC`,
      [studentId],
    );

    for (const g of guardians.rows) {
      const label = relationLabel(g.relation_type);
      if (target === 'all' || target === g.relation_type) {
        add(g.mobile, g.name, label, 'guardian');
        add(g.alternate_mobile, g.name, label, 'guardian');
      }
      if (target === 'primary' && g.is_primary_contact) {
        add(g.mobile, g.name, `${label} (Primary)`, 'guardian');
        add(g.alternate_mobile, g.name, `${label} (Primary)`, 'guardian');
        break;
      }
    }
  } catch {
    // student_guardians may not exist
  }

  if (target === 'all' || target === 'father') {
    add(student.parent_phone, student.parent_name || 'Father', 'Father', 'parent_phone');
  }
  if (target === 'all' || target === 'mother') {
    add(student.mother_phone, student.mother_name || 'Mother', 'Mother', 'parent_phone');
  }

  if (target === 'primary' && map.size === 0) {
    add(student.parent_phone, student.parent_name || 'Parent', 'Primary Contact', 'parent_phone');
  }

  return Array.from(map.values());
}

function messageTypeLabel(category: MessageCategory, smsType: SmsType) {
  if (category === 'manual') return smsType === 'promotional' ? 'Manual Promotion' : 'Manual';
  if (category === 'scheduled') return 'Scheduled';
  if (category === 'fee_reminder') return 'Automated Fee';
  if (category === 'attendance_alert') return 'Automated Attendance';
  if (category === 'homework_reminder') return 'Automated Homework';
  if (category === 'exam_result') return 'Automated Exam';
  if (category === 'promotional') return 'Automated Promotion';
  return 'SMS';
}

export async function sendStudentMessages({
  db,
  studentId,
  title,
  message,
  smsType = 'transactional',
  recipientTarget = 'all',
  messageCategory = 'manual',
  schoolName = 'Shribi Edufy',
}: {
  db: RequestDb;
  studentId: number;
  title: string;
  message: string;
  smsType?: SmsType;
  recipientTarget?: MessageRecipientTarget;
  messageCategory?: MessageCategory;
  schoolName?: string;
}) {
  await ensureStudentMessagingSchema(db);

  if (!isTwoFactorSmsReady()) {
    throw new Error(
      'SMS is not configured. Set OTP_API_KEY and SMS_SENDER_ID in apps/super-admin/.env.local',
    );
  }

  const recipients = await resolveStudentMessageRecipients(db, studentId, recipientTarget);
  if (recipients.length === 0) {
    throw new Error('No parent or guardian phone numbers found for this student.');
  }

  const campaignResult = await db.query<{ id: number }>(
    `INSERT INTO sms_campaigns (
      title, message, sms_type, audience_type, student_id, message_category,
      total_recipients, status
    ) VALUES ($1, $2, $3, 'student_parents', $4, $5, $6, 'sending')
    RETURNING id`,
    [
      title.trim(),
      message.trim(),
      smsType,
      studentId,
      messageCategory,
      recipients.length,
    ],
  );

  const campaignId = campaignResult.rows[0].id;
  let sentCount = 0;
  let failedCount = 0;
  const typeLabel = messageTypeLabel(messageCategory, smsType);

  for (const recipient of recipients) {
    const finalMessage = applyTemplate(message.trim(), recipient, schoolName);
    const result = await sendOpenSms({
      to: recipient.phone,
      message: finalMessage,
      smsType,
    });

    if (result.success) sentCount += 1;
    else failedCount += 1;

    await db.query(
      `INSERT INTO sms_message_logs (
        campaign_id, recipient_phone, recipient_name, student_id,
        message, status, provider_response, error_message, sent_at,
        message_type, recipient_label, delivery_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        campaignId,
        result.phone,
        recipient.name,
        studentId,
        finalMessage,
        result.success ? 'sent' : 'failed',
        JSON.stringify(result.response),
        result.error,
        result.success ? new Date() : null,
        typeLabel,
        recipient.label,
        result.success ? 'delivered' : 'failed',
      ],
    );

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  await db.query(
    `UPDATE sms_campaigns
     SET sent_count = $2, failed_count = $3,
         status = $4, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [
      campaignId,
      sentCount,
      failedCount,
      failedCount === recipients.length ? 'failed' : 'completed',
    ],
  );

  return { campaignId, total: recipients.length, sent: sentCount, failed: failedCount };
}

export async function processDueScheduledMessages(db: RequestDb, studentId?: number) {
  await ensureStudentMessagingSchema(db);

  const params: number[] = [];
  let query = `
    SELECT id, student_id, title, message, sms_type, recipient_target
    FROM student_scheduled_messages
    WHERE status = 'pending' AND scheduled_at <= CURRENT_TIMESTAMP`;
  if (studentId) {
    params.push(studentId);
    query += ` AND student_id = $1`;
  }
  query += ' ORDER BY scheduled_at ASC LIMIT 20';

  const due = await db.query<{
    id: number;
    student_id: number;
    title: string;
    message: string;
    sms_type: SmsType;
    recipient_target: MessageRecipientTarget;
  }>(query, params);

  for (const row of due.rows) {
    try {
      const result = await sendStudentMessages({
        db,
        studentId: row.student_id,
        title: row.title,
        message: row.message,
        smsType: row.sms_type,
        recipientTarget: row.recipient_target,
        messageCategory: 'scheduled',
      });
      await db.query(
        `UPDATE student_scheduled_messages
         SET status = 'sent', campaign_id = $2, sent_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [row.id, result.campaignId],
      );
    } catch (error) {
      await db.query(
        `UPDATE student_scheduled_messages
         SET status = 'failed',
             error_message = $2
         WHERE id = $1`,
        [row.id, error instanceof Error ? error.message : 'Send failed'],
      );
    }
  }
}
