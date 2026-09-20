import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureLibrarySchema } from '@/lib/ensure-library-schema';
import type { RequestDb } from '@/lib/request-db';

export type LibraryBorrowerType = 'student' | 'staff' | 'member';

export async function requireLibrary(request: NextRequest) {
  const auth = await getAuthenticatedDb(request);
  if (auth instanceof NextResponse) return auth;
  await ensureLibrarySchema(auth.db);
  return auth;
}

export const LIBRARY_ISSUE_SELECT = `
  i.id,
  i.copy_id,
  i.book_id,
  i.borrower_type,
  i.student_id,
  i.staff_id,
  i.member_id,
  i.issued_at,
  i.due_at,
  i.returned_at,
  i.fine_amount,
  i.remarks,
  i.status,
  b.title AS book_title,
  b.isbn,
  COALESCE(NULLIF(b.author, ''), a.name) AS book_author,
  c.barcode,
  c.accession_no,
  CASE
    WHEN i.borrower_type = 'staff' THEN TRIM(BOTH ' ' FROM COALESCE(st.first_name, '') || ' ' || COALESCE(st.last_name, ''))
    WHEN i.borrower_type = 'student' THEN TRIM(BOTH ' ' FROM COALESCE(s.first_name, '') || ' ' || COALESCE(s.last_name, ''))
    ELSE m.name
  END AS borrower_name,
  s.admission_number,
  s.roll_number,
  cl.name AS class_name,
  st.employee_id,
  m.card_number
`;

export const LIBRARY_ISSUE_FROM = `
  FROM library_issues i
  JOIN library_books b ON b.id = i.book_id
  JOIN library_copies c ON c.id = i.copy_id
  LEFT JOIN library_authors a ON a.id = b.author_id
  LEFT JOIN students s ON s.id = i.student_id
  LEFT JOIN classes cl ON cl.id = s.class_id
  LEFT JOIN staff st ON st.id = i.staff_id
  LEFT JOIN library_members m ON m.id = i.member_id
`;

export function mapIssueRow(row: Record<string, unknown>) {
  const borrowerName = String(row.borrower_name || '').trim() || 'Unknown';
  return {
    ...row,
    book: {
      id: row.book_id,
      title: row.book_title,
      isbn: row.isbn,
      author: row.book_author,
    },
    copy: {
      id: row.copy_id,
      barcode: row.barcode,
      accession_no: row.accession_no,
    },
    member: { name: borrowerName },
    borrower_name: borrowerName,
  };
}

export function addDays(dateStr: string, days: number) {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export async function getFineRule(db: RequestDb, borrowerType: string) {
  const result = await db.query<{
    days_allowed: number;
    fine_per_day: string | number;
    max_fine: string | number | null;
    grace_days: number;
  }>(
    `SELECT days_allowed, fine_per_day, max_fine, grace_days
     FROM library_fine_rules
     WHERE is_active = true AND (borrower_type = $1 OR borrower_type = 'all')
     ORDER BY CASE WHEN borrower_type = $1 THEN 0 ELSE 1 END, id
     LIMIT 1`,
    [borrowerType]
  );
  const rule = result.rows[0];
  return {
    days_allowed: rule?.days_allowed ?? 14,
    fine_per_day: parseFloat(String(rule?.fine_per_day ?? 10)),
    max_fine: rule?.max_fine != null ? parseFloat(String(rule.max_fine)) : null,
    grace_days: rule?.grace_days ?? 0,
  };
}

export function calculateFine(
  dueAt: string,
  returnedAt: string,
  rule: { fine_per_day: number; max_fine: number | null; grace_days: number }
) {
  const overdue = Math.max(0, daysBetween(dueAt, returnedAt) - rule.grace_days);
  if (overdue <= 0) return 0;
  const amount = overdue * rule.fine_per_day;
  if (rule.max_fine != null) return Math.min(amount, rule.max_fine);
  return amount;
}

export function copyBarcode(bookId: number, index: number) {
  return `LB${String(bookId).padStart(4, '0')}-${String(index).padStart(3, '0')}`;
}

export function accessionNo(bookId: number, index: number) {
  return `ACC${String(bookId).padStart(4, '0')}-${String(index).padStart(3, '0')}`;
}

export function copyAccessionNo(
  bookId: number,
  index: number,
  prefix?: string | null,
  startNo?: string | null,
) {
  const p = (prefix || '').trim();
  const start = (startNo || '').trim();
  if (p || start) {
    const n = parseInt(start, 10);
    if (Number.isFinite(n)) {
      return `${p}${n + Math.max(0, index - 1)}`;
    }
    const base = `${p}${start}`;
    return index <= 1 ? base : `${base}-${index}`;
  }
  return accessionNo(bookId, index);
}

export async function insertCopies(
  db: RequestDb,
  bookId: number,
  count: number,
  startIndex = 1,
  accession?: { prefix?: string | null; startNo?: string | null },
) {
  for (let i = 0; i < count; i++) {
    const index = startIndex + i;
    await db.query(
      `INSERT INTO library_copies (book_id, barcode, accession_no, status)
       VALUES ($1, $2, $3, 'available')`,
      [
        bookId,
        copyBarcode(bookId, index),
        copyAccessionNo(bookId, index, accession?.prefix, accession?.startNo),
      ]
    );
  }
}

export function emptyToNull(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

export function optionalInt(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

export function optionalFloat(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

export function optionalBool(value: unknown): boolean {
  return value === true || value === 'Yes' || value === 'true' || value === 1 || value === '1';
}

export function optionalId(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function libraryBookWriteValues(body: Record<string, unknown>) {
  const remarks = emptyToNull(body.remarks) ?? emptyToNull(body.description);
  const medium = emptyToNull(body.medium) ?? emptyToNull(body.language);
  return {
    title: emptyToNull(body.title),
    isbn: emptyToNull(body.isbn),
    author_id: optionalId(body.author_id),
    publisher_id: optionalId(body.publisher_id),
    vendor_id: optionalId(body.vendor_id),
    subject_id: optionalId(body.subject_id),
    category_id: optionalId(body.category_id),
    author: emptyToNull(body.author),
    publisher: emptyToNull(body.publisher),
    author2: emptyToNull(body.author2),
    publish_year: optionalInt(body.publish_year ?? body.year),
    description: remarks,
    remarks,
    price: optionalFloat(body.price),
    language: medium,
    edition: emptyToNull(body.edition),
    pages: optionalInt(body.pages),
    accession_prefix: emptyToNull(body.accession_prefix),
    accession_no: emptyToNull(body.accession_no),
    purchase_date: emptyToNull(body.purchase_date),
    location: emptyToNull(body.location),
    class_no: emptyToNull(body.class_no),
    binding: emptyToNull(body.binding),
    is_reference: optionalBool(body.is_reference),
    book_type: emptyToNull(body.book_type ?? body.type),
    volume: emptyToNull(body.volume),
    bill_no: emptyToNull(body.bill_no),
    with_cd: optionalBool(body.with_cd),
    accession_date: emptyToNull(body.accession_date),
    book_status: emptyToNull(body.book_status) || 'On Shelf',
  };
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
