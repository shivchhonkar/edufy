import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { ensureTeacherMessagesSchema } from '@/lib/ensure-teacher-messages-schema';
import { ensureTeacherSchema } from '@/lib/teacher-auth';
import {
  parseStudentIdParam,
  requireParentStudentAccess,
} from '@/lib/parent-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    const studentIdParam = request.nextUrl.searchParams.get('studentId');
    if (!studentIdParam) {
      return NextResponse.json(
        { success: false, error: 'Student ID is required' },
        { status: 400 },
      );
    }

    const studentId = parseStudentIdParam(studentIdParam);
    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Invalid student id' }, { status: 400 });
    }

    const auth = requireParentStudentAccess(request, studentId);
    if (auth instanceof NextResponse) return auth;

    await ensureTeacherSchema(db);
    await ensureTeacherMessagesSchema(db);

    const threadId = parseInt(params.id, 10);
    if (Number.isNaN(threadId)) {
      return NextResponse.json({ success: false, error: 'Invalid thread id' }, { status: 400 });
    }

    const threadResult = await db.query(
      `SELECT t.*,
        s.first_name AS student_first_name,
        s.last_name AS student_last_name,
        s.admission_number,
        c.name AS class_name,
        sec.name AS section_name,
        st.first_name || ' ' || st.last_name AS teacher_name,
        (
          SELECT sub.name FROM teacher_assignments ta
          LEFT JOIN subjects sub ON ta.subject_id = sub.id
          WHERE ta.staff_id = t.teacher_staff_id
            AND ta.class_id = s.class_id
            AND (ta.section_id IS NULL OR ta.section_id = s.section_id)
          ORDER BY ta.is_class_teacher DESC, sub.name NULLS LAST
          LIMIT 1
        ) AS teacher_subject
       FROM parent_message_threads t
       JOIN students s ON t.student_id = s.id
       JOIN staff st ON t.teacher_staff_id = st.id
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN sections sec ON s.section_id = sec.id
       WHERE t.id = $1 AND t.student_id = $2`,
      [threadId, studentId],
    );

    if (!threadResult.rows.length) {
      return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 });
    }

    const messages = await db.query(
      `SELECT p.*,
        COALESCE(u.full_name, sg.name, s.parent_name, 'Parent') AS sender_name
       FROM parent_message_posts p
       LEFT JOIN users u ON p.sender_user_id = u.id
       JOIN parent_message_threads t ON t.id = p.thread_id
       JOIN students s ON t.student_id = s.id
       LEFT JOIN LATERAL (
         SELECT name FROM student_guardians
         WHERE student_id = s.id AND is_primary_contact = true
         ORDER BY id LIMIT 1
       ) sg ON true
       WHERE p.thread_id = $1
       ORDER BY p.created_at ASC`,
      [threadId],
    );

    await db.query(
      `UPDATE parent_message_posts
       SET read_at = CURRENT_TIMESTAMP
       WHERE thread_id = $1 AND sender_role = 'teacher' AND read_at IS NULL`,
      [threadId],
    );

    return NextResponse.json({
      success: true,
      data: {
        thread: threadResult.rows[0],
        messages: messages.rows,
      },
    });
  } catch (error) {
    console.error('Parent message thread GET:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch conversation' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    const studentIdParam = request.nextUrl.searchParams.get('studentId');
    if (!studentIdParam) {
      return NextResponse.json(
        { success: false, error: 'Student ID is required' },
        { status: 400 },
      );
    }

    const studentId = parseStudentIdParam(studentIdParam);
    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Invalid student id' }, { status: 400 });
    }

    const auth = requireParentStudentAccess(request, studentId);
    if (auth instanceof NextResponse) return auth;

    await ensureTeacherSchema(db);
    await ensureTeacherMessagesSchema(db);

    const threadId = parseInt(params.id, 10);
    if (Number.isNaN(threadId)) {
      return NextResponse.json({ success: false, error: 'Invalid thread id' }, { status: 400 });
    }

    const body = await request.json();
    const { message } = body;
    if (!message?.trim()) {
      return NextResponse.json({ success: false, error: 'message is required' }, { status: 400 });
    }

    const thread = await db.query(
      'SELECT id FROM parent_message_threads WHERE id = $1 AND student_id = $2',
      [threadId, studentId],
    );
    if (!thread.rows.length) {
      return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 });
    }

    const post = await db.query(
      `INSERT INTO parent_message_posts (thread_id, sender_user_id, sender_role, body)
       VALUES ($1, NULL, 'parent', $2)
       RETURNING *`,
      [threadId, message.trim()],
    );

    await db.query(
      'UPDATE parent_message_threads SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1',
      [threadId],
    );

    return NextResponse.json({ success: true, data: post.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Parent message thread POST:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 },
    );
  }
}
