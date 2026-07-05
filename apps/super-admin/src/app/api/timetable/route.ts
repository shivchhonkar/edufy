import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureTimetableSchema } from '@/lib/ensure-timetable-schema';
import { ensureClassSubjectsSchema } from '@/lib/ensure-class-subjects-schema';
import { upsertClassTimetableEntry } from '@/lib/timetable-upsert';
import {
  resolveRoomForSubject,
  resolveTeacherForSubject,
  validateTimetablePlacement,
} from '@/lib/timetable-conflicts';

const ENTRY_SELECT = `
  SELECT ct.*, tp.name AS period_name, tp.start_time, tp.end_time, tp.sort_order,
         sub.name AS subject_name, s.first_name || ' ' || s.last_name AS teacher_name
  FROM class_timetable ct
  INNER JOIN timetable_periods tp ON ct.period_id = tp.id
  LEFT JOIN subjects sub ON ct.subject_id = sub.id
  LEFT JOIN staff s ON ct.staff_id = s.id`;

type TimetableRow = {
  id: number;
  class_id: number;
  section_id: number | null;
  day_of_week: number;
  period_id: number;
  subject_id: number | null;
  subject_name?: string;
  teacher_name?: string;
  period_name?: string;
  start_time?: string;
  end_time?: string;
  sort_order?: number;
  is_inherited?: boolean;
};

function mergeSectionWithTemplate(
  sectionRows: TimetableRow[],
  templateRows: TimetableRow[]
): TimetableRow[] {
  const merged: TimetableRow[] = [];
  const seen = new Set<string>();

  for (const row of sectionRows) {
    const key = `${row.day_of_week}-${row.period_id}`;
    seen.add(key);
    merged.push({ ...row, is_inherited: false });
  }

  for (const row of templateRows) {
    const key = `${row.day_of_week}-${row.period_id}`;
    if (!seen.has(key)) {
      merged.push({ ...row, is_inherited: true });
    }
  }

  return merged.sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
}

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTimetableSchema(db);
    await ensureClassSubjectsSchema(db);
    const classId = request.nextUrl.searchParams.get('class_id');
    const sectionId = request.nextUrl.searchParams.get('section_id');
    const staffId = request.nextUrl.searchParams.get('staff_id');

    if (staffId) {
      const sid = parseInt(staffId, 10);
      const [periods, entriesResult] = await Promise.all([
        db.query('SELECT * FROM timetable_periods WHERE is_active = true ORDER BY sort_order'),
        db.query(
          `SELECT ct.*, tp.name AS period_name, tp.start_time, tp.end_time, tp.sort_order,
                  sub.name AS subject_name, s.first_name || ' ' || s.last_name AS teacher_name,
                  cl.name AS class_name, sec.name AS section_name
           FROM class_timetable ct
           INNER JOIN timetable_periods tp ON ct.period_id = tp.id
           LEFT JOIN subjects sub ON ct.subject_id = sub.id
           LEFT JOIN staff s ON ct.staff_id = s.id
           LEFT JOIN classes cl ON ct.class_id = cl.id
           LEFT JOIN sections sec ON ct.section_id = sec.id
           WHERE ct.staff_id = $1
           ORDER BY ct.day_of_week, tp.sort_order`,
          [sid]
        ),
      ]);
      const rows = entriesResult.rows as TimetableRow[] & {
        class_name?: string;
        section_name?: string;
      }[];
      return NextResponse.json({
        success: true,
        data: {
          entries: rows,
          periods: periods.rows,
          meta: { view: 'teacher', staff_id: sid },
        },
      });
    }

    const [periods, classSubjects] = await Promise.all([
      db.query('SELECT * FROM timetable_periods WHERE is_active = true ORDER BY sort_order'),
      classId
        ? db.query('SELECT subject_id FROM class_subjects WHERE class_id = $1', [parseInt(classId, 10)])
        : Promise.resolve({ rows: [] }),
    ]);

    let entries: TimetableRow[] = [];
    let templateCount = 0;
    let sectionOverrideCount = 0;

    if (classId) {
      const cid = parseInt(classId, 10);

      if (sectionId) {
        const sid = parseInt(sectionId, 10);
        const [sectionResult, templateResult] = await Promise.all([
          db.query(`${ENTRY_SELECT} WHERE ct.class_id = $1 AND ct.section_id = $2 ORDER BY ct.day_of_week, tp.sort_order`, [cid, sid]),
          db.query(`${ENTRY_SELECT} WHERE ct.class_id = $1 AND ct.section_id IS NULL ORDER BY ct.day_of_week, tp.sort_order`, [cid]),
        ]);
        sectionOverrideCount = sectionResult.rows.length;
        templateCount = templateResult.rows.length;
        entries = mergeSectionWithTemplate(
          sectionResult.rows as TimetableRow[],
          templateResult.rows as TimetableRow[]
        );
      } else {
        const templateResult = await db.query(
          `${ENTRY_SELECT} WHERE ct.class_id = $1 AND ct.section_id IS NULL ORDER BY ct.day_of_week, tp.sort_order`,
          [cid]
        );
        entries = (templateResult.rows as TimetableRow[]).map((r) => ({ ...r, is_inherited: false }));
        templateCount = entries.length;
      }
    }

    const sectionsResult = classId
      ? await db.query('SELECT id, name FROM sections WHERE class_id = $1 ORDER BY name', [parseInt(classId, 10)])
      : { rows: [] };

    return NextResponse.json({
      success: true,
      data: {
        entries,
        periods: periods.rows,
        class_subject_ids: (classSubjects.rows as { subject_id: number }[]).map((r) => r.subject_id),
        sections: sectionsResult.rows,
        meta: {
          is_template_view: !sectionId,
          template_entry_count: templateCount,
          section_override_count: sectionOverrideCount,
        },
      },
    });
  } catch (error) {
    console.error('Timetable error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch timetable. Run phase9 migration.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTimetableSchema(db);
    await ensureClassSubjectsSchema(db);
    const body = await request.json();

    if (body.action === 'validate') {
      const conflicts = await validateTimetablePlacement(db, {
        class_id: parseInt(String(body.class_id), 10),
        section_id: body.section_id ? parseInt(String(body.section_id), 10) : null,
        day_of_week: parseInt(String(body.day_of_week), 10),
        period_id: parseInt(String(body.period_id), 10),
        subject_id: body.subject_id ? parseInt(String(body.subject_id), 10) : null,
        staff_id: body.staff_id ? parseInt(String(body.staff_id), 10) : null,
        room: body.room || null,
        academic_year: body.academic_year || null,
        exclude_entry_id: body.exclude_entry_id ? parseInt(String(body.exclude_entry_id), 10) : null,
      });
      return NextResponse.json({ success: true, data: { conflicts } });
    }

    if (body.action === 'apply_to_sections') {
      const class_id = parseInt(String(body.class_id), 10);
      if (!class_id) {
        return NextResponse.json({ success: false, error: 'class_id is required' }, { status: 400 });
      }

      const [templateResult, sectionsResult, classSubjectsResult] = await Promise.all([
        db.query(
          'SELECT day_of_week, period_id, subject_id, staff_id, room, academic_year FROM class_timetable WHERE class_id = $1 AND section_id IS NULL',
          [class_id]
        ),
        db.query('SELECT id, name FROM sections WHERE class_id = $1', [class_id]),
        db.query('SELECT subject_id FROM class_subjects WHERE class_id = $1', [class_id]),
      ]);

      const template = templateResult.rows as {
        day_of_week: number;
        period_id: number;
        subject_id: number | null;
        staff_id: number | null;
        room: string | null;
        academic_year: string | null;
      }[];

      if (!template.length) {
        return NextResponse.json(
          { success: false, error: 'No class template found. Fill the timetable under "All sections" first.' },
          { status: 400 }
        );
      }

      const sections = sectionsResult.rows as { id: number; name: string }[];
      if (!sections.length) {
        return NextResponse.json(
          { success: false, error: 'This class has no sections to apply the template to.' },
          { status: 400 }
        );
      }

      const allowedSubjects = new Set(
        (classSubjectsResult.rows as { subject_id: number }[]).map((r) => r.subject_id)
      );

      await db.query('BEGIN');
      let applied = 0;
      let skippedSubjects = 0;

      try {
        for (const section of sections) {
          for (const entry of template) {
            let subjectId = entry.subject_id;
            if (subjectId && allowedSubjects.size > 0 && !allowedSubjects.has(subjectId)) {
              subjectId = null;
              skippedSubjects += 1;
            }

            await upsertClassTimetableEntry(db, {
              class_id,
              section_id: section.id,
              day_of_week: entry.day_of_week,
              period_id: entry.period_id,
              subject_id: subjectId,
              staff_id: entry.staff_id,
              room: entry.room,
              academic_year: entry.academic_year,
            });
            applied += 1;
          }
        }
        await db.query('COMMIT');
      } catch (err) {
        await db.query('ROLLBACK');
        throw err;
      }

      return NextResponse.json({
        success: true,
        message: `Template applied to ${sections.length} section(s)`,
        data: {
          sections: sections.length,
          cells_per_section: template.length,
          total_updates: applied,
          subjects_left_free: skippedSubjects,
        },
      });
    }

    const {
      class_id,
      section_id,
      day_of_week,
      period_id,
      subject_id,
      staff_id: bodyStaffId,
      room: bodyRoom,
      academic_year,
      auto_assign = true,
    } = body;

    if (class_id == null || day_of_week == null || period_id == null) {
      return NextResponse.json(
        { success: false, error: 'class_id, day_of_week, and period_id are required' },
        { status: 400 }
      );
    }

    const parsedClassId = parseInt(String(class_id), 10);
    const parsedSectionId = section_id ? parseInt(String(section_id), 10) : null;
    const parsedSubjectId = subject_id ? parseInt(String(subject_id), 10) : null;
    let parsedStaffId = bodyStaffId ? parseInt(String(bodyStaffId), 10) : null;
    let parsedRoom = bodyRoom || null;

    if (parsedSubjectId) {
      const allowed = await db.query(
        'SELECT 1 FROM class_subjects WHERE class_id = $1 AND subject_id = $2 LIMIT 1',
        [parsedClassId, parsedSubjectId]
      );
      if (!allowed.rows.length) {
        const anyAssigned = await db.query(
          'SELECT 1 FROM class_subjects WHERE class_id = $1 LIMIT 1',
          [parsedClassId]
        );
        if (anyAssigned.rows.length) {
          return NextResponse.json(
            { success: false, error: 'This subject is not assigned to the selected class. Assign it under Subject Management first.' },
            { status: 400 }
          );
        }
      }
    }

    const existing = await db.query(
      `SELECT id FROM class_timetable
       WHERE class_id = $1
         AND day_of_week = $2
         AND period_id = $3
         AND section_id IS NOT DISTINCT FROM $4
         AND academic_year IS NOT DISTINCT FROM $5
       ORDER BY id LIMIT 1`,
      [parsedClassId, day_of_week, period_id, parsedSectionId, academic_year || null]
    );
    const excludeEntryId = (existing.rows[0] as { id: number } | undefined)?.id ?? null;

    if (auto_assign && parsedSubjectId) {
      if (!parsedStaffId) {
        parsedStaffId = await resolveTeacherForSubject(
          db,
          parsedClassId,
          parsedSectionId,
          parsedSubjectId,
          academic_year || null,
        );
      }
      if (!parsedRoom) {
        parsedRoom = await resolveRoomForSubject(db, parsedClassId, parsedSubjectId);
      }
    }

    const conflicts = await validateTimetablePlacement(db, {
      class_id: parsedClassId,
      section_id: parsedSectionId,
      day_of_week: parseInt(String(day_of_week), 10),
      period_id: parseInt(String(period_id), 10),
      subject_id: parsedSubjectId,
      staff_id: parsedStaffId,
      room: parsedRoom,
      academic_year: academic_year || null,
      exclude_entry_id: excludeEntryId,
    });

    if (conflicts.length) {
      return NextResponse.json(
        { success: false, error: conflicts[0].message, conflicts },
        { status: 409 },
      );
    }

    const result = await upsertClassTimetableEntry(db, {
      class_id: parsedClassId,
      section_id: parsedSectionId,
      day_of_week: parseInt(String(day_of_week), 10),
      period_id: parseInt(String(period_id), 10),
      subject_id: parsedSubjectId,
      staff_id: parsedStaffId,
      room: parsedRoom,
      academic_year: academic_year || null,
    });

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Timetable create error:', error);
    const message = error instanceof Error ? error.message : 'Failed to save timetable entry';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTimetableSchema(db);
    await ensureClassSubjectsSchema(db);
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    await db.query('DELETE FROM class_timetable WHERE id = $1', [parseInt(id, 10)]);
    return NextResponse.json({ success: true, message: 'Entry deleted' });
  } catch (error) {
    console.error('Timetable delete error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete entry' }, { status: 500 });
  }
}
