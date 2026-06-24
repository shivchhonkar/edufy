import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { parseStudentId, studentExists } from '@/lib/student-profile-api';
import { ensureStudentMessagingSchema } from '@/lib/ensure-student-messaging-schema';
import { processDueScheduledMessages } from '@/lib/student-messaging';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { db } = await getRequestDb(request);
    const studentId = parseStudentId(params.id);
    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Invalid student id' }, { status: 400 });
    }
    if (!(await studentExists(db, studentId))) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    await ensureStudentMessagingSchema(db);
    await processDueScheduledMessages(db, studentId);

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const offset = (page - 1) * limit;
    const typeFilter = searchParams.get('type') || 'all';
    const search = searchParams.get('search')?.trim() || '';

    let where = 'WHERE l.student_id = $1';
    const queryParams: (string | number)[] = [studentId];
    let paramIndex = 2;

    if (typeFilter === 'automated') {
      where += ` AND COALESCE(l.message_type, '') ILIKE 'Automated%'`;
    } else if (typeFilter === 'manual') {
      where += ` AND COALESCE(l.message_type, '') ILIKE 'Manual%'`;
    } else if (typeFilter === 'scheduled') {
      where += ` AND COALESCE(l.message_type, '') = 'Scheduled'`;
    }

    if (search) {
      where += ` AND (
        c.title ILIKE $${paramIndex}
        OR l.message ILIKE $${paramIndex}
        OR l.recipient_name ILIKE $${paramIndex}
        OR l.recipient_phone ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${search}%`);
      paramIndex += 1;
    }

    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM sms_message_logs l
       JOIN sms_campaigns c ON c.id = l.campaign_id
       ${where}`,
      queryParams,
    );
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    queryParams.push(limit, offset);
    const result = await db.query(
      `SELECT
        l.id,
        l.recipient_phone,
        l.recipient_name,
        l.message,
        l.status,
        l.message_type,
        l.recipient_label,
        l.delivery_status,
        l.sent_at,
        l.created_at,
        l.error_message,
        c.title,
        c.message_category,
        c.sms_type
       FROM sms_message_logs l
       JOIN sms_campaigns c ON c.id = l.campaign_id
       ${where}
       ORDER BY COALESCE(l.sent_at, l.created_at) DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      queryParams,
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching student message history:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          'Failed to fetch message history. Ensure SMS communications tables are migrated.',
      },
      { status: 500 },
    );
  }
}
