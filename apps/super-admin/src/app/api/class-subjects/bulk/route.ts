import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
// POST - Bulk assign subjects to a class
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const { class_id, subject_ids } = body;

    if (!class_id || !subject_ids || !Array.isArray(subject_ids)) {
      return NextResponse.json(
        { success: false, error: 'Class ID and Subject IDs array are required' },
        { status: 400 }
      );
    }

    // Delete existing assignments
    await db.query('DELETE FROM class_subjects WHERE class_id = $1', [class_id]);

    // Insert new assignments
    const insertPromises = subject_ids.map((subject_id: number) =>
      db.query(
        'INSERT INTO class_subjects (class_id, subject_id) VALUES ($1, $2)',
        [class_id, subject_id]
      )
    );

    await Promise.all(insertPromises);

    return NextResponse.json({
      success: true,
      message: `${subject_ids.length} subjects assigned to class successfully`,
    });
  } catch (error: any) {
    console.error('Error bulk assigning subjects:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


























































