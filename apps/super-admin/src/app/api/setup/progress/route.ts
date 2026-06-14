import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureSystemSettings } from '@/lib/ensure-system-settings';

const SETUP_STEPS = [
  'school_profile',
  'academic_year',
  'classes_sections',
  'subjects',
  'fee_setup',
] as const;

async function ensureProgressTable(db: Awaited<ReturnType<typeof getRequestDb>>['db']) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS school_setup_progress (
      id SERIAL PRIMARY KEY,
      current_step INTEGER DEFAULT 1,
      completed_steps JSONB DEFAULT '[]'::jsonb,
      is_complete BOOLEAN DEFAULT false,
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureProgressTable(db);
    await ensureSystemSettings(db);

    let progress = await db.query(
      'SELECT * FROM school_setup_progress ORDER BY id LIMIT 1'
    );

    if (progress.rows.length === 0) {
      progress = await db.query(
        `INSERT INTO school_setup_progress (current_step, completed_steps)
         VALUES (1, '[]'::jsonb) RETURNING *`
      );
    }

    const [settings, years, classes, subjects, feeStructures] = await Promise.all([
      db.query('SELECT school_name FROM system_settings LIMIT 1'),
      db.query('SELECT COUNT(*)::int AS count FROM academic_years').catch(() => ({ rows: [{ count: 0 }] })),
      db.query('SELECT COUNT(*)::int AS count FROM classes').catch(() => ({ rows: [{ count: 0 }] })),
      db.query('SELECT COUNT(*)::int AS count FROM subjects').catch(() => ({ rows: [{ count: 0 }] })),
      db.query('SELECT COUNT(*)::int AS count FROM fee_structures').catch(() => ({ rows: [{ count: 0 }] })),
    ]);

    const checklist = {
      school_profile: !!(settings.rows[0]?.school_name),
      academic_year: (years.rows[0]?.count ?? 0) > 0,
      classes_sections: (classes.rows[0]?.count ?? 0) > 0,
      subjects: (subjects.rows[0]?.count ?? 0) > 0,
      fee_setup: (feeStructures.rows[0]?.count ?? 0) > 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        progress: progress.rows[0],
        steps: SETUP_STEPS,
        checklist,
      },
    });
  } catch (error) {
    console.error('Setup progress error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch setup progress' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureProgressTable(db);
    const body = await request.json();
    const { current_step, completed_step, mark_complete } = body;

    const existing = await db.query(
      'SELECT * FROM school_setup_progress ORDER BY id LIMIT 1'
    );
    const row = existing.rows[0];
    if (!row) {
      return NextResponse.json({ success: false, error: 'No progress row' }, { status: 404 });
    }

    let completedSteps: string[] = Array.isArray(row.completed_steps)
      ? row.completed_steps
      : JSON.parse(row.completed_steps || '[]');

    if (completed_step && !completedSteps.includes(completed_step)) {
      completedSteps = [...completedSteps, completed_step];
    }

    const result = await db.query(
      `UPDATE school_setup_progress SET
        current_step = COALESCE($1, current_step),
        completed_steps = $2::jsonb,
        is_complete = COALESCE($3, is_complete),
        completed_at = CASE WHEN $3 = true THEN CURRENT_TIMESTAMP ELSE completed_at END,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [
        current_step ?? null,
        JSON.stringify(completedSteps),
        mark_complete ?? null,
        row.id,
      ]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Setup progress update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update setup progress' },
      { status: 500 }
    );
  }
}
