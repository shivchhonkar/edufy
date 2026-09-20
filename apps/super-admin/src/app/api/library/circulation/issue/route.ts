import { NextRequest, NextResponse } from 'next/server';
import {
  addDays,
  getFineRule,
  LIBRARY_ISSUE_FROM,
  LIBRARY_ISSUE_SELECT,
  mapIssueRow,
  optionalId,
  requireLibrary,
  todayIso,
} from '@/lib/library-utils';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireLibrary(request);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();

    const borrowerType =
      body.borrower_type === 'staff' || body.borrower_type === 'member' ? body.borrower_type : 'student';
    const studentId = optionalId(body.student_id);
    const staffId = optionalId(body.staff_id);
    const memberId = optionalId(body.member_id);

    if (borrowerType === 'student' && !studentId) {
      return NextResponse.json({ success: false, error: 'Student is required' }, { status: 400 });
    }
    if (borrowerType === 'staff' && !staffId) {
      return NextResponse.json({ success: false, error: 'Staff is required' }, { status: 400 });
    }
    if (borrowerType === 'member' && !memberId) {
      return NextResponse.json({ success: false, error: 'Member is required' }, { status: 400 });
    }

    let copyId = optionalId(body.copy_id);
    const bookId = optionalId(body.book_id);
    if (!copyId && bookId) {
      const available = await auth.db.query<{ id: number }>(
        `SELECT id FROM library_copies WHERE book_id = $1 AND status = 'available' ORDER BY id LIMIT 1`,
        [bookId]
      );
      copyId = available.rows[0]?.id ?? null;
    }
    if (!copyId) {
      return NextResponse.json({ success: false, error: 'Select an available copy' }, { status: 400 });
    }

    const copy = await auth.db.query<{ id: number; book_id: number; status: string }>(
      `SELECT id, book_id, status FROM library_copies WHERE id = $1`,
      [copyId]
    );
    if (!copy.rows[0]) {
      return NextResponse.json({ success: false, error: 'Copy not found' }, { status: 404 });
    }
    if (copy.rows[0].status !== 'available') {
      return NextResponse.json({ success: false, error: 'Copy is not available' }, { status: 400 });
    }

    const rule = await getFineRule(auth.db, borrowerType);
    const issuedAt = String(body.issued_at || todayIso()).slice(0, 10);
    const dueAt = String(body.due_at || addDays(issuedAt, rule.days_allowed)).slice(0, 10);
    if (new Date(dueAt) <= new Date(issuedAt)) {
      return NextResponse.json({ success: false, error: 'Due date must be after issue date' }, { status: 400 });
    }

    const inserted = await auth.db.query<{ id: number }>(
      `INSERT INTO library_issues
        (copy_id, book_id, borrower_type, student_id, staff_id, member_id, issued_at, due_at, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'issued')
       RETURNING id`,
      [copyId, copy.rows[0].book_id, borrowerType, studentId, staffId, memberId, issuedAt, dueAt]
    );
    await auth.db.query(`UPDATE library_copies SET status = 'issued' WHERE id = $1`, [copyId]);

    const issue = await auth.db.query(
      `SELECT ${LIBRARY_ISSUE_SELECT} ${LIBRARY_ISSUE_FROM} WHERE i.id = $1`,
      [inserted.rows[0].id]
    );
    return NextResponse.json({ success: true, data: mapIssueRow(issue.rows[0]) });
  } catch (error) {
    console.error('Library issue error:', error);
    return NextResponse.json({ success: false, error: 'Failed to issue book' }, { status: 500 });
  }
}
