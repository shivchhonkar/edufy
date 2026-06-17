import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { requireStudentFromParams } from '@/lib/require-student-api';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    const authResult = requireStudentFromParams(request, params.id);
    if (authResult instanceof NextResponse) return authResult;
    const { studentId } = authResult;

    const result = await db.query(
      `SELECT id, relation_type, name, mobile, alternate_mobile, email,
              occupation, is_primary_contact
       FROM student_guardians
       WHERE student_id = $1
       ORDER BY is_primary_contact DESC,
         CASE relation_type WHEN 'father' THEN 1 WHEN 'mother' THEN 2 ELSE 3 END`,
      [studentId]
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching guardians:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch guardians' },
      { status: 500 }
    );
  }
}
