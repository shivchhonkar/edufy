import { NextRequest, NextResponse } from 'next/server';
import {
  calculateFine,
  getFineRule,
  LIBRARY_ISSUE_FROM,
  LIBRARY_ISSUE_SELECT,
  mapIssueRow,
  requireLibrary,
  todayIso,
} from '@/lib/library-utils';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireLibrary(request);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const issueId = Number(body.issue_id);
    if (!issueId) {
      return NextResponse.json({ success: false, error: 'issue_id required' }, { status: 400 });
    }

    const current = await auth.db.query<{
      id: number;
      copy_id: number;
      status: string;
      due_at: string;
      borrower_type: string;
    }>(`SELECT id, copy_id, status, due_at::text, borrower_type FROM library_issues WHERE id = $1`, [issueId]);
    if (!current.rows[0]) {
      return NextResponse.json({ success: false, error: 'Issue not found' }, { status: 404 });
    }
    if (current.rows[0].status !== 'issued') {
      return NextResponse.json({ success: false, error: 'This book is already returned' }, { status: 400 });
    }

    const returnedAt = String(body.returned_at || todayIso()).slice(0, 10);
    const rule = await getFineRule(auth.db, current.rows[0].borrower_type);
    const computed = calculateFine(String(current.rows[0].due_at).slice(0, 10), returnedAt, rule);
    const fine = body.fine != null && body.fine !== '' ? parseFloat(String(body.fine)) : computed;

    await auth.db.query(
      `UPDATE library_issues
       SET returned_at = $1, fine_amount = $2, remarks = $3, status = 'returned', updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [returnedAt, Number.isFinite(fine) ? fine : 0, body.remarks || null, issueId]
    );
    await auth.db.query(`UPDATE library_copies SET status = 'available' WHERE id = $1`, [current.rows[0].copy_id]);

    const issue = await auth.db.query(
      `SELECT ${LIBRARY_ISSUE_SELECT} ${LIBRARY_ISSUE_FROM} WHERE i.id = $1`,
      [issueId]
    );
    return NextResponse.json({ success: true, data: mapIssueRow(issue.rows[0]) });
  } catch (error) {
    console.error('Library return error:', error);
    return NextResponse.json({ success: false, error: 'Failed to return book' }, { status: 500 });
  }
}
