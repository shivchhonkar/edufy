import { NextRequest, NextResponse } from 'next/server';
import { insertCopies, libraryBookWriteValues, requireLibrary } from '@/lib/library-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireLibrary(request);
    if (auth instanceof NextResponse) return auth;

    const books = await auth.db.query(
      `SELECT b.*,
              COALESCE(NULLIF(b.author, ''), a.name) AS author,
              COALESCE(NULLIF(b.publisher, ''), p.name) AS publisher,
              v.name AS vendor_name,
              s.name AS subject_name,
              cat.name AS category_name
       FROM library_books b
       LEFT JOIN library_authors a ON a.id = b.author_id
       LEFT JOIN library_publishers p ON p.id = b.publisher_id
       LEFT JOIN library_vendors v ON v.id = b.vendor_id
       LEFT JOIN library_subjects s ON s.id = b.subject_id
       LEFT JOIN library_categories cat ON cat.id = b.category_id
       ORDER BY b.title`
    );
    const copies = await auth.db.query(
      `SELECT id, book_id, barcode, accession_no, status FROM library_copies ORDER BY id`
    );
    const copiesByBook = new Map<number, typeof copies.rows>();
    for (const copy of copies.rows) {
      const list = copiesByBook.get(copy.book_id) || [];
      list.push(copy);
      copiesByBook.set(copy.book_id, list);
    }

    const data = books.rows.map((book) => ({
      ...book,
      copies: copiesByBook.get(book.id) || [],
    }));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Library books list error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load books' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireLibrary(request);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const fields = libraryBookWriteValues(body);
    if (!fields.title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }
    const totalCopies = Math.max(0, parseInt(String(body.total_copies ?? 1), 10) || 0);
    const result = await auth.db.query(
      `INSERT INTO library_books
        (title, isbn, author_id, publisher_id, vendor_id, subject_id, category_id,
         author, publisher, author2, publish_year, description, remarks, price, language, edition,
         pages, accession_prefix, accession_no, purchase_date, location, class_no, binding,
         is_reference, book_type, volume, bill_no, with_cd, accession_date, book_status, total_copies)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31)
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
        totalCopies,
      ]
    );
    const book = result.rows[0];
    if (totalCopies > 0) {
      await insertCopies(auth.db, book.id, totalCopies, 1, {
        prefix: fields.accession_prefix,
        startNo: fields.accession_no,
      });
    }
    return NextResponse.json({ success: true, data: book }, { status: 201 });
  } catch (error) {
    console.error('Library book create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to add book' }, { status: 500 });
  }
}
