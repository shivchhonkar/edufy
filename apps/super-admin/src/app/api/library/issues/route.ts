import { NextRequest, NextResponse } from 'next/server';
import { LIBRARY_ISSUE_FROM, LIBRARY_ISSUE_SELECT, mapIssueRow, requireLibrary } from '@/lib/library-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireLibrary(request);
    if (auth instanceof NextResponse) return auth;
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');
    const borrowerType = searchParams.get('borrower_type');
    const search = searchParams.get('search')?.trim();

    const cond: string[] = [];
    const params: unknown[] = [];
    if (status) {
      params.push(status);
      cond.push(`i.status = $${params.length}`);
    }
    if (borrowerType) {
      params.push(borrowerType);
      cond.push(`i.borrower_type = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      cond.push(
        `(c.barcode ILIKE $${params.length}
          OR c.accession_no ILIKE $${params.length}
          OR b.title ILIKE $${params.length}
          OR COALESCE(NULLIF(b.author, ''), a.name) ILIKE $${params.length}
          OR s.first_name ILIKE $${params.length}
          OR s.last_name ILIKE $${params.length}
          OR (COALESCE(s.first_name, '') || ' ' || COALESCE(s.last_name, '')) ILIKE $${params.length}
          OR s.admission_number ILIKE $${params.length}
          OR st.first_name ILIKE $${params.length}
          OR st.last_name ILIKE $${params.length}
          OR (COALESCE(st.first_name, '') || ' ' || COALESCE(st.last_name, '')) ILIKE $${params.length}
          OR st.employee_id ILIKE $${params.length})`
      );
    }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    const result = await auth.db.query(
      `SELECT ${LIBRARY_ISSUE_SELECT} ${LIBRARY_ISSUE_FROM} ${where} ORDER BY i.issued_at DESC, i.id DESC`,
      params
    );
    return NextResponse.json({ success: true, data: result.rows.map((row) => mapIssueRow(row)) });
  } catch (error) {
    console.error('Library issues list error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load issues' }, { status: 500 });
  }
}
