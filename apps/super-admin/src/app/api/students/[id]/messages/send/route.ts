import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { parseStudentId, studentExists } from '@/lib/student-profile-api';
import {
  sendStudentMessages,
  type MessageRecipientTarget,
} from '@/lib/student-messaging';
import { isTwoFactorSmsReady } from '@/lib/two-factor-sms';
import type { SmsType } from '@/lib/two-factor-sms';

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
    const studentId = parseStudentId(params.id);
    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Invalid student id' }, { status: 400 });
    }
    if (!(await studentExists(db, studentId))) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const body = await request.json();
    const title = String(body.title || '').trim();
    const message = String(body.message || '').trim();
    const smsType = (body.sms_type || 'transactional') as SmsType;
    const recipientTarget = (body.recipient_target || 'all') as MessageRecipientTarget;

    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: 'Title and message are required' },
        { status: 400 },
      );
    }

    const settingsRow = await db.query<{ school_name: string | null }>(
      'SELECT school_name FROM system_settings ORDER BY id DESC LIMIT 1',
    );

    const result = await sendStudentMessages({
      db,
      studentId,
      title,
      message,
      smsType,
      recipientTarget,
      messageCategory: smsType === 'promotional' ? 'promotional' : 'manual',
      schoolName: settingsRow.rows[0]?.school_name || 'Shribi Edufy',
    });

    return NextResponse.json({
      success: result.sent > 0,
      data: result,
      message:
        result.failed === 0
          ? `Message sent to ${result.sent} recipient(s) via 2factor.in`
          : `Sent ${result.sent}, failed ${result.failed}`,
    });
  } catch (error) {
    console.error('Error sending student message:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message',
      },
      { status: 500 },
    );
  }
}
