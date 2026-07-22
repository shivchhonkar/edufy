import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError, type RequestDb } from '@/lib/request-db';
import { ensureTeacherMessagesSchema } from '@/lib/ensure-teacher-messages-schema';
import { ensureTeacherSchema } from '@/lib/teacher-auth';
import { requireStudentFromQuery } from '@/lib/parent-portal/require-student-api';

const THREAD_SELECT = `
  SELECT t.*,
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
    ) AS teacher_subject,
    (
      SELECT body FROM parent_message_posts p
      WHERE p.thread_id = t.id
      ORDER BY p.created_at DESC
      LIMIT 1
    ) AS last_message,
    (
      SELECT COUNT(*)::int FROM parent_message_posts p
      WHERE p.thread_id = t.id
        AND p.sender_role = 'teacher'
        AND p.read_at IS NULL
    ) AS unread_count
  FROM parent_message_threads t
  JOIN students s ON t.student_id = s.id
  JOIN staff st ON t.teacher_staff_id = st.id
  LEFT JOIN classes c ON s.class_id = c.id
  LEFT JOIN sections sec ON s.section_id = sec.id
  WHERE t.student_id = $1
`;

async function verifyTeacherForStudent(
  db: RequestDb,
  studentId: number,
  teacherStaffId: number,
): Promise<boolean> {
  const result = await db.query(
    `SELECT 1
     FROM students s
     INNER JOIN teacher_assignments ta ON ta.class_id = s.class_id
       AND (ta.section_id IS NULL OR ta.section_id = s.section_id)
     WHERE s.id = $1 AND ta.staff_id = $2 AND s.status = 'active'
     LIMIT 1`,
    [studentId, teacherStaffId],
  );
  return result.rows.length > 0;
}

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

    const search = request.nextUrl.searchParams.get('search');
    const params: unknown[] = [studentId];
    let query = THREAD_SELECT;

    if (search?.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (
        t.subject ILIKE $${params.length}
        OR st.first_name ILIKE $${params.length}
        OR st.last_name ILIKE $${params.length}
      )`;
    }

    query += ' ORDER BY t.last_message_at DESC, t.id DESC';

    const result = await db.query(query, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Parent messages GET:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch messages' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    const authResult = requireStudentFromQuery(request);
    if (authResult instanceof NextResponse) return authResult;
    const { studentId } = authResult;

    await ensureTeacherSchema(db);
    await ensureTeacherMessagesSchema(db);

    const body = await request.json();
    const { teacher_staff_id, subject, message } = body;

    if (!teacher_staff_id || !subject?.trim() || !message?.trim()) {
      return NextResponse.json(
        { success: false, error: 'teacher_staff_id, subject, and message are required' },
        { status: 400 },
      );
    }

    const staffId = parseInt(String(teacher_staff_id), 10);
    if (!Number.isFinite(staffId)) {
      return NextResponse.json({ success: false, error: 'Invalid teacher' }, { status: 400 });
    }

    const allowed = await verifyTeacherForStudent(db, studentId, staffId);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Teacher not assigned to this student' },
        { status: 403 },
      );
    }

    await db.query('BEGIN');
    try {
      let thread = await db.query(
        `SELECT * FROM parent_message_threads
         WHERE student_id = $1 AND teacher_staff_id = $2 AND subject = $3`,
        [studentId, staffId, subject.trim()],
      );

      if (!thread.rows.length) {
        thread = await db.query(
          `INSERT INTO parent_message_threads (student_id, teacher_staff_id, subject)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [studentId, staffId, subject.trim()],
        );
      }

      const threadRow = thread.rows[0] as { id: number };

      const post = await db.query(
        `INSERT INTO parent_message_posts (thread_id, sender_user_id, sender_role, body)
         VALUES ($1, NULL, 'parent', $2)
         RETURNING *`,
        [threadRow.id, message.trim()],
      );

      await db.query(
        'UPDATE parent_message_threads SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1',
        [threadRow.id],
      );

      await db.query('COMMIT');

      return NextResponse.json(
        {
          success: true,
          data: {
            thread: thread.rows[0],
            message: post.rows[0],
          },
        },
        { status: 201 },
      );
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
  } catch (error) {
    console.error('Parent messages POST:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 },
    );
  }
}
