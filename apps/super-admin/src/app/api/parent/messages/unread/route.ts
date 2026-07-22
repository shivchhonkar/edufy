import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { ensureTeacherMessagesSchema } from '@/lib/ensure-teacher-messages-schema';
import { ensureTeacherSchema } from '@/lib/teacher-auth';
import { requireStudentFromQuery } from '@/lib/parent-portal/require-student-api';

export async function GET(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    const authResult = requireStudentFromQuery(request);
    if (authResult instanceof NextResponse) return authResult;
    const { studentId } = authResult;

    await ensureTeacherSchema(db);
    await ensureTeacherMessagesSchema(db);

    const result = await db.query(
      `SELECT COUNT(*)::int AS unread_count
       FROM parent_message_posts p
       INNER JOIN parent_message_threads t ON t.id = p.thread_id
       WHERE t.student_id = $1
         AND p.sender_role = 'teacher'
         AND p.read_at IS NULL`,
      [studentId],
    );

    const unreadCount = Number(result.rows[0]?.unread_count ?? 0);

    return NextResponse.json({
      success: true,
      data: { unread_count: unreadCount },
    });
  } catch (error) {
    console.error('Parent messages unread GET:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch unread count' },
      { status: 500 },
    );
  }
}
