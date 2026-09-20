import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { parseStudentId, studentExists } from '@/lib/student-profile-api';
import type { RequestDb } from '@/lib/request-db';

async function tableExists(db: RequestDb, tableName: string) {
  const result = await db.query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) AS exists`,
    [tableName]
  );
  return Boolean(result.rows[0]?.exists);
}

async function columnExists(db: RequestDb, tableName: string, columnName: string) {
  const result = await db.query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
    ) AS exists`,
    [tableName, columnName]
  );
  return Boolean(result.rows[0]?.exists);
}

async function routeId(params: { id: string } | Promise<{ id: string }>) {
  return (await Promise.resolve(params)).id;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { db } = await getRequestDb(request);
    const studentId = parseStudentId(await routeId(params));
    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Invalid student id' }, { status: 400 });
    }
    if (!(await studentExists(db, studentId))) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const purchases: Array<Record<string, unknown>> = [];
    const library: Array<Record<string, unknown>> = [];

    if (await tableExists(db, 'inventory_docs')) {
      try {
        const hasSize = await columnExists(db, 'inventory_items', 'size');
        const result = await db.query(
          `SELECT d.id, d.doc_no, d.doc_date, d.kind, d.status, d.remarks,
                  l.quantity, l.unit_price,
                  i.item_name, i.item_code, i.unit${hasSize ? ', i.size' : ''}
           FROM inventory_docs d
           JOIN inventory_doc_lines l ON l.doc_id = d.id
           JOIN inventory_items i ON i.id = l.item_id
           WHERE d.party_type = 'student'
             AND d.party_id = $1
             AND d.kind IN ('sale', 'issue', 'return')
             AND d.status <> 'cancelled'
           ORDER BY d.doc_date DESC, d.id DESC, l.id`,
          [studentId]
        );

        const byDoc = new Map<number, Record<string, unknown>>();
        for (const row of result.rows) {
          const qty = Number(row.quantity || 0);
          const rate = Number(row.unit_price || 0);
          const amount = qty * rate;
          const existing = byDoc.get(row.id);
          const item = {
            item_name: row.item_name,
            size: row.size || null,
            item_code: row.item_code,
            unit: row.unit,
            quantity: qty,
            unit_price: rate,
            amount,
          };
          if (existing) {
            (existing.items as unknown[]).push(item);
            existing.total = Number(existing.total || 0) + amount;
          } else {
            byDoc.set(row.id, {
              id: row.id,
              doc_no: row.doc_no,
              doc_date: row.doc_date,
              kind: row.kind,
              status: row.status,
              remarks: row.remarks,
              total: amount,
              items: [item],
            });
          }
        }
        purchases.push(...byDoc.values());
      } catch (error) {
        console.error('Student purchase history error:', error);
      }
    }

    if (await tableExists(db, 'library_issues')) {
      try {
        const result = await db.query(
          `SELECT i.id, i.issued_at, i.due_at, i.returned_at, i.status, i.fine_amount,
                  b.title, b.isbn,
                  COALESCE(NULLIF(b.author, ''), a.name) AS author,
                  c.barcode, c.accession_no
           FROM library_issues i
           JOIN library_books b ON b.id = i.book_id
           LEFT JOIN library_copies c ON c.id = i.copy_id
           LEFT JOIN library_authors a ON a.id = b.author_id
           WHERE i.student_id = $1
           ORDER BY i.issued_at DESC, i.id DESC`,
          [studentId]
        );
        library.push(...result.rows);
      } catch (error) {
        console.error('Student library history error:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        purchases,
        library,
        purchase_total: purchases.reduce((sum, row) => sum + Number(row.total || 0), 0),
        library_issued: library.filter((row) => String(row.status) === 'issued').length,
      },
    });
  } catch (error) {
    console.error('Student activity error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load activity' }, { status: 500 });
  }
}
