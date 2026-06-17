import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { requireStudentFromQuery } from '@/lib/require-student-api';

export async function GET(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    const authResult = requireStudentFromQuery(request);
    if (authResult instanceof NextResponse) return authResult;
    const { studentId } = authResult;

    const result = await db.query(
      `SELECT 
        er.*,
        e.name as exam_name,
        e.exam_type,
        e.exam_date,
        e.total_marks,
        e.passing_marks,
        s.name as subject_name,
        c.name as class_name,
        ROUND((er.marks_obtained / e.total_marks) * 100, 2) as percentage,
        CASE 
          WHEN er.marks_obtained >= e.passing_marks THEN 'Pass'
          ELSE 'Fail'
        END as result_status
      FROM exam_results er
      JOIN exams e ON er.exam_id = e.id
      JOIN subjects s ON e.subject_id = s.id
      JOIN classes c ON e.class_id = c.id
      WHERE er.student_id = $1
      ORDER BY e.exam_date DESC, e.created_at DESC`,
      [studentId]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching student results:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


























































