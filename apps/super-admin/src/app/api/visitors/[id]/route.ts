import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureVisitorSchema } from '@/lib/ensure-visitor-schema';
import { fetchSchoolName } from '@/lib/visitor-utils';
import { sendVisitorCheckInSms } from '@/lib/visitor-sms';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    await ensureVisitorSchema(db);

    const { id } = await context.params;
    const visitorId = parseInt(id, 10);
    if (!visitorId || Number.isNaN(visitorId)) {
      return NextResponse.json({ success: false, error: 'Invalid visitor id' }, { status: 400 });
    }

    const result = await db.query('SELECT * FROM school_visitors WHERE id = $1', [visitorId]);
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Visitor not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching visitor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch visitor' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    await ensureVisitorSchema(db);

    const { id } = await context.params;
    const visitorId = parseInt(id, 10);
    if (!visitorId || Number.isNaN(visitorId)) {
      return NextResponse.json({ success: false, error: 'Invalid visitor id' }, { status: 400 });
    }

    const body = await request.json();
    const action = String(body.action || '').trim();

    if (action === 'checkout') {
      const existing = await db.query(
        'SELECT id, status FROM school_visitors WHERE id = $1',
        [visitorId],
      );
      if (existing.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Visitor not found' }, { status: 404 });
      }
      if (existing.rows[0].status === 'checked_out') {
        return NextResponse.json(
          { success: false, error: 'Visitor is already checked out' },
          { status: 400 },
        );
      }

      const result = await db.query(
        `UPDATE school_visitors
         SET status = 'checked_out', check_out_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [visitorId],
      );

      return NextResponse.json({ success: true, data: result.rows[0] });
    }

    return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating visitor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update visitor' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    await ensureVisitorSchema(db);

    const { id } = await context.params;
    const visitorId = parseInt(id, 10);
    if (!visitorId || Number.isNaN(visitorId)) {
      return NextResponse.json({ success: false, error: 'Invalid visitor id' }, { status: 400 });
    }

    const body = await request.json();
    const action = String(body.action || 'notify').trim();
    if (action !== 'notify') {
      return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 });
    }

    const notifyPhone = String(body.host_phone || '').trim();
    const result = await db.query('SELECT * FROM school_visitors WHERE id = $1', [visitorId]);
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Visitor not found' }, { status: 404 });
    }

    const visitor = result.rows[0];
    const phoneToUse = notifyPhone || String(visitor.host_phone || '').trim();
    if (!phoneToUse) {
      return NextResponse.json(
        { success: false, error: 'Host mobile number is required to send SMS' },
        { status: 400 },
      );
    }

    const schoolName = await fetchSchoolName(db);
    const smsResult = await sendVisitorCheckInSms(
      phoneToUse,
      {
        visitor_name: visitor.visitor_name,
        phone: visitor.phone,
        purpose: visitor.purpose,
        person_to_meet: visitor.person_to_meet,
        visitor_number: visitor.visitor_number,
      },
      schoolName,
    );

    const smsStatus = smsResult.skipped ? 'skipped' : smsResult.success ? 'sent' : 'failed';
    const updateResult = await db.query(
      `UPDATE school_visitors
       SET sms_status = $1,
           sms_sent_at = CASE WHEN $1 = 'sent' THEN CURRENT_TIMESTAMP ELSE sms_sent_at END,
           sms_sent_to = $2,
           host_phone = COALESCE($2, host_phone),
           sms_error = $3
       WHERE id = $4
       RETURNING *`,
      [
        smsStatus,
        phoneToUse,
        smsResult.success || smsResult.skipped ? null : smsResult.error,
        visitorId,
      ],
    );

    return NextResponse.json({
      success: true,
      data: updateResult.rows[0],
      sms: smsResult,
    });
  } catch (error) {
    console.error('Error sending visitor notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send notification' },
      { status: 500 },
    );
  }
}
