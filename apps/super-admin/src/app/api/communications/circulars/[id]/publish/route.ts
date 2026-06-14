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

    const circularId = parseInt(id, 10);
    const result = await db.query(
      `SELECT * FROM school_circulars WHERE id = $1`,
      [circularId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Circular not found' }, { status: 404 });
    }

    const circular = result.rows[0];
    if (circular.status === 'published') {
      return NextResponse.json(
        { success: false, error: 'Circular is already published' },
        { status: 400 }
      );
    }

    let smsResult = { sent: 0, failed: 0, skipped: true };
    if (circular.send_sms) {
      const smsMessage = `New circular: ${circular.title}. ${circular.content.slice(0, 200)}`.slice(
        0,
        480
      );
      smsResult = await sendAudienceSms(db, {
        title: `Circular: ${circular.title}`,
        message: smsMessage,
        audience_type: circular.audience_type as SmsAudienceType,
        class_id: circular.class_id,
        section_id: circular.section_id,
      });
    }

    const updated = await db.query(
      `UPDATE school_circulars
       SET status = 'published',
           published_at = CURRENT_TIMESTAMP,
           sms_sent_at = CASE WHEN $2 THEN CURRENT_TIMESTAMP ELSE sms_sent_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [circularId, circular.send_sms && !smsResult.skipped && smsResult.sent > 0]
    );

    return NextResponse.json({
      success: true,
      data: updated.rows[0],
      sms: smsResult,
      message: 'Circular published successfully',
    });
  } catch (error) {
    console.error('Circular publish:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to publish circular' },
      { status: 500 }
    );
  }
}
