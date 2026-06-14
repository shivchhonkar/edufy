import type { RequestDb } from '@/lib/request-db';
import {
  applyTemplate,
  resolveSmsRecipients,
  type SmsAudienceType,
} from '@/lib/sms-recipients';
import { isTwoFactorSmsReady, sendOpenSms } from '@/lib/two-factor-sms';

export async function sendAudienceSms(
  db: RequestDb,
  options: {
    title: string;
    message: string;
    audience_type: SmsAudienceType;
    class_id?: number | null;
    section_id?: number | null;
  }
): Promise<{ sent: number; failed: number; skipped: boolean }> {
  if (!isTwoFactorSmsReady()) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const recipients = await resolveSmsRecipients(
    db,
    options.audience_type,
    options.class_id,
    options.section_id
  );

  if (recipients.length === 0) {
    return { sent: 0, failed: 0, skipped: false };
  }

  const campaignResult = await db.query<{ id: number }>(
    `INSERT INTO sms_campaigns (
      title, message, sms_type, audience_type, class_id, section_id,
      total_recipients, status
    ) VALUES ($1, $2, 'transactional', $3, $4, $5, $6, 'sending')
    RETURNING id`,
    [
      options.title,
      options.message,
      options.audience_type,
      options.class_id ?? null,
      options.section_id ?? null,
      recipients.length,
    ]
  );

  const campaignId = campaignResult.rows[0].id;
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const finalMessage = applyTemplate(options.message, recipient);
    const result = await sendOpenSms({
      to: recipient.phone,
      message: finalMessage,
      smsType: 'transactional',
    });

    if (result.success) sent += 1;
    else failed += 1;

    await db.query(
      `INSERT INTO sms_message_logs (
        campaign_id, recipient_phone, recipient_name, student_id,
        message, status, provider_response, error_message, sent_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        campaignId,
        result.phone,
        recipient.name,
        recipient.student_id || null,
        finalMessage,
        result.success ? 'sent' : 'failed',
        JSON.stringify(result.response),
        result.error,
        result.success ? new Date() : null,
      ]
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
      sent,
      failed,
      failed === recipients.length ? 'failed' : 'completed',
    ]
  );

  return { sent, failed, skipped: false };
}
