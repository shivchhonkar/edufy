import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { requireStudentFromQuery } from '@/lib/parent-portal/require-student-api';

export async function GET(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    const authResult = requireStudentFromQuery(request);
    if (authResult instanceof NextResponse) return authResult;
    const { studentId } = authResult;

    const studentResult = await db.query(
      `SELECT COALESCE(e.class_id, s.class_id) AS class_id
       FROM students s
       LEFT JOIN student_enrollments e ON e.student_id = s.id AND e.is_current = true
       WHERE s.id = $1`,
      [studentId]
    );

    console.log('Student query result:', studentResult.rows);

    if (studentResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    const classId = studentResult.rows[0].class_id;
    console.log('Student class_id:', classId);

    // Get homework for student's class
    const homeworkResult = await db.query(
      `SELECT 
        h.*,
        s.name as subject_name,
        c.name as class_name,
        u.full_name as assigned_by_name,
        hs.id as submission_id,
        hs.submission_text,
        hs.submission_file,
        hs.submitted_at,
        hs.marks_obtained,
        hs.feedback,
        hs.status as submission_status,
        hs.graded_at
      FROM homework h
      LEFT JOIN subjects s ON h.subject_id = s.id
      LEFT JOIN classes c ON h.class_id = c.id
      LEFT JOIN users u ON h.assigned_by = u.id
      LEFT JOIN homework_submissions hs ON hs.homework_id = h.id AND hs.student_id = $1
      WHERE h.class_id = $2
      ORDER BY h.due_date DESC, h.created_at DESC
      LIMIT 50`,
      [studentId, classId]
    );

    console.log('Homework query result count:', homeworkResult.rows.length);
    console.log('Homework data:', JSON.stringify(homeworkResult.rows, null, 2));

    return NextResponse.json({
      success: true,
      data: homeworkResult.rows,
    });
  } catch (error: any) {
    console.error('Error fetching homework:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

