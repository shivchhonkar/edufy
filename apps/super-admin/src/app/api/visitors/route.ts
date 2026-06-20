import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureVisitorSchema } from '@/lib/ensure-visitor-schema';
import { getPaginationParams } from '@/lib/utils';
import {
  fetchSchoolName,
  generateVisitorNumber,
  isValidIdProofType,
} from '@/lib/visitor-utils';
import { sendVisitorCheckInSms } from '@/lib/visitor-sms';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    await ensureVisitorSchema(db);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';
    const scope = searchParams.get('scope')?.trim() || '';
    const fromDate = searchParams.get('from_date')?.trim() || '';
    const toDate = searchParams.get('to_date')?.trim() || '';

    const { offset, limit: pageLimit } = getPaginationParams(page, limit);

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(
        v.visitor_number ILIKE $${paramIndex}
        OR v.visitor_name ILIKE $${paramIndex}
        OR v.phone ILIKE $${paramIndex}
        OR v.person_to_meet ILIKE $${paramIndex}
        OR v.purpose ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex += 1;
    }

    if (status) {
      conditions.push(`v.status = $${paramIndex}`);
      params.push(status);
      paramIndex += 1;
    }

    if (scope === 'today') {
      conditions.push(`v.check_in_at::date = CURRENT_DATE`);
    }

    if (fromDate) {
      conditions.push(`v.check_in_at >= $${paramIndex}::date`);
      params.push(fromDate);
      paramIndex += 1;
    }

    if (toDate) {
      conditions.push(`v.check_in_at < ($${paramIndex}::date + INTERVAL '1 day')`);
      params.push(toDate);
      paramIndex += 1;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM school_visitors v ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    const checkedInResult = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM school_visitors WHERE status = 'checked_in'`,
    );
    const checkedInCount = parseInt(checkedInResult.rows[0]?.count || '0', 10);

    const todayResult = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM school_visitors WHERE check_in_at::date = CURRENT_DATE`,
    );
    const todayCount = parseInt(todayResult.rows[0]?.count || '0', 10);

    const listResult = await db.query(
      `SELECT v.*
       FROM school_visitors v
       ${whereClause}
       ORDER BY v.check_in_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, pageLimit, offset],
    );

    return NextResponse.json({
      success: true,
      data: {
        items: listResult.rows,
        total,
        checked_in_count: checkedInCount,
        today_count: todayCount,
        page,
        limit: pageLimit,
      },
    });
  } catch (error) {
    console.error('Error fetching visitors:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch visitors' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db, user } = authResult;

    await ensureVisitorSchema(db);

    const body = await request.json();
    const {
      visitor_name,
      phone,
      email,
      purpose,
      person_to_meet,
      host_phone,
      department,
      id_proof_type,
      id_proof_number,
      vehicle_number,
      notes,
      send_sms = true,
    } = body;

    const name = String(visitor_name || '').trim();
    const visitorPhone = String(phone || '').trim();
    const visitPurpose = String(purpose || '').trim();
    const hostName = String(person_to_meet || '').trim();
    const notifyPhone = String(host_phone || '').trim();

    if (!name || !visitorPhone || !visitPurpose || !hostName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Visitor name, phone, purpose, and person to meet are required',
        },
        { status: 400 },
      );
    }

    if (id_proof_type && !isValidIdProofType(String(id_proof_type))) {
      return NextResponse.json({ success: false, error: 'Invalid ID proof type' }, { status: 400 });
    }

    const visitorNumber = await generateVisitorNumber(db);
    const createdByName =
      (user as { full_name?: string }).full_name || user.email || `User #${user.id}`;

    const insertResult = await db.query(
      `INSERT INTO school_visitors (
        visitor_number, visitor_name, phone, email, purpose, person_to_meet,
        host_phone, department, id_proof_type, id_proof_number, vehicle_number,
        status, sms_status, created_by, created_by_name, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        'checked_in', $12, $13, $14, $15
      ) RETURNING *`,
      [
        visitorNumber,
        name,
        visitorPhone,
        email?.trim() || null,
        visitPurpose,
        hostName,
        notifyPhone || null,
        department?.trim() || null,
        id_proof_type || null,
        id_proof_number?.trim() || null,
        vehicle_number?.trim() || null,
        send_sms && notifyPhone ? 'pending' : 'skipped',
        user.id,
        createdByName,
        notes?.trim() || null,
      ],
    );

    let visitor = insertResult.rows[0];
    let smsResult: { success: boolean; skipped: boolean; error: string | null } | null = null;

    if (send_sms && notifyPhone) {
      try {
        const schoolName = await fetchSchoolName(db);
        smsResult = await sendVisitorCheckInSms(
          notifyPhone,
          {
            visitor_name: name,
            phone: visitorPhone,
            purpose: visitPurpose,
            person_to_meet: hostName,
            visitor_number: visitorNumber,
          },
          schoolName,
        );

        const smsStatus = smsResult.skipped ? 'skipped' : smsResult.success ? 'sent' : 'failed';
        const updateResult = await db.query(
          `UPDATE school_visitors
           SET sms_status = $1,
               sms_sent_at = CASE WHEN $1 = 'sent' THEN CURRENT_TIMESTAMP ELSE sms_sent_at END,
               sms_sent_to = $2,
               sms_error = $3
           WHERE id = $4
           RETURNING *`,
          [
            smsStatus,
            notifyPhone,
            smsResult.success || smsResult.skipped ? null : smsResult.error,
            visitor.id,
          ],
        );
        visitor = updateResult.rows[0];
      } catch (smsError) {
        console.error('Visitor check-in SMS error:', smsError);
        const smsErrorMessage =
          smsError instanceof Error ? smsError.message : 'SMS notification failed';
        smsResult = { success: false, skipped: false, error: smsErrorMessage };
        const updateResult = await db.query(
          `UPDATE school_visitors
           SET sms_status = 'failed', sms_sent_to = $1, sms_error = $2
           WHERE id = $3
           RETURNING *`,
          [notifyPhone, smsErrorMessage, visitor.id],
        );
        visitor = updateResult.rows[0];
      }
    }

    return NextResponse.json({
      success: true,
      data: visitor,
      sms: smsResult,
    });
  } catch (error) {
    console.error('Error creating visitor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to register visitor' },
      { status: 500 },
    );
  }
}
