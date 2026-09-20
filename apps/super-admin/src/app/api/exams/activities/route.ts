import { NextRequest, NextResponse } from 'next/server';
import { requireExamOps } from '@/lib/exam-operations-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireExamOps(request);
    if (auth instanceof NextResponse) return auth;
    const result = await auth.db.query(
      `SELECT * FROM exam_activity_masters ORDER BY sort_order, name`
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error listing exam activities:', error);
    return NextResponse.json({ success: false, error: 'Failed to load activities' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireExamOps(request);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Activity name is required' }, { status: 400 });
    }
    const result = await auth.db.query(
      `INSERT INTO exam_activity_masters (name, category, description, grade_type, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name,
        body.category || 'co-scholastic',
        body.description || null,
        body.grade_type || 'letter',
        body.is_active !== false,
        parseInt(String(body.sort_order ?? 0), 10) || 0,
      ]
    );
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json({ success: false, error: 'Failed to create activity' }, { status: 500 });
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
      `UPDATE exam_activity_masters
       SET name = COALESCE($1, name),
           category = COALESCE($2, category),
           description = COALESCE($3, description),
           is_active = COALESCE($4, is_active),
           sort_order = COALESCE($5, sort_order),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [
        body.name != null ? String(body.name).trim() : null,
        body.category != null ? String(body.category) : null,
        body.description != null ? String(body.description) : null,
        body.is_active == null ? null : Boolean(body.is_active),
        body.sort_order != null ? parseInt(String(body.sort_order), 10) : null,
        id,
      ]
    );
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating activity:', error);
    return NextResponse.json({ success: false, error: 'Failed to update activity' }, { status: 500 });
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
    await auth.db.query(`DELETE FROM exam_activity_masters WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting activity:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete activity' }, { status: 500 });
  }
}
