import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import {
  applyTemplate,
  isValidAudienceType,
  resolveSmsRecipients,
  SMS_TEMPLATES,
  type SmsAudienceType,
} from '@/lib/sms-recipients';
import { isTwoFactorSmsReady, sendOpenSms, type SmsType } from '@/lib/two-factor-sms';
import type { SmsRecipient } from '@/lib/sms-recipients';

interface SendSmsBody {
  title: string;
  message: string;
  sms_type?: SmsType;
  audience_type: SmsAudienceType;
  class_id?: number | null;
  section_id?: number | null;
  template_key?: string;
  personalize?: boolean;
  dry_run?: boolean;
  selected_recipients?: SmsRecipient[];
}

export async function POST(request: NextRequest) {
  try {
    if (!isTwoFactorSmsReady()) {
      return NextResponse.json(
        {
          success: false,
          error:
            'SMS is not configured. Set OTP_API_KEY and SMS_SENDER_ID in apps/super-admin/.env.local',
        },
        { status: 503 }
      );
    }

    const { db } = await getRequestDb(request);
    const body = (await request.json()) as SendSmsBody;

    const {
      title,
      message,
      sms_type = 'transactional',
      audience_type,
      class_id = null,
      section_id = null,
      template_key,
      personalize = true,
      dry_run = false,
      selected_recipients,
    } = body;

    if (!title?.trim() || (!message?.trim() && !template_key)) {
      return NextResponse.json(
        { success: false, error: 'Title and message (or template_key) are required' },
        { status: 400 }
      );
    }

    if (!isValidAudienceType(audience_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid audience_type' },
        { status: 400 }
      );
    }

    const template = template_key ? SMS_TEMPLATES[template_key] : null;
    const baseMessage = message?.trim() || template?.message || '';
    const resolvedSmsType = sms_type || template?.sms_type || 'transactional';

    let recipients: SmsRecipient[];

    if (selected_recipients && selected_recipients.length > 0) {
      recipients = selected_recipients.filter((r) => r.phone?.trim());
    } else {
      recipients = await resolveSmsRecipients(db, audience_type, class_id, section_id);
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No recipients selected for this campaign' },
        { status: 400 }
      );
    }

    if (dry_run) {
      return NextResponse.json({
        success: true,
        data: {
          dry_run: true,
          recipient_count: recipients.length,
          sample: recipients.slice(0, 5),
        },
      });
    }

    const campaignResult = await db.query<{ id: number }>(
      `INSERT INTO sms_campaigns (
        title, message, sms_type, audience_type, class_id, section_id,
        total_recipients, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'sending')
      RETURNING id`,
      [
        title.trim(),
        baseMessage,
        resolvedSmsType,
        audience_type,
        class_id,
        section_id,
        recipients.length,
      ]
    );

    const campaignId = campaignResult.rows[0].id;
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      const finalMessage = personalize
        ? applyTemplate(baseMessage, recipient)
        : baseMessage;

      const result = await sendOpenSms({
        to: recipient.phone,
        message: finalMessage,
        smsType: resolvedSmsType,
      });

      if (result.success) sentCount += 1;
      else failedCount += 1;

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

      // Small delay to avoid provider rate limits
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
      ]
    );

    return NextResponse.json({
      success: sentCount > 0,
      data: {
        campaign_id: campaignId,
        total: recipients.length,
        sent: sentCount,
        failed: failedCount,
      },
      message:
        failedCount === 0
          ? `SMS sent to ${sentCount} recipient(s)`
          : `Sent ${sentCount}, failed ${failedCount}`,
    });
  } catch (error) {
    console.error('Error sending SMS campaign:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send SMS campaign' },
      { status: 500 }
    );
  }
}
