import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureClassSubjectsSchema } from '@/lib/ensure-class-subjects-schema';

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureClassSubjectsSchema(db);
    const body = await request.json();
    const subjectId = parseInt(String(body.subject_id), 10);
    const classIds = body.class_ids as number[] | undefined;

    if (!subjectId || !Array.isArray(classIds)) {
      return NextResponse.json(
        { success: false, error: 'subject_id and class_ids array are required' },
        { status: 400 },
      );
    }

    const uniqueClassIds = [...new Set(classIds.map((id) => parseInt(String(id), 10)).filter(Boolean))];

    if (uniqueClassIds.length > 0) {
      const clashes = await db.query<{ class_name: string }>(
        `SELECT DISTINCT c.name AS class_name
         FROM class_subjects cs
         JOIN classes c ON c.id = cs.class_id
         JOIN subjects existing ON existing.id = cs.subject_id
         JOIN subjects incoming ON incoming.id = $1
         WHERE cs.class_id = ANY($2::int[])
           AND cs.subject_id <> $1
           AND LOWER(TRIM(existing.name)) = LOWER(TRIM(incoming.name))`,
        [subjectId, uniqueClassIds],
      );
      if (clashes.rows.length > 0) {
        const names = clashes.rows.map((row) => row.class_name).join(', ');
        return NextResponse.json(
          { success: false, error: `This subject is already on ${names}.` },
          { status: 400 },
        );
      }
    }

    await db.query('BEGIN');
    try {
      await db.query('DELETE FROM class_subjects WHERE subject_id = $1', [subjectId]);

      for (const classId of uniqueClassIds) {
        await db.query(
          `INSERT INTO class_subjects (class_id, subject_id)
           VALUES ($1, $2)
           ON CONFLICT (class_id, subject_id) DO NOTHING`,
          [classId, subjectId],
        );
      }

      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: `Subject assigned to ${uniqueClassIds.length} class(es)`,
    });
  } catch (error: unknown) {
    console.error('Error assigning subject to classes:', error);
    const message = error instanceof Error ? error.message : 'Failed to save class assignments';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
