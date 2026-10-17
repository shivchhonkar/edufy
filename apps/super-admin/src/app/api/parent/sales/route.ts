import { NextRequest, NextResponse } from 'next/server'
import { getRequestDbOrError } from '@/lib/request-db'
import { requireStudentFromQuery } from '@/lib/parent-portal/require-student-api'
import { ensureInventorySchema } from '@/lib/ensure-inventory-schema'

export async function GET(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request)
    if (dbResult instanceof NextResponse) return dbResult
    const { db } = dbResult

    const authResult = requireStudentFromQuery(request)
    if (authResult instanceof NextResponse) return authResult
    const { studentId } = authResult

    await ensureInventorySchema(db)

    const result = await db.query(
      `SELECT d.id, d.doc_no, d.doc_date, d.kind, d.status, d.remarks,
              i.name AS item_name, l.quantity, l.unit_price
       FROM inventory_docs d
       JOIN inventory_doc_lines l ON l.doc_id = d.id
       JOIN inventory_items i ON i.id = l.item_id
       WHERE d.party_type = 'student'
         AND d.party_id = $1
         AND d.kind IN ('sale', 'issue')
       ORDER BY d.doc_date DESC, d.id DESC
       LIMIT 150`,
      [studentId],
    )

    return NextResponse.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Parent sales error:', error)
    return NextResponse.json({ success: true, data: [] })
  }
}
