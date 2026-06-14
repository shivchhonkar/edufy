import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireStudentFromParams } from '@/lib/require-student-api';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = requireStudentFromParams(request, params.id);
    if (authResult instanceof NextResponse) return authResult;
    const { studentId } = authResult;

    const result = await query(
      `SELECT e.*, c.name AS class_name, sec.name AS section_name
       FROM student_enrollments e
       LEFT JOIN classes c ON e.class_id = c.id
       LEFT JOIN sections sec ON e.section_id = sec.id
       WHERE e.student_id = $1
       ORDER BY e.is_current DESC, e.created_at DESC, e.id DESC`,
      [studentId]
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch enrollments' },
      { status: 500 }
    );
  }
}
