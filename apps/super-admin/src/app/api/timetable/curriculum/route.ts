import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureTimetableSchema } from '@/lib/ensure-timetable-schema';
import { ensureClassSubjectsSchema } from '@/lib/ensure-class-subjects-schema';
import { classNameOrderSql } from '@/lib/class-sort';

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTimetableSchema(db);
    await ensureClassSubjectsSchema(db);

    const classId = request.nextUrl.searchParams.get('class_id');
    if (!classId) {
      return NextResponse.json({ success: false, error: 'class_id is required' }, { status: 400 });
    }

    const cid = parseInt(classId, 10);
    const [requirements, classSubjects, scheduled] = await Promise.all([
      db.query(
        `SELECT csr.*, s.name AS subject_name, s.code AS subject_code
         FROM class_subject_period_requirements csr
         JOIN subjects s ON csr.subject_id = s.id
         WHERE csr.class_id = $1
         ORDER BY s.name`,
        [cid],
      ),
      db.query(
        `SELECT cs.subject_id, s.name AS subject_name, s.code AS subject_code
         FROM class_subjects cs
         JOIN subjects s ON cs.subject_id = s.id
         WHERE cs.class_id = $1
         ORDER BY s.name`,
        [cid],
      ),
      db.query(
        `SELECT subject_id, COUNT(*)::int AS scheduled_periods
         FROM class_timetable
         WHERE class_id = $1 AND section_id IS NULL AND subject_id IS NOT NULL
         GROUP BY subject_id`,
        [cid],
      ),
    ]);

    const scheduledMap = new Map(
      (scheduled.rows as { subject_id: number; scheduled_periods: number }[]).map((row) => [
        row.subject_id,
        row.scheduled_periods,
      ]),
    );

    const requirementMap = new Map(
      (requirements.rows as { subject_id: number; weekly_periods: number; preferred_room: string | null }[]).map(
        (row) => [row.subject_id, row],
      ),
    );

    const subjects = (classSubjects.rows as { subject_id: number; subject_name: string; subject_code: string }[]).map(
      (subject) => {
        const requirement = requirementMap.get(subject.subject_id);
        return {
          subject_id: subject.subject_id,
          subject_name: subject.subject_name,
          subject_code: subject.subject_code,
          weekly_periods: requirement?.weekly_periods ?? 0,
          preferred_room: requirement?.preferred_room ?? '',
          scheduled_periods: scheduledMap.get(subject.subject_id) ?? 0,
        };
      },
    );

    const totalRequired = subjects.reduce((sum, row) => sum + row.weekly_periods, 0);
    const totalScheduled = subjects.reduce((sum, row) => sum + row.scheduled_periods, 0);

    const classResult = await db.query(`SELECT name FROM classes WHERE id = $1`, [cid]);

    return NextResponse.json({
      success: true,
      data: {
        class_id: cid,
        class_name: (classResult.rows[0] as { name: string } | undefined)?.name ?? '',
        subjects,
        totals: {
          weekly_periods: totalRequired,
          scheduled_periods: totalScheduled,
        },
      },
    });
  } catch (error) {
    console.error('Curriculum fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load curriculum allocation' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTimetableSchema(db);
    await ensureClassSubjectsSchema(db);

    const body = await request.json();
    const classId = parseInt(String(body.class_id), 10);
    const subjects = body.subjects as
      | { subject_id: number; weekly_periods: number; preferred_room?: string | null }[]
      | undefined;

    if (!classId || !subjects) {
      return NextResponse.json(
        { success: false, error: 'class_id and subjects are required' },
        { status: 400 },
      );
    }

    await db.query('BEGIN');
    try {
      for (const subject of subjects) {
        await db.query(
          `INSERT INTO class_subject_period_requirements (class_id, subject_id, weekly_periods, preferred_room)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (class_id, subject_id)
           DO UPDATE SET weekly_periods = $3, preferred_room = $4`,
          [
            classId,
            subject.subject_id,
            subject.weekly_periods ?? 0,
            subject.preferred_room?.trim() || null,
          ],
        );
      }
      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Curriculum allocation saved' });
  } catch (error) {
    console.error('Curriculum save error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save curriculum allocation' }, { status: 500 });
  }
}
