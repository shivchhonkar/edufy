import { NextRequest, NextResponse } from 'next/server';
import { requireExamOps } from '@/lib/exam-operations-utils';
import { invalidateGradingScaleCache } from '@/services/exams/grading-engine';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireExamOps(request);
    if (auth instanceof NextResponse) return auth;
    const result = await auth.db.query(
      `SELECT * FROM grading_config ORDER BY sort_order DESC, min_percentage DESC`
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error listing grades:', error);
    return NextResponse.json({ success: false, error: 'Failed to load grade master' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireExamOps(request);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const grade = String(body.grade || '').trim().toUpperCase();
    const min = parseFloat(String(body.min_percentage ?? ''));
    const max = parseFloat(String(body.max_percentage ?? ''));
    if (!grade || Number.isNaN(min) || Number.isNaN(max)) {
      return NextResponse.json({ success: false, error: 'Grade and percentage range are required' }, { status: 400 });
    }

    const result = await auth.db.query(
      `INSERT INTO grading_config (min_percentage, max_percentage, grade, grade_point, remarks, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        min,
        max,
        grade,
        body.grade_point != null ? parseFloat(String(body.grade_point)) : null,
        body.remarks || null,
        parseInt(String(body.sort_order ?? 0), 10) || 0,
        body.is_active !== false,
      ]
    );
    invalidateGradingScaleCache();
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating grade:', error);
    return NextResponse.json({ success: false, error: 'Failed to create grade' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireExamOps(request);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const id = Number(body.id);
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const result = await auth.db.query(
      `UPDATE grading_config
       SET min_percentage = COALESCE($1, min_percentage),
           max_percentage = COALESCE($2, max_percentage),
           grade = COALESCE($3, grade),
           grade_point = COALESCE($4, grade_point),
           remarks = COALESCE($5, remarks),
           sort_order = COALESCE($6, sort_order),
           is_active = COALESCE($7, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [
        body.min_percentage != null ? parseFloat(String(body.min_percentage)) : null,
        body.max_percentage != null ? parseFloat(String(body.max_percentage)) : null,
        body.grade != null ? String(body.grade).trim().toUpperCase() : null,
        body.grade_point != null ? parseFloat(String(body.grade_point)) : null,
        body.remarks != null ? String(body.remarks) : null,
        body.sort_order != null ? parseInt(String(body.sort_order), 10) : null,
        body.is_active == null ? null : Boolean(body.is_active),
        id,
      ]
    );
    if (!result.rows[0]) {
      return NextResponse.json({ success: false, error: 'Grade not found' }, { status: 404 });
    }
    invalidateGradingScaleCache();
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating grade:', error);
    return NextResponse.json({ success: false, error: 'Failed to update grade' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireExamOps(request);
    if (auth instanceof NextResponse) return auth;
    const id = Number(request.nextUrl.searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }
    await auth.db.query(`DELETE FROM grading_config WHERE id = $1`, [id]);
    invalidateGradingScaleCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting grade:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete grade' }, { status: 500 });
  }
}
