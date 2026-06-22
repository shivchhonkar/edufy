import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
// PUT - Update submission (submit homework or grade)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const { id } = params;
    const body = await request.json();
    const {
      submission_text,
      submission_file,
      marks_obtained,
      feedback,
      graded_by,
      status,
    } = body;

    let queryText = 'UPDATE homework_submissions SET ';
    const queryParams: any[] = [];
    let paramCount = 0;
    const updates: string[] = [];

    // Student submission
    if (submission_text !== undefined) {
      paramCount++;
      updates.push(`submission_text = $${paramCount}`);
      queryParams.push(submission_text);
    }

    if (submission_file !== undefined) {
      paramCount++;
      updates.push(`submission_file = $${paramCount}`);
      queryParams.push(submission_file);
    }

    if (status === 'submitted' && submission_text) {
      paramCount++;
      updates.push(`submitted_at = $${paramCount}`);
      queryParams.push(new Date().toISOString());
      
      paramCount++;
      updates.push(`status = $${paramCount}`);
      queryParams.push('submitted');
    }

    // Teacher grading
    if (marks_obtained !== undefined) {
      paramCount++;
      updates.push(`marks_obtained = $${paramCount}`);
      queryParams.push(marks_obtained);
    }

    if (feedback !== undefined) {
      paramCount++;
      updates.push(`feedback = $${paramCount}`);
      queryParams.push(feedback);
    }

    if (graded_by) {
      paramCount++;
      updates.push(`graded_by = $${paramCount}`);
      queryParams.push(graded_by);
      
      paramCount++;
      updates.push(`graded_at = $${paramCount}`);
      queryParams.push(new Date().toISOString());
      
      paramCount++;
      updates.push(`status = $${paramCount}`);
      queryParams.push('graded');
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    paramCount++;
    updates.push(`updated_at = $${paramCount}`);
    queryParams.push(new Date().toISOString());

    queryText += updates.join(', ');
    paramCount++;
    queryText += ` WHERE id = $${paramCount} RETURNING *`;
    queryParams.push(id);

    const result = await db.query(queryText, queryParams);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Submission not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: graded_by ? 'Submission graded successfully' : 'Homework submitted successfully',
    });
  } catch (error: any) {
    console.error('Error updating submission:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


























































