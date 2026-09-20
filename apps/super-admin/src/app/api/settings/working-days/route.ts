import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureSchoolSetupSchema } from '@/lib/ensure-school-setup-schema';
import {
  listClassWorkingDayOverride,
  listSchoolWorkingDays,
  resetClassWorkingDays,
  resolveWorkingDays,
  saveClassWorkingDays,
  saveSchoolWorkingDays,
  type WorkingDay,
} from '@/lib/working-days';

function parseClassId(value: string | null): number | null {
  if (!value) return null;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureSchoolSetupSchema(db);
    const classId = parseClassId(request.nextUrl.searchParams.get('class_id'));
    const schoolDays = await listSchoolWorkingDays(db);

    if (classId) {
      const override = await listClassWorkingDayOverride(db, classId);
      return NextResponse.json({
        success: true,
        data: {
          school_days: schoolDays,
          class_id: classId,
          has_override: override.length > 0,
          working_days: override.length ? override : schoolDays,
        },
      });
    }

    const classes = await db.query<{ id: number; name: string }>(
      `SELECT id, name FROM classes WHERE COALESCE(is_active, true) = true ORDER BY name ASC`,
    );
    const overrideRows = await db.query<{ class_id: number }>(
      'SELECT DISTINCT class_id FROM class_working_days',
    );
    const overrideIds = new Set(overrideRows.rows.map((row) => row.class_id));

    return NextResponse.json({
      success: true,
      data: {
        school_days: schoolDays,
        classes: classes.rows.map((cls) => ({
          id: cls.id,
          name: cls.name,
          has_override: overrideIds.has(cls.id),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching working days:', error);
    return NextResponse.json({ success: false, error: 'Failed to load working days' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const scope = body.scope === 'class' ? 'class' : 'school';
    const days = body.working_days as WorkingDay[] | undefined;

    if (scope === 'class') {
      const classId = parseClassId(String(body.class_id ?? ''));
      if (!classId) {
        return NextResponse.json({ success: false, error: 'Class is required' }, { status: 400 });
      }
      if (body.reset) {
        await resetClassWorkingDays(db, classId);
        return NextResponse.json({
          success: true,
          data: { working_days: await resolveWorkingDays(db, classId), has_override: false },
          message: 'Class working days reset to school week',
        });
      }
      if (!days?.length) {
        return NextResponse.json({ success: false, error: 'working_days is required' }, { status: 400 });
      }
      await saveClassWorkingDays(db, classId, days);
      return NextResponse.json({
        success: true,
        data: { working_days: days, has_override: true },
        message: 'Class working days saved',
      });
    }

    if (!days?.length) {
      return NextResponse.json({ success: false, error: 'working_days is required' }, { status: 400 });
    }
    await saveSchoolWorkingDays(db, days);
    return NextResponse.json({
      success: true,
      data: { working_days: days },
      message: 'School working days saved',
    });
  } catch (error) {
    console.error('Error saving working days:', error);
    return NextResponse.json({ success: false, error: 'Failed to save working days' }, { status: 500 });
  }
}
