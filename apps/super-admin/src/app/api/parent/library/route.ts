import { NextRequest, NextResponse } from 'next/server'
import { getRequestDbOrError } from '@/lib/request-db'
import { requireStudentFromQuery } from '@/lib/parent-portal/require-student-api'
import { ensureLibrarySchema } from '@/lib/ensure-library-schema'

export async function GET(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request)
    if (dbResult instanceof NextResponse) return dbResult
    const { db } = dbResult

    const authResult = requireStudentFromQuery(request)
    if (authResult instanceof NextResponse) return authResult
    const { studentId } = authResult

    await ensureLibrarySchema(db)

    const result = await db.query(
      `SELECT i.id, b.title AS book_title,
              COALESCE(NULLIF(b.author, ''), a.name) AS book_author,
              c.accession_no, i.issued_at, i.due_at, i.returned_at,
              i.fine_amount, i.status, i.remarks
       FROM library_issues i
       JOIN library_books b ON b.id = i.book_id
       JOIN library_copies c ON c.id = i.copy_id
       LEFT JOIN library_authors a ON a.id = b.author_id
       WHERE i.student_id = $1 AND i.borrower_type = 'student'
       ORDER BY i.issued_at DESC
       LIMIT 100`,
      [studentId],
    )

    return NextResponse.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Parent library error:', error)
    return NextResponse.json({ success: true, data: [] })
  }
}
