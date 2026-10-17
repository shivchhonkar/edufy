import { NextRequest, NextResponse } from 'next/server'
import { getRequestDbOrError } from '@/lib/request-db'
import { requireStudentFromQuery } from '@/lib/parent-portal/require-student-api'
import { ensureStudentMessagingSchema } from '@/lib/ensure-student-messaging-schema'

export async function GET(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request)
    if (dbResult instanceof NextResponse) return dbResult
    const { db } = dbResult

    const authResult = requireStudentFromQuery(request)
    if (authResult instanceof NextResponse) return authResult
    const { studentId } = authResult

    await ensureStudentMessagingSchema(db)

    const result = await db.query(
      `SELECT l.id, l.message, l.status, l.message_type, l.delivery_status,
              l.sent_at, l.created_at, c.title, c.message_category
       FROM sms_message_logs l
       JOIN sms_campaigns c ON c.id = l.campaign_id
       WHERE l.student_id = $1
       ORDER BY COALESCE(l.sent_at, l.created_at) DESC
       LIMIT 100`,
      [studentId],
    )

    return NextResponse.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Parent SMS history error:', error)
    return NextResponse.json({ success: true, data: [] })
  }
}
