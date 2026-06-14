import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getParentSession, requireParentStudentAccess } from '@/lib/parent-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { submission_id, submission_text } = body;

    if (!submission_id) {
      return NextResponse.json(
        { success: false, error: 'Submission ID is required' },
        { status: 400 }
      );
    }

    const session = getParentSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const ownership = await pool.query(
      'SELECT student_id FROM homework_submissions WHERE id = $1',
      [submission_id]
    );
    if (ownership.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Submission not found' }, { status: 404 });
    }

    const studentId = ownership.rows[0].student_id as number;
    const auth = requireParentStudentAccess(request, studentId);
    if (auth instanceof NextResponse) return auth;

    const result = await pool.query(
      `UPDATE homework_submissions 
       SET submission_text = $1,
           submitted_at = CURRENT_TIMESTAMP,
           status = 'submitted',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [submission_text, submission_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Submission not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Homework submitted successfully',
    });
  } catch (error: any) {
    console.error('Error submitting homework:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


























































