import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { requireTeacherAuth, resolveStaffId, ensureTeacherSchema } from '@/lib/teacher-auth';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import {
  countWorkingDays,
  getLeaveBalanceRemaining,
  hasOverlappingLeave,
} from '@/lib/leave-utils';

const LEAVE_SELECT = `
  SELECT sl.*, lt.name AS leave_type_name, lt.is_paid
  FROM staff_leaves sl
  LEFT JOIN leave_types lt ON sl.leave_type_id = lt.id
  WHERE sl.staff_id = $1`;

async function requireTeacherStaffId(request: NextRequest) {
  const auth = requireTeacherAuth(request);
  if (auth instanceof NextResponse) return auth;

  const dbResult = await getRequestDbOrError(request);
  if (dbResult instanceof NextResponse) return dbResult;

  const { db } = dbResult;
  await ensureTeacherSchema(db);
  await ensureHrSchema(db);

  const staffId = await resolveStaffId(db, auth.user.id);
  if (!staffId) {
    return NextResponse.json({ success: false, error: 'No staff profile linked' }, { status: 404 });
  }

  return { auth, db, staffId };
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireTeacherStaffId(request);
    if (ctx instanceof NextResponse) return ctx;

    const year = request.nextUrl.searchParams.get('year');
    let query = `${LEAVE_SELECT} ORDER BY sl.created_at DESC`;
    const params: number[] = [ctx.staffId];

    if (year) {
      params.push(parseInt(year, 10));
      query = `${LEAVE_SELECT} AND EXTRACT(YEAR FROM sl.start_date) = $2 ORDER BY sl.created_at DESC`;
    }

    const result = await ctx.db.query(query, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Teacher leaves fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch leave requests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireTeacherStaffId(request);
    if (ctx instanceof NextResponse) return ctx;

    const body = await request.json();
    const leave_type_id = parseInt(String(body?.leave_type_id ?? ''), 10);
    const start_date = String(body?.start_date ?? '').trim();
    const end_date = String(body?.end_date ?? '').trim();
    const reason = String(body?.reason ?? '').trim() || null;

    if (!Number.isFinite(leave_type_id) || !start_date || !end_date) {
      return NextResponse.json(
        { success: false, error: 'leave_type_id, start_date, and end_date are required' },
        { status: 400 },
      );
    }

    if (new Date(end_date) < new Date(start_date)) {
      return NextResponse.json(
        { success: false, error: 'End date must be on or after start date' },
        { status: 400 },
      );
    }

    const daysRequested = countWorkingDays(start_date, end_date);
    if (daysRequested <= 0) {
      return NextResponse.json(
        { success: false, error: 'Leave must include at least one working day' },
        { status: 400 },
      );
    }

    if (await hasOverlappingLeave(ctx.db, ctx.staffId, start_date, end_date)) {
      return NextResponse.json(
        { success: false, error: 'You already have a pending or approved leave for overlapping dates' },
        { status: 409 },
      );
    }

    const year = new Date(start_date).getFullYear();
    const balance = await getLeaveBalanceRemaining(ctx.db, ctx.staffId, leave_type_id, year);
    if (balance.maxDays != null && daysRequested > balance.remaining) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient leave balance. ${balance.remaining} day(s) remaining, ${daysRequested} requested.`,
        },
        { status: 400 },
      );
    }

    const result = await ctx.db.query(
      `INSERT INTO staff_leaves (staff_id, leave_type_id, start_date, end_date, days_requested, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [ctx.staffId, leave_type_id, start_date, end_date, daysRequested, reason],
    );

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Teacher leave create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to submit leave request' }, { status: 500 });
  }
}
