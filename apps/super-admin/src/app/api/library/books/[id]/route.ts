import { NextRequest, NextResponse } from 'next/server';
import { libraryBookWriteValues, requireLibrary } from '@/lib/library-utils';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireLibrary(request);
    if (auth instanceof NextResponse) return auth;
    const id = parseInt(params.id, 10);
    const body = await request.json();
    const fields = libraryBookWriteValues(body);
    if (!fields.title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }
    const result = await auth.db.query(
      `UPDATE library_books
       SET title = $1,
           isbn = $2,
           author_id = $3,
           publisher_id = $4,
           vendor_id = $5,
           subject_id = $6,
           category_id = $7,
           author = $8,
           publisher = $9,
           author2 = $10,
           publish_year = $11,
           description = $12,
           remarks = $13,
           price = $14,
           language = $15,
           edition = $16,
           pages = $17,
           accession_prefix = $18,
           accession_no = $19,
           purchase_date = $20,
           location = $21,
           class_no = $22,
           binding = $23,
           is_reference = $24,
           book_type = $25,
           volume = $26,
           bill_no = $27,
           with_cd = $28,
           accession_date = $29,
           book_status = $30,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $31
       RETURNING *`,
      [
        fields.title,
        fields.isbn,
        fields.author_id,
        fields.publisher_id,
        fields.vendor_id,
        fields.subject_id,
        fields.category_id,
        fields.author,
        fields.publisher,
        fields.author2,
        fields.publish_year,
        fields.description,
        fields.remarks,
        fields.price,
        fields.language,
        fields.edition,
        fields.pages,
        fields.accession_prefix,
        fields.accession_no,
        fields.purchase_date,
        fields.location,
        fields.class_no,
        fields.binding,
        fields.is_reference,
        fields.book_type,
        fields.volume,
        fields.bill_no,
        fields.with_cd,
        fields.accession_date,
        fields.book_status,
        id,
      ]
    );
    if (!result.rows[0]) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Library book update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update book' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireLibrary(request);
    if (auth instanceof NextResponse) return auth;
    const id = parseInt(params.id, 10);
    const issued = await auth.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM library_copies WHERE book_id = $1 AND status = 'issued'`,
      [id]
    );
    if (parseInt(issued.rows[0]?.count || '0', 10) > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete a title with issued copies. Return them first.' },
        { status: 400 }
      );
    }
    await auth.db.query(`DELETE FROM library_issues WHERE book_id = $1 AND status = 'returned'`, [id]);
    await auth.db.query(`DELETE FROM library_books WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Library book delete error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete book' }, { status: 500 });
  }
}
