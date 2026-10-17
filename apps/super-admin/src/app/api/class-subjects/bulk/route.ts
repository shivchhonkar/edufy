import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureClassSubjectsSchema } from '@/lib/ensure-class-subjects-schema';

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureClassSubjectsSchema(db);
    const body = await request.json();
    const { class_id, subject_ids } = body;

    if (!class_id || !subject_ids || !Array.isArray(subject_ids)) {
      return NextResponse.json(
        { success: false, error: 'Class ID and Subject IDs array are required' },
        { status: 400 },
      );
    }

    const uniqueIds = [...new Set(subject_ids.map((id: unknown) => parseInt(String(id), 10)).filter(Boolean))];

    if (uniqueIds.length > 0) {
      const duplicateNames = await db.query<{ name: string }>(
        `SELECT LOWER(TRIM(name)) AS name
         FROM subjects
         WHERE id = ANY($1::int[])
         GROUP BY LOWER(TRIM(name))
         HAVING COUNT(*) > 1`,
        [uniqueIds],
      );
      if (duplicateNames.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'A class cannot have the same subject more than once.' },
          { status: 400 },
        );
      }
    }

    await db.query('BEGIN');
    try {
      await db.query('DELETE FROM class_subjects WHERE class_id = $1', [class_id]);
      for (const subjectId of uniqueIds) {
        await db.query(
          `INSERT INTO class_subjects (class_id, subject_id)
           VALUES ($1, $2)
           ON CONFLICT (class_id, subject_id) DO NOTHING`,
          [class_id, subjectId],
        );
      }
      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: `${uniqueIds.length} subjects assigned to class successfully`,
    });
  } catch (error: unknown) {
    console.error('Error bulk assigning subjects:', error);
    const message = error instanceof Error ? error.message : 'Failed to assign subjects';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}


























































