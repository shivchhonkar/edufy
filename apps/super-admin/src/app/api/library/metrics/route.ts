import { NextRequest, NextResponse } from 'next/server';
import { requireLibrary } from '@/lib/library-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireLibrary(request);
    if (auth instanceof NextResponse) return auth;

    const [books, copies, issues, members, fines] = await Promise.all([
      auth.db.query<{ titles: string; copies: string }>(
        `SELECT COUNT(*)::text AS titles, COALESCE(SUM(total_copies),0)::text AS copies FROM library_books`
      ),
      auth.db.query<{ available: string; issued: string; lost: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'available')::text AS available,
           COUNT(*) FILTER (WHERE status = 'issued')::text AS issued,
           COUNT(*) FILTER (WHERE status = 'lost')::text AS lost
         FROM library_copies`
      ),
      auth.db.query<{ overdue: string }>(
        `SELECT COUNT(*)::text AS overdue
         FROM library_issues
         WHERE status = 'issued' AND due_at < CURRENT_DATE`
      ),
      auth.db.query<{ active: string }>(
        `SELECT COUNT(*)::text AS active FROM library_members WHERE active = true`
      ),
      auth.db.query<{ today: string }>(
        `SELECT COALESCE(SUM(fine_amount),0)::text AS today
         FROM library_issues
         WHERE returned_at = CURRENT_DATE`
      ),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalBooks: parseInt(books.rows[0]?.copies || '0', 10),
        totalTitles: parseInt(books.rows[0]?.titles || '0', 10),
        availableBooks: parseInt(copies.rows[0]?.available || '0', 10),
        issuedBooks: parseInt(copies.rows[0]?.issued || '0', 10),
        overdueBooks: parseInt(issues.rows[0]?.overdue || '0', 10),
        lostBooks: parseInt(copies.rows[0]?.lost || '0', 10),
        reservedBooks: 0,
        activeMembers: parseInt(members.rows[0]?.active || '0', 10),
        newArrivals: 0,
        fineCollectionToday: parseFloat(fines.rows[0]?.today || '0'),
      },
    });
  } catch (error) {
    console.error('Library metrics error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load metrics' }, { status: 500 });
  }
}
