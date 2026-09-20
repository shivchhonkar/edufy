import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureStudentOperationsSchema } from '@/lib/ensure-student-operations-schema';
import {
  REGISTRATION_WRITE_COLUMNS,
  registrationWriteValues,
} from '@/lib/registration-write-values';

function parseId(id: string) {
  const value = parseInt(id, 10);
  return Number.isFinite(value) ? value : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthenticatedDb(request);
    if (auth instanceof NextResponse) return auth;
    const id = parseId(params.id);
    if (!id) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

    await ensureStudentOperationsSchema(auth.db);
    const result = await auth.db.query(
      `SELECT r.*, c.name AS class_name
       FROM student_registrations r
       LEFT JOIN classes c ON r.class_id = c.id
       WHERE r.id = $1`,
      [id]
    );
    if (!result.rows[0]) {
      return NextResponse.json({ success: false, error: 'Registration not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching registration:', error);
    return NextResponse.json({ success: false, error: 'Failed to load registration' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthenticatedDb(request);
    if (auth instanceof NextResponse) return auth;
    const id = parseId(params.id);
    if (!id) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

    await ensureStudentOperationsSchema(auth.db);
    const body = await request.json();
    const values = registrationWriteValues(body);

    if (body.status && !['active', 'admitted', 'cancelled'].includes(body.status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }

    if (!values.student_first_name || !values.parent_name || !values.parent_phone) {
      return NextResponse.json(
        { success: false, error: 'Student name, father name, and father phone are required' },
        { status: 400 }
      );
    }

    const assignments = REGISTRATION_WRITE_COLUMNS.map((key, index) => `${key} = $${index + 1}`);
    if (body.status) {
      assignments.push(`status = $${assignments.length + 1}`);
    }
    assignments.push('updated_at = CURRENT_TIMESTAMP');

    const params: unknown[] = REGISTRATION_WRITE_COLUMNS.map((key) => values[key]);
    if (body.status) params.push(body.status);
    params.push(id);

    const result = await auth.db.query(
      `UPDATE student_registrations SET ${assignments.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );

    if (!result.rows[0]) {
      return NextResponse.json({ success: false, error: 'Registration not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating registration:', error);
    return NextResponse.json({ success: false, error: 'Failed to update registration' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthenticatedDb(request);
    if (auth instanceof NextResponse) return auth;
    const id = parseId(params.id);
    if (!id) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

    await ensureStudentOperationsSchema(auth.db);
    const existing = await auth.db.query<{ status: string }>(
      'SELECT status FROM student_registrations WHERE id = $1',
      [id]
    );
    if (!existing.rows[0]) {
      return NextResponse.json({ success: false, error: 'Registration not found' }, { status: 404 });
    }
    if (existing.rows[0].status === 'admitted') {
      return NextResponse.json(
        { success: false, error: 'Admitted registrations cannot be deleted' },
        { status: 400 }
      );
    }

    await auth.db.query('DELETE FROM student_registrations WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting registration:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete registration' }, { status: 500 });
  }
}
