import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureCommunicationsSchema } from '@/lib/ensure-communications-schema';
import { isValidAudienceType } from '@/lib/sms-recipients';

const LIST_QUERY = `
  SELECT sn.*,
    c.name AS class_name,
    sec.name AS section_name
  FROM school_notifications sn
  LEFT JOIN classes c ON sn.class_id = c.id
  LEFT JOIN sections sec ON sn.section_id = sec.id
  WHERE 1=1
`;

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureCommunicationsSchema(db);

    const status = request.nextUrl.searchParams.get('status');
    const search = request.nextUrl.searchParams.get('search');

    const params: unknown[] = [];
    let query = LIST_QUERY;

    if (status) {
      params.push(status);
      query += ` AND sn.status = $${params.length}`;
    }
    if (search?.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (sn.title ILIKE $${params.length} OR sn.message ILIKE $${params.length})`;
    }

    query += ` ORDER BY sn.created_at DESC`;

    const result = await db.query(query, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Notifications GET:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureCommunicationsSchema(db);

    const body = await request.json();
    const {
      title,
      message,
      audience_type,
      class_id,
      section_id,
      priority,
      category,
      scheduled_at,
      expires_at,
      send_sms,
      publish,
    } = body;

    if (!title?.trim() || !message?.trim()) {
      return NextResponse.json(
        { success: false, error: 'title and message are required' },
        { status: 400 }
      );
    }

    if (!isValidAudienceType(audience_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid audience_type' },
        { status: 400 }
      );
    }

    const shouldPublish = Boolean(publish);
    const result = await db.query(
      `INSERT INTO school_notifications (
        title, message, audience_type, class_id, section_id,
        priority, category, scheduled_at, expires_at, send_sms, status, published_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *`,
      [
        title.trim(),
        message.trim(),
        audience_type,
        class_id || null,
        section_id || null,
        priority || 'info',
        category || 'general',
        scheduled_at || null,
        expires_at || null,
        Boolean(send_sms),
        shouldPublish ? 'active' : 'draft',
        shouldPublish ? new Date() : null,
      ]
    );

    let smsResult = { sent: 0, failed: 0, skipped: true };
    const notification = result.rows[0];
    if (shouldPublish && notification.send_sms) {
      const { sendAudienceSms } = await import('@/lib/audience-sms');
      const smsMessage = `${notification.title}: ${notification.message}`.slice(0, 480);
      smsResult = await sendAudienceSms(db, {
        title: `Notification: ${notification.title}`,
        message: smsMessage,
        audience_type: notification.audience_type,
        class_id: notification.class_id,
        section_id: notification.section_id,
      });
      if (!smsResult.skipped && smsResult.sent > 0) {
        await db.query(
          `UPDATE school_notifications SET sms_sent_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [notification.id],
        );
      }
    }

    return NextResponse.json(
      { success: true, data: notification, sms: shouldPublish ? smsResult : undefined },
      { status: 201 },
    );
  } catch (error) {
    console.error('Notifications POST:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}
