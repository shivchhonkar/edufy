import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { ensureTeacherMessagesSchema } from '@/lib/ensure-teacher-messages-schema';
import {
  requireTeacherAuth,
  resolveStaffId,
  teacherHasClassAccess,
  ensureTeacherSchema,
} from '@/lib/teacher-auth';

const THREAD_SELECT = `
  SELECT t.*,
    s.first_name AS student_first_name,
    s.last_name AS student_last_name,
    s.admission_number,
    c.name AS class_name,
    sec.name AS section_name,
    COALESCE(sg.name, s.parent_name) AS parent_name,
    (
      SELECT body FROM parent_message_posts p
      WHERE p.thread_id = t.id
      ORDER BY p.created_at DESC
      LIMIT 1
    ) AS last_message,
    (
      SELECT COUNT(*)::int FROM parent_message_posts p
      WHERE p.thread_id = t.id
        AND p.sender_role = 'parent'
        AND p.read_at IS NULL
    ) AS unread_count
  FROM parent_message_threads t
  JOIN students s ON t.student_id = s.id
  LEFT JOIN classes c ON s.class_id = c.id
  LEFT JOIN sections sec ON s.section_id = sec.id
  LEFT JOIN LATERAL (
    SELECT name FROM student_guardians
    WHERE student_id = s.id AND is_primary_contact = true
    ORDER BY id
    LIMIT 1
  ) sg ON true
  WHERE t.teacher_staff_id = $1
`;

async function verifyStudentAccess(
  db: Parameters<typeof teacherHasClassAccess>[0],
  staffId: number,
  studentId: number,
): Promise<{ ok: boolean; student?: { class_id: number; section_id: number | null } }> {
  const result = await db.query(
    `SELECT s.id, s.class_id, s.section_id
     FROM students s
     WHERE s.id = $1 AND s.status = 'active'`,
    [studentId],
  );
  const student = result.rows[0] as
    | { id: number; class_id: number; section_id: number | null }
    | undefined;
  if (!student) return { ok: false };

  const hasAccess = await teacherHasClassAccess(db, staffId, student.class_id, student.section_id);
  return hasAccess ? { ok: true, student } : { ok: false };
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireTeacherAuth(request);
    if (auth instanceof NextResponse) return auth;

    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    await ensureTeacherSchema(db);
    await ensureTeacherMessagesSchema(db);

    const staffId = await resolveStaffId(db, auth.user.id);
    if (!staffId) {
      return NextResponse.json({ success: false, error: 'No staff profile linked' }, { status: 404 });
    }

    const search = request.nextUrl.searchParams.get('search');
    const params: unknown[] = [staffId];
    let query = THREAD_SELECT;

    if (search?.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (
        s.first_name ILIKE $${params.length}
        OR s.last_name ILIKE $${params.length}
        OR s.admission_number ILIKE $${params.length}
        OR t.subject ILIKE $${params.length}
      )`;
    }

    query += ' ORDER BY t.last_message_at DESC, t.id DESC';

    const result = await db.query(query, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Teacher parent messages GET:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch messages' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireTeacherAuth(request);
    if (auth instanceof NextResponse) return auth;

    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    await ensureTeacherSchema(db);
    await ensureTeacherMessagesSchema(db);

    const staffId = await resolveStaffId(db, auth.user.id);
    if (!staffId) {
      return NextResponse.json({ success: false, error: 'No staff profile linked' }, { status: 404 });
    }

    const body = await request.json();
    const { student_id, subject, message } = body;

    if (!student_id || !subject?.trim() || !message?.trim()) {
      return NextResponse.json(
        { success: false, error: 'student_id, subject, and message are required' },
        { status: 400 },
      );
    }

    const access = await verifyStudentAccess(db, staffId, parseInt(String(student_id), 10));
    if (!access.ok) {
      return NextResponse.json(
        { success: false, error: 'Student not found or access denied' },
        { status: 403 },
      );
    }

    await db.query('BEGIN');
    try {
      let thread = await db.query(
        `SELECT * FROM parent_message_threads
         WHERE student_id = $1 AND teacher_staff_id = $2 AND subject = $3`,
        [student_id, staffId, subject.trim()],
      );

      if (!thread.rows.length) {
        thread = await db.query(
          `INSERT INTO parent_message_threads (student_id, teacher_staff_id, subject)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [student_id, staffId, subject.trim()],
        );
      }

      const threadRow = thread.rows[0] as { id: number };

      const post = await db.query(
        `INSERT INTO parent_message_posts (thread_id, sender_user_id, sender_role, body)
         VALUES ($1, $2, 'teacher', $3)
         RETURNING *`,
        [threadRow.id, auth.user.id, message.trim()],
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
    console.error('Teacher parent messages POST:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 },
    );
  }
}
