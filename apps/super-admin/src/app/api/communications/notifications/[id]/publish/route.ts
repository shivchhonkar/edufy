import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureCommunicationsSchema } from '@/lib/ensure-communications-schema';
import { sendAudienceSms } from '@/lib/audience-sms';
import type { SmsAudienceType } from '@/lib/sms-recipients';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await getRequestDb(request);
    await ensureCommunicationsSchema(db);

    const notificationId = parseInt(id, 10);
    const result = await db.query(
      `SELECT * FROM school_notifications WHERE id = $1`,
      [notificationId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    const notification = result.rows[0];
    if (notification.status === 'active') {
      return NextResponse.json(
        { success: false, error: 'Notification is already active' },
        { status: 400 }
      );
    }

    let smsResult = { sent: 0, failed: 0, skipped: true };
    if (notification.send_sms) {
      const smsMessage = `${notification.title}: ${notification.message}`.slice(0, 480);
      smsResult = await sendAudienceSms(db, {
        title: `Notification: ${notification.title}`,
        message: smsMessage,
        audience_type: notification.audience_type as SmsAudienceType,
        class_id: notification.class_id,
        section_id: notification.section_id,
      });
    }

    const updated = await db.query(
      `UPDATE school_notifications
       SET status = 'active',
           published_at = CURRENT_TIMESTAMP,
           sms_sent_at = CASE WHEN $2 THEN CURRENT_TIMESTAMP ELSE sms_sent_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [notificationId, notification.send_sms && !smsResult.skipped && smsResult.sent > 0]
    );

    return NextResponse.json({
      success: true,
      data: updated.rows[0],
      sms: smsResult,
      message: 'Notification published successfully',
    });
  } catch (error) {
    console.error('Notification publish:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to publish notification' },
      { status: 500 }
    );
  }
}
