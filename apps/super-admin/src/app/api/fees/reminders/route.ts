import { NextRequest, NextResponse } from 'next/server';
import { FEE_STUDENT_FROM, FEE_STUDENT_SELECT, feeOpsActor, requireFeeOps } from '@/lib/fee-operations-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireFeeOps(request);
    if (auth instanceof NextResponse) return auth;
    const academicYear = request.nextUrl.searchParams.get('academic_year') || '';
    const fromDate = request.nextUrl.searchParams.get('from_date') || '';
    const toDate = request.nextUrl.searchParams.get('to_date') || '';
    const search = request.nextUrl.searchParams.get('search')?.trim() || '';

    const params: unknown[] = [];
    const conditions: string[] = [];
    if (academicYear) {
      params.push(academicYear);
      conditions.push(`l.academic_year = $${params.length}`);
    }
    if (fromDate) {
      params.push(fromDate);
      conditions.push(`l.sent_at::date >= $${params.length}::date`);
    }
    if (toDate) {
      params.push(toDate);
      conditions.push(`l.sent_at::date <= $${params.length}::date`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(
        s.first_name ILIKE $${params.length}
        OR s.last_name ILIKE $${params.length}
        OR s.admission_number ILIKE $${params.length}
      )`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await auth.db.query(
      `SELECT l.*, ${FEE_STUDENT_SELECT}
       FROM fee_reminder_logs l
       JOIN students s ON s.id = l.student_id
       ${FEE_STUDENT_FROM.replace('FROM students s', '')}
       ${where}
       ORDER BY l.sent_at DESC, l.id DESC`,
      params
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error listing reminder logs:', error);
    return NextResponse.json({ success: false, error: 'Failed to load reminder report' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireFeeOps(request);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const studentIds: number[] = Array.isArray(body.student_ids)
      ? body.student_ids.map((id: unknown) => Number(id)).filter((id: number) => id > 0)
      : [];
    const channels: string[] = Array.isArray(body.channels) ? body.channels.map(String) : [];
    const message = String(body.message || '').trim();
    const academicYear = String(body.academic_year || '').trim() || null;
    const amounts: Record<string, number> = body.amounts && typeof body.amounts === 'object' ? body.amounts : {};

    if (!studentIds.length || !channels.length || !message) {
      return NextResponse.json(
        { success: false, error: 'Students, channels, and message are required' },
        { status: 400 }
      );
    }

    const actor = feeOpsActor(auth.user);
    const inserted = [];
    for (const studentId of studentIds) {
      const result = await auth.db.query(
        `INSERT INTO fee_reminder_logs (student_id, academic_year, channels, message, amount_due, sent_by, sent_by_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [studentId, academicYear, channels, message, Number(amounts[String(studentId)] || 0), actor.id, actor.name]
      );
      inserted.push(result.rows[0]);
    }

    return NextResponse.json({
      success: true,
      data: inserted,
      message: `Reminder logged for ${inserted.length} student(s)`,
    });
  } catch (error) {
    console.error('Error logging reminders:', error);
    return NextResponse.json({ success: false, error: 'Failed to log fee reminders' }, { status: 500 });
  }
}
