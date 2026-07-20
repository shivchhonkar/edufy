import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { requireStudentFromQuery } from '@/lib/parent-portal/require-student-api';

export async function GET(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    const authResult = requireStudentFromQuery(request);
    if (authResult instanceof NextResponse) return authResult;
    const { studentId } = authResult;

    const searchParams = request.nextUrl.searchParams;
    const requestedSession = searchParams.get('academicYear')?.trim() || null;

    const settingsResult = await db.query(
      'SELECT academic_year FROM system_settings ORDER BY id DESC LIMIT 1',
    );
    const currentSession =
      settingsResult.rows[0]?.academic_year?.trim() || `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`;

    const sessionsResult = await db.query(
      `SELECT DISTINCT academic_year
       FROM fee_payments
       WHERE student_id = $1
         AND status = 'completed'
         AND academic_year IS NOT NULL
         AND TRIM(academic_year) <> ''
       ORDER BY academic_year DESC`,
      [studentId],
    );

    const sessions = sessionsResult.rows
      .map((row: { academic_year?: string }) => row.academic_year?.trim())
      .filter(Boolean) as string[];

    if (!sessions.includes(currentSession)) {
      sessions.unshift(currentSession);
    }

    const activeSession =
      requestedSession && sessions.includes(requestedSession)
        ? requestedSession
        : sessions[0] || currentSession;

    const receiptsResult = await db.query(
      `SELECT
         fp.id,
         fp.receipt_number,
         fp.payment_method,
         fp.payment_date,
         fp.amount_paid,
         fp.transaction_id,
         fp.remarks,
         fp.academic_year
       FROM fee_payments fp
       WHERE fp.student_id = $1
         AND fp.status = 'completed'
         AND fp.academic_year = $2
       ORDER BY fp.payment_date DESC, fp.id DESC`,
      [studentId, activeSession],
    );

    return NextResponse.json({
      success: true,
      data: {
        sessions,
        currentSession: activeSession,
        receipts: receiptsResult.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching parent fee receipts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch fee receipts' },
      { status: 500 },
    );
  }
}
