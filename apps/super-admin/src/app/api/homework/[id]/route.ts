import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
// GET - Fetch single homework with submissions
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const { id } = params;
    const homeworkResult = await db.query(
      `SELECT 
        h.*,
        c.name as class_name,
        s.name as subject_name,
        u.full_name as assigned_by_name
      FROM homework h
      LEFT JOIN classes c ON h.class_id = c.id
      LEFT JOIN subjects s ON h.subject_id = s.id
      LEFT JOIN users u ON h.assigned_by = u.id
      WHERE h.id = $1`,
      [id]
    );

    if (homeworkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Homework not found' },
        { status: 404 }
      );
    }

    // Get submissions
    const submissionsResult = await db.query(
      `SELECT 
        hs.*,
        st.first_name,
        st.last_name,
        st.admission_number,
        st.roll_number
      FROM homework_submissions hs
      JOIN students st ON hs.student_id = st.id
      WHERE hs.homework_id = $1
      ORDER BY hs.submitted_at DESC NULLS LAST, st.roll_number`,
      [id]
    );

    return NextResponse.json({
      success: true,
      data: {
        ...homeworkResult.rows[0],
        submissions: submissionsResult.rows,
      },
    });
  } catch (error: any) {
    console.error('Error fetching homework:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update homework
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const { id } = params;
    const body = await request.json();
    const {
      title,
      description,
      due_date,
      total_marks,
      attachments,
      status,
    } = body;

    const result = await db.query(
      `UPDATE homework SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        due_date = COALESCE($3, due_date),
        total_marks = COALESCE($4, total_marks),
        attachments = COALESCE($5, attachments),
        status = COALESCE($6, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *`,
      [
        title,
        description,
        due_date,
        total_marks,
        attachments ? JSON.stringify(attachments) : null,
        status,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Homework not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Homework updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating homework:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete homework
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const { id } = params;

    // Delete submissions first
    await db.query('DELETE FROM homework_submissions WHERE homework_id = $1', [id]);

    // Delete homework
    const result = await db.query('DELETE FROM homework WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Homework not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Homework deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting homework:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


























































