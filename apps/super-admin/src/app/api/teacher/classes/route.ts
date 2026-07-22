import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError, type RequestDb } from '@/lib/request-db';
import {
  requireTeacherAuth,
  resolveStaffId,
  ensureTeacherSchema,
} from '@/lib/teacher-auth';

type AssignmentRow = {
  id: number;
  class_id: number;
  section_id: number | null;
  subject_id: number | null;
  academic_year: string;
  is_class_teacher: boolean;
  class_name: string | null;
  section_name: string | null;
  subject_name: string | null;
};

async function countStudents(
  db: RequestDb,
  classId: number,
  sectionId: number | null,
): Promise<number> {
  const result = sectionId
    ? await db.query(
        `SELECT COUNT(*) AS count FROM students WHERE class_id = $1 AND section_id = $2 AND status = 'active'`,
        [classId, sectionId],
      )
    : await db.query(
        `SELECT COUNT(*) AS count FROM students WHERE class_id = $1 AND status = 'active'`,
        [classId],
      );

  return Number(result.rows[0]?.count ?? 0);
}

async function countTodayAttendance(
  db: RequestDb,
  classId: number,
  sectionId: number | null,
  date: string,
): Promise<{ present: number; absent: number; leave: number }> {
  const sectionClause = sectionId ? ' AND s.section_id = $3' : '';
  const params: (string | number)[] = [classId, date];
  if (sectionId) params.push(sectionId);

  const result = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE a.status = 'present') AS present_count,
       COUNT(*) FILTER (WHERE a.status = 'absent') AS absent_count,
       COUNT(*) FILTER (WHERE a.status IN ('on_leave', 'leave')) AS leave_count
     FROM attendance a
     JOIN students s ON s.id = a.student_id
     WHERE s.class_id = $1 AND a.date = $2${sectionClause}`,
    params,
  );

  const row = result.rows[0] ?? {};
  return {
    present: Number(row.present_count ?? 0),
    absent: Number(row.absent_count ?? 0),
    leave: Number(row.leave_count ?? 0),
  };
}

async function countPendingHomework(
  db: RequestDb,
  classId: number,
  userId: number,
): Promise<number> {
  try {
    const result = await db.query(
      `SELECT COUNT(*) AS count
       FROM homework
       WHERE class_id = $1 AND assigned_by = $2 AND due_date >= CURRENT_DATE`,
      [classId, userId],
    );
    return Number(result.rows[0]?.count ?? 0);
  } catch {
    return 0;
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireTeacherAuth(request);
    if (auth instanceof NextResponse) return auth;

    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    await ensureTeacherSchema(db);

    const staffId = await resolveStaffId(db, auth.user.id);
    if (!staffId) {
      return NextResponse.json({ success: false, error: 'No staff profile linked' }, { status: 404 });
    }

    const today = new Date().toISOString().split('T')[0];

    const assignmentsResult = await db.query<AssignmentRow>(
      `SELECT ta.id, ta.class_id, ta.section_id, ta.subject_id, ta.academic_year, ta.is_class_teacher,
              c.name AS class_name, sec.name AS section_name, sub.name AS subject_name
       FROM teacher_assignments ta
       LEFT JOIN classes c ON ta.class_id = c.id
       LEFT JOIN sections sec ON ta.section_id = sec.id
       LEFT JOIN subjects sub ON ta.subject_id = sub.id
       WHERE ta.staff_id = $1
       ORDER BY c.name, sec.name NULLS FIRST, sub.name NULLS LAST`,
      [staffId],
    );

    const classes = await Promise.all(
      assignmentsResult.rows.map(async (row) => {
        const studentCount = await countStudents(db, row.class_id, row.section_id);
        const attendance = await countTodayAttendance(db, row.class_id, row.section_id, today);
        const pendingAssignments = await countPendingHomework(db, row.class_id, auth.user.id);

        const presentPct =
          studentCount > 0 ? Math.round((attendance.present / studentCount) * 1000) / 10 : 0;
        const absentPct =
          studentCount > 0 ? Math.round((attendance.absent / studentCount) * 1000) / 10 : 0;

        return {
          id: row.id,
          class_id: row.class_id,
          section_id: row.section_id,
          subject_id: row.subject_id,
          class_name: row.class_name,
          section_name: row.section_name,
          subject_name: row.subject_name,
          academic_year: row.academic_year,
          is_class_teacher: row.is_class_teacher,
          student_count: studentCount,
          present_today: attendance.present,
          absent_today: attendance.absent,
          leave_today: attendance.leave,
          present_percentage: presentPct,
          absent_percentage: absentPct,
          pending_assignments: pendingAssignments,
        };
      }),
    );

    const uniqueStudentResult = await db.query(
      `SELECT COUNT(DISTINCT s.id) AS count
       FROM students s
       JOIN teacher_assignments ta ON ta.staff_id = $1 AND ta.class_id = s.class_id
         AND (ta.section_id IS NULL OR ta.section_id = s.section_id)
       WHERE s.status = 'active'`,
      [staffId],
    );

    const totalHomework = classes.reduce((sum, item) => sum + item.pending_assignments, 0);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total_classes: classes.length,
          total_students: Number(uniqueStudentResult.rows[0]?.count ?? 0),
          total_assignments: totalHomework,
          todays_classes: classes.length,
        },
        classes,
      },
    });
  } catch (error) {
    console.error('Teacher classes overview error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load classes overview' },
      { status: 500 },
    );
  }
}
