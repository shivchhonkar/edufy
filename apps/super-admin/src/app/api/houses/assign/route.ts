import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureHousesSchema } from '@/lib/ensure-houses-schema';
import { assignStudentsToHouse } from '@/lib/house-utils';

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    await ensureHousesSchema(db);

    const body = await request.json();
    const studentIds = Array.isArray(body.student_ids)
      ? body.student_ids.map((id: unknown) => parseInt(String(id), 10)).filter((id: number) => id > 0)
      : [];

    if (studentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one valid student_id is required' },
        { status: 400 }
      );
    }

    let houseId: number | null = null;
    if (body.house_id !== null && body.house_id !== undefined && body.house_id !== '') {
      houseId = parseInt(String(body.house_id), 10);
      if (!houseId || Number.isNaN(houseId)) {
        return NextResponse.json({ success: false, error: 'Invalid house_id' }, { status: 400 });
      }

      const houseCheck = await db.query('SELECT id FROM school_houses WHERE id = $1', [houseId]);
      if (!houseCheck.rows[0]) {
        return NextResponse.json({ success: false, error: 'House not found' }, { status: 404 });
      }
    }

    const result = await assignStudentsToHouse(db, studentIds, houseId);

    return NextResponse.json({
      success: true,
      data: {
        assigned_count: studentIds.length,
        enrollments_updated: result.updated,
        enrollments_created: result.created,
        house_id: houseId,
      },
    });
  } catch (error) {
    console.error('Error assigning students to house:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to assign students to house' },
      { status: 500 }
    );
  }
}
