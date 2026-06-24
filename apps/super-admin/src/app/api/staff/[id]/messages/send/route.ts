import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureStudentMessagingSchema } from '@/lib/ensure-student-messaging-schema';
import { getStaffPhoneKey, parseStaffId, staffExists } from '@/lib/staff-profile-api';
import { isTwoFactorSmsReady, sendOpenSms, type SmsType } from '@/lib/two-factor-sms';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    if (!isTwoFactorSmsReady()) {
      return NextResponse.json(
        {
          success: false,
          error:
            'SMS is not configured. Set OTP_API_KEY and SMS_SENDER_ID in apps/super-admin/.env.local',
        },
        { status: 503 },
      );
    }

    const { db } = await getRequestDb(request);
    const staffId = parseStaffId(params.id);
    if (!staffId) {
      return NextResponse.json({ success: false, error: 'Invalid staff id' }, { status: 400 });
    }
    if (!(await staffExists(db, staffId))) {
      return NextResponse.json({ success: false, error: 'Staff not found' }, { status: 404 });
    }

    const staffContact = await getStaffPhoneKey(db, staffId);
    if (!staffContact?.phone) {
      return NextResponse.json(
        { success: false, error: 'No phone number on file for this staff member.' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const title = String(body.title || '').trim();
    const message = String(body.message || '').trim();
    const smsType = (body.sms_type || 'transactional') as SmsType;

    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: 'Title and message are required' },
        { status: 400 },
      );
    }

    await ensureStudentMessagingSchema(db);

    const settingsRow = await db.query<{ school_name: string | null }>(
      'SELECT school_name FROM system_settings ORDER BY id DESC LIMIT 1',
    );
    const schoolName = settingsRow.rows[0]?.school_name || 'School';

    const campaignResult = await db.query<{ id: number }>(
      `INSERT INTO sms_campaigns (
        title, message, sms_type, audience_type, message_category,
        total_recipients, status
      ) VALUES ($1, $2, $3, 'staff', $4, 1, 'sending')
      RETURNING id`,
      [title, message, smsType, smsType === 'promotional' ? 'promotional' : 'manual'],
    );

    const campaignId = campaignResult.rows[0].id;
    const finalMessage = message.includes('{school}')
      ? message.replace(/\{school\}/g, schoolName)
      : message;

    const result = await sendOpenSms({
      to: staffContact.phone,
      message: finalMessage,
      smsType,
    });

    await db.query(
      `INSERT INTO sms_message_logs (
        campaign_id, recipient_phone, recipient_name, student_id,
        message, status, provider_response, error_message, sent_at,
        message_type, recipient_label, delivery_status
      ) VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        campaignId,
        result.phone,
        staffContact.name,
        finalMessage,
        result.success ? 'sent' : 'failed',
        JSON.stringify(result.response),
        result.error,
        result.success ? new Date() : null,
        'Manual',
        'Staff',
        result.success ? 'delivered' : 'failed',
      ],
    );

    await db.query(
      `UPDATE sms_campaigns
       SET sent_count = $2, failed_count = $3, status = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [campaignId, result.success ? 1 : 0, result.success ? 0 : 1, result.success ? 'completed' : 'failed'],
    );

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? 'Message sent to staff via SMS'
        : result.error || 'Failed to send message',
    });
  } catch (error) {
    console.error('Error sending staff message:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message',
      },
      { status: 500 },
    );
  }
}
