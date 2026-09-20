import { NextRequest, NextResponse } from 'next/server';
import { LIBRARY_ISSUE_FROM, LIBRARY_ISSUE_SELECT, mapIssueRow, requireLibrary } from '@/lib/library-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireLibrary(request);
    if (auth instanceof NextResponse) return auth;
    const type = request.nextUrl.searchParams.get('type') || 'books';
    const fromDate = request.nextUrl.searchParams.get('from_date');
    const toDate = request.nextUrl.searchParams.get('to_date');
    const borrowerType = request.nextUrl.searchParams.get('borrower_type');
    const search = request.nextUrl.searchParams.get('search')?.trim();

    if (type === 'books') {
      const result = await auth.db.query(
        `SELECT c.id, c.barcode, c.accession_no, c.status,
                b.id AS book_id, b.title, b.isbn,
                COALESCE(NULLIF(b.author, ''), a.name) AS author,
                COALESCE(NULLIF(b.publisher, ''), p.name) AS publisher,
                v.name AS vendor_name,
                s.name AS subject_name,
                cat.name AS category_name,
                b.publish_year, b.price
         FROM library_copies c
         JOIN library_books b ON b.id = c.book_id
         LEFT JOIN library_authors a ON a.id = b.author_id
         LEFT JOIN library_publishers p ON p.id = b.publisher_id
         LEFT JOIN library_vendors v ON v.id = b.vendor_id
         LEFT JOIN library_subjects s ON s.id = b.subject_id
         LEFT JOIN library_categories cat ON cat.id = b.category_id
         ORDER BY c.accession_no, b.title`
      );
      return NextResponse.json({ success: true, data: result.rows });
    }

    const cond: string[] = [];
    const params: unknown[] = [];
    if (type === 'issued' || type === 'overdue') {
      cond.push(`i.status = 'issued'`);
    }
    if (type === 'overdue') {
      cond.push(`i.due_at < CURRENT_DATE`);
    }
    if (type === 'returned') {
      cond.push(`i.status = 'returned'`);
    }
    if (type === 'lost') {
      cond.push(`i.status IN ('lost', 'damaged')`);
    }
    if (type === 'fines') {
      cond.push(`i.fine_amount > 0`);
    }
    if (borrowerType) {
      params.push(borrowerType);
      cond.push(`i.borrower_type = $${params.length}`);
    }
    const dateColumn = type === 'returned' ? 'i.returned_at' : 'i.issued_at';
    if (fromDate) {
      params.push(fromDate);
      cond.push(`${dateColumn} >= $${params.length}`);
    }
    if (toDate) {
      params.push(toDate);
      cond.push(`${dateColumn} <= $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      cond.push(
        `(b.title ILIKE $${params.length} OR c.barcode ILIKE $${params.length} OR c.accession_no ILIKE $${params.length})`
      );
    }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    const result = await auth.db.query(
      `SELECT ${LIBRARY_ISSUE_SELECT} ${LIBRARY_ISSUE_FROM} ${where} ORDER BY i.issued_at DESC, i.id DESC`,
      params
    );
    return NextResponse.json({ success: true, data: result.rows.map((row) => mapIssueRow(row)) });
  } catch (error) {
    console.error('Library reports error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load report' }, { status: 500 });
  }
}
