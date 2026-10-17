import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb, type RequestDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { ensureClassSectionsTable } from '@/lib/ensure-class-sections';
import { ensureAcademicCalendarSchema } from '@/lib/ensure-academic-calendar-schema';
import { ensureClassSubjectsSchema } from '@/lib/ensure-class-subjects-schema';
import { ensureHousesSchema } from '@/lib/ensure-houses-schema';
import { ensureTeacherPedagogySchema } from '@/lib/ensure-teacher-pedagogy-schema';
import { fetchAcademicCalendarEntries } from '@/lib/academic-calendar';
import { TEACHER_WHERE_CLAUSE } from '@/lib/teachers-query';
import { classNameOrderSql } from '@/lib/class-sort';

function asList<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function teacherLabel(name: string | null, section: string | null) {
  const teacher = String(name || '').trim();
  if (!teacher) return '';
  const sectionName = String(section || '').trim();
  return sectionName ? `${teacher} · ${sectionName}` : teacher;
}

function buildClassCoverage(
  rows: Array<{
    class_id: number;
    class_name: string;
    subject_name: string;
    teacher_name: string | null;
    section_name: string | null;
    is_class_teacher: boolean | null;
  }>,
  classTeachers: Array<{ class_id: number; teacher_name: string | null; section_name: string | null }>,
) {
  const classes = new Map<
    number,
    {
      class_id: number;
      class_name: string;
      class_teachers: string[];
      subjects: Map<string, { subject_name: string; teachers: string[] }>;
    }
  >();

  for (const row of asList(rows)) {
    let entry = classes.get(row.class_id);
    if (!entry) {
      entry = {
        class_id: row.class_id,
        class_name: row.class_name,
        class_teachers: [],
        subjects: new Map(),
      };
      classes.set(row.class_id, entry);
    }
    let subject = entry.subjects.get(row.subject_name);
    if (!subject) {
      subject = { subject_name: row.subject_name, teachers: [] };
      entry.subjects.set(row.subject_name, subject);
    }
    const label = teacherLabel(row.teacher_name, row.section_name);
    if (label && !subject.teachers.includes(label)) subject.teachers.push(label);
  }

  for (const row of asList(classTeachers)) {
    const entry = classes.get(row.class_id);
    if (!entry) continue;
    const label = teacherLabel(row.teacher_name, row.section_name);
    if (label && !entry.class_teachers.includes(label)) entry.class_teachers.push(label);
  }

  return [...classes.values()].map((entry) => {
    const subjects = [...entry.subjects.values()].sort((a, b) => {
      const openA = a.teachers.length === 0 ? 0 : 1;
      const openB = b.teachers.length === 0 ? 0 : 1;
      if (openA !== openB) return openA - openB;
      return a.subject_name.localeCompare(b.subject_name);
    });
    const openCount = subjects.filter((subject) => subject.teachers.length === 0).length;
    return {
      class_id: entry.class_id,
      class_name: entry.class_name,
      class_teachers: entry.class_teachers,
      open_count: openCount,
      assigned_count: subjects.length - openCount,
      subjects,
    };
  });
}

function buildTeacherLoad(
  rows: Array<{
    staff_id: number;
    teacher_name: string | null;
    class_name: string | null;
    section_name: string | null;
    subject_name: string | null;
    is_class_teacher: boolean | null;
  }>,
) {
  const teachers = new Map<
    number,
    {
      staff_id: number;
      teacher_name: string;
      assignments: string[];
      classes: Set<string>;
    }
  >();

  for (const row of asList(rows)) {
    let entry = teachers.get(row.staff_id);
    if (!entry) {
      entry = {
        staff_id: row.staff_id,
        teacher_name: String(row.teacher_name || 'Teacher').trim() || 'Teacher',
        assignments: [],
        classes: new Set(),
      };
      teachers.set(row.staff_id, entry);
    }
    if (!row.class_name && !row.subject_name) continue;
    const parts = [row.class_name, row.section_name, row.subject_name].filter(Boolean) as string[];
    if (row.is_class_teacher) parts.push('Class teacher');
    const label = parts.join(' · ');
    if (label && !entry.assignments.includes(label)) entry.assignments.push(label);
    if (row.class_name) entry.classes.add(row.class_name);
  }

  return [...teachers.values()]
    .map((entry) => ({
      staff_id: entry.staff_id,
      teacher_name: entry.teacher_name,
      assignment_count: entry.assignments.length,
      class_count: entry.classes.size,
      assignments: entry.assignments,
    }))
    .sort((a, b) => b.assignment_count - a.assignment_count || a.teacher_name.localeCompare(b.teacher_name));
}

function buildSetup(input: {
  year: string | null;
  classes: number;
  sections: number;
  classesWithoutSections: number;
  subjects: number;
  unmappedSubjects: number;
  classesWithoutSubjects: number;
  teachers: number;
  uncovered: number;
  slots: number;
  classesWithoutCurriculum: number;
  chapters: number;
  timetableRows: number;
  calendarEntries: number;
}) {
  const step = (
    key: string,
    label: string,
    href: string,
    score: number,
    status: 'done' | 'pending',
    detail: string,
  ) => ({ key, label, href, score: Math.max(0, Math.min(1, score)), status, detail });

  const classScore = input.classes === 0 ? 0 : input.classesWithoutSections === 0 && input.sections > 0 ? 1 : 0.5;
  const subjectScore = input.subjects > 0 ? 1 : 0;
  const classMapScore =
    input.classes === 0 ? 0 : (input.classes - input.classesWithoutSubjects) / input.classes;
  const subjectMapScore =
    input.subjects === 0 ? 0 : (input.subjects - input.unmappedSubjects) / input.subjects;
  const mappedScore = input.classes === 0 || input.subjects === 0 ? 0 : (classMapScore + subjectMapScore) / 2;
  const teacherScore = input.teachers > 0 ? 1 : 0;
  const assignmentScore = input.slots === 0 ? 0 : (input.slots - input.uncovered) / input.slots;
  const curriculumScore =
    input.classes === 0 ? 0 : (input.classes - input.classesWithoutCurriculum) / input.classes;
  const timetableScore = input.timetableRows > 0 ? 1 : 0;
  const calendarScore = input.calendarEntries > 0 ? 1 : 0;

  const steps = [
    step(
      'classes',
      'Classes & Sections',
      '/academics/classes',
      classScore,
      classScore === 1 ? 'done' : 'pending',
      input.classes === 0
        ? 'Not added'
        : input.classesWithoutSections > 0
          ? `${input.classesWithoutSections} classes without a section`
          : 'Ready',
    ),
    step(
      'subjects',
      'Subjects',
      '/academics/subjects',
      subjectScore,
      subjectScore === 1 ? 'done' : 'pending',
      input.subjects > 0 ? 'Ready' : 'Not added',
    ),
    step(
      'class-subjects',
      'Class Subjects',
      '/academics/subjects',
      mappedScore,
      mappedScore === 1 ? 'done' : 'pending',
      input.classesWithoutSubjects > 0
        ? `${input.classesWithoutSubjects} classes pending`
        : input.unmappedSubjects > 0
          ? `${input.unmappedSubjects} subjects not on a class`
          : input.classes > 0
            ? 'Ready'
            : 'Not added',
    ),
    step(
      'teachers',
      'Teachers',
      '/academics/teachers',
      teacherScore,
      teacherScore === 1 ? 'done' : 'pending',
      input.teachers > 0 ? 'Ready' : 'Not added',
    ),
    step(
      'assignments',
      'Teacher Assignments',
      '/academics/teacher-assignments',
      assignmentScore,
      input.uncovered === 0 && input.slots > 0 ? 'done' : 'pending',
      input.uncovered > 0 ? `${input.uncovered} pending` : input.slots > 0 ? 'Ready' : 'Not assigned',
    ),
    step(
      'curriculum',
      'Curriculum',
      '/academics/syllabus',
      curriculumScore,
      curriculumScore === 1 && input.chapters > 0 ? 'done' : 'pending',
      input.classesWithoutCurriculum > 0
        ? `${input.classesWithoutCurriculum} classes pending`
        : input.chapters > 0
          ? 'Ready'
          : 'Not added',
    ),
    step(
      'timetable',
      'Timetable',
      '/academics/timetable',
      timetableScore,
      timetableScore === 1 ? 'done' : 'pending',
      input.timetableRows > 0 ? 'Generated' : 'Not generated',
    ),
    step(
      'calendar',
      'Academic Calendar',
      '/academics/academic-calendar',
      calendarScore,
      calendarScore === 1 ? 'done' : 'pending',
      input.calendarEntries > 0 ? 'Ready' : 'Not added',
    ),
  ];

  const percent = Math.round((steps.reduce((sum, item) => sum + item.score, 0) / steps.length) * 100);
  return { year: input.year, percent, steps };
}

async function count(db: RequestDb, sql: string, params: unknown[] = []) {
  const result = await db.query<Record<string, number | string | null>>(sql, params);
  return result.rows[0] ?? {};
}

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);
    await ensureClassSectionsTable(db);
    await Promise.all([
      ensureClassSubjectsSchema(db),
      ensureHousesSchema(db),
      ensureTeacherPedagogySchema(db),
      ensureAcademicCalendarSchema(db),
    ]);

    const today = request.nextUrl.searchParams.get('date') || new Date().toISOString().slice(0, 10);

    const [
      classes,
      sections,
      subjects,
      teachers,
      assignments,
      houses,
      categories,
      unmapped,
      coverageRows,
      classTeacherRows,
      teacherRows,
      syllabus,
      lessons,
      scheduled,
      calendar,
      academicYear,
      setupGaps,
      timetableRows,
    ] = await Promise.all([
      count(
        db,
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE COALESCE(is_active, true))::int AS active
         FROM classes`,
      ).catch(() => ({ total: 0, active: 0 })),
      count(db, `SELECT COUNT(*)::int AS total FROM sections`).catch(() => ({ total: 0 })),
      count(
        db,
        `SELECT COUNT(*)::int AS total,
                COUNT(*)::int AS active
         FROM subjects`,
      ).catch(() => ({ total: 0, active: 0 })),
      count(
        db,
        `SELECT COUNT(*)::int AS total
         FROM staff s
         LEFT JOIN departments d ON s.department_id = d.id
         LEFT JOIN designations des ON s.designation_id = des.id
         WHERE ${TEACHER_WHERE_CLAUSE}
           AND COALESCE(s.status, 'active') = 'active'`,
      ).catch(() => ({ total: 0 })),
      count(
        db,
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE COALESCE(is_class_teacher, false))::int AS class_teachers
         FROM teacher_assignments`,
      ).catch(() => ({ total: 0, class_teachers: 0 })),
      count(
        db,
        `SELECT COUNT(DISTINCT h.id) FILTER (WHERE COALESCE(h.is_active, true))::int AS houses,
                COUNT(e.id) FILTER (WHERE e.is_current = true)::int AS students
         FROM school_houses h
         LEFT JOIN student_enrollments e ON e.house_id = h.id`,
      ).catch(() => ({ houses: 0, students: 0 })),
      count(db, `SELECT COUNT(*)::int AS total FROM class_categories`).catch(() => ({ total: 0 })),
      count(
        db,
        `SELECT COUNT(*)::int AS total
         FROM subjects s
         WHERE NOT EXISTS (
           SELECT 1 FROM class_subjects cs WHERE cs.subject_id = s.id
         )`,
      ).catch(() => ({ total: 0 })),
      db
        .query<{
          class_id: number;
          class_name: string;
          subject_name: string;
          teacher_name: string | null;
          section_name: string | null;
          is_class_teacher: boolean | null;
        }>(
          `SELECT c.id AS class_id, c.name AS class_name, s.name AS subject_name,
                  NULLIF(TRIM(st.first_name || ' ' || COALESCE(st.last_name, '')), '') AS teacher_name,
                  sec.name AS section_name,
                  ta.is_class_teacher
           FROM class_subjects cs
           JOIN classes c ON c.id = cs.class_id
           JOIN subjects s ON s.id = cs.subject_id
           LEFT JOIN teacher_assignments ta
             ON ta.class_id = cs.class_id AND ta.subject_id = cs.subject_id
           LEFT JOIN staff st ON st.id = ta.staff_id
           LEFT JOIN sections sec ON sec.id = ta.section_id
           ORDER BY ${classNameOrderSql('c.name')}, s.name, teacher_name`,
        )
        .then((result) => result.rows)
        .catch(() => []),
      db
        .query<{ class_id: number; teacher_name: string | null; section_name: string | null }>(
          `SELECT c.id AS class_id,
                  NULLIF(TRIM(st.first_name || ' ' || COALESCE(st.last_name, '')), '') AS teacher_name,
                  sec.name AS section_name
           FROM teacher_assignments ta
           JOIN classes c ON c.id = ta.class_id
           JOIN staff st ON st.id = ta.staff_id
           LEFT JOIN sections sec ON sec.id = ta.section_id
           WHERE ta.is_class_teacher = true
           ORDER BY ${classNameOrderSql('c.name')}, sec.name NULLS LAST, teacher_name`,
        )
        .then((result) => result.rows)
        .catch(() => []),
      db
        .query<{
          staff_id: number;
          teacher_name: string | null;
          class_name: string | null;
          section_name: string | null;
          subject_name: string | null;
          is_class_teacher: boolean | null;
        }>(
          `SELECT s.id AS staff_id,
                  NULLIF(TRIM(s.first_name || ' ' || COALESCE(s.last_name, '')), '') AS teacher_name,
                  c.name AS class_name,
                  sec.name AS section_name,
                  sub.name AS subject_name,
                  ta.is_class_teacher
           FROM staff s
           LEFT JOIN departments d ON s.department_id = d.id
           LEFT JOIN designations des ON s.designation_id = des.id
           LEFT JOIN teacher_assignments ta ON ta.staff_id = s.id
           LEFT JOIN classes c ON c.id = ta.class_id
           LEFT JOIN sections sec ON sec.id = ta.section_id
           LEFT JOIN subjects sub ON sub.id = ta.subject_id
           WHERE ${TEACHER_WHERE_CLAUSE}
             AND COALESCE(s.status, 'active') = 'active'
           ORDER BY teacher_name, ${classNameOrderSql('c.name')}, sec.name NULLS LAST, sub.name`,
        )
        .then((result) => result.rows)
        .catch(() => []),
      count(
        db,
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE COALESCE(sp.status, 'not_started') = 'not_started')::int AS not_started,
                COUNT(*) FILTER (WHERE sp.status = 'in_progress')::int AS in_progress,
                COUNT(*) FILTER (WHERE sp.status = 'completed')::int AS completed,
                COALESCE(SUM(sc.total_periods), 0)::int AS planned,
                COALESCE(SUM(COALESCE(sp.periods_completed, 0)), 0)::int AS done
         FROM syllabus_chapters sc
         LEFT JOIN syllabus_progress sp
           ON sp.chapter_id = sc.id AND sp.class_id = sc.class_id AND sp.section_id IS NULL
         WHERE COALESCE(sc.is_active, true)`,
      ).catch(() => ({ total: 0, not_started: 0, in_progress: 0, completed: 0, planned: 0, done: 0 })),
      db
        .query<{
          id: number;
          title: string;
          lesson_date: string;
          status: string;
          class_name: string | null;
          subject_name: string | null;
        }>(
          `SELECT lp.id, lp.title, to_char(lp.lesson_date, 'YYYY-MM-DD') AS lesson_date, lp.status,
                  c.name AS class_name, sub.name AS subject_name
           FROM lesson_plans lp
           LEFT JOIN classes c ON c.id = lp.class_id
           LEFT JOIN subjects sub ON sub.id = lp.subject_id
           WHERE lp.lesson_date >= $1::date
             AND lp.status IS DISTINCT FROM 'cancelled'
           ORDER BY lp.lesson_date ASC, lp.id ASC
           LIMIT 5`,
          [today],
        )
        .then((result) => result.rows)
        .catch(() => []),
      count(
        db,
        `SELECT COUNT(*)::int AS total
         FROM lesson_plans
         WHERE status = 'scheduled'`,
      ).catch(() => ({ total: 0 })),
      fetchAcademicCalendarEntries(db, { category: 'all' }).catch(() => []),
      db
        .query<{ name: string }>(
          `SELECT name FROM academic_years WHERE COALESCE(is_active, false) = true ORDER BY start_date DESC NULLS LAST LIMIT 1`,
        )
        .then((result) => result.rows[0]?.name ?? null)
        .catch(() => null),
      count(
        db,
        `SELECT
           (SELECT COUNT(*)::int FROM classes c
             WHERE COALESCE(c.is_active, true)
               AND NOT EXISTS (
                 SELECT 1 FROM sections sec WHERE sec.class_id = c.id
                 UNION
                 SELECT 1 FROM class_sections cs WHERE cs.class_id = c.id
               )) AS classes_without_sections,
           (SELECT COUNT(*)::int FROM classes c
             WHERE COALESCE(c.is_active, true)
               AND NOT EXISTS (SELECT 1 FROM class_subjects cs WHERE cs.class_id = c.id)) AS classes_without_subjects,
           (SELECT COUNT(*)::int FROM classes c
             WHERE COALESCE(c.is_active, true)
               AND NOT EXISTS (
                 SELECT 1 FROM syllabus_chapters sc
                 WHERE sc.class_id = c.id AND COALESCE(sc.is_active, true)
               )) AS classes_without_curriculum`,
      ).catch(() => ({
        classes_without_sections: 0,
        classes_without_subjects: 0,
        classes_without_curriculum: 0,
      })),
      count(db, `SELECT COUNT(*)::int AS total FROM class_timetable`).catch(() => ({ total: 0 })),
    ]);

    const planned = Number(syllabus.planned) || 0;
    const done = Number(syllabus.done) || 0;
    const classCoverage = buildClassCoverage(coverageRows, classTeacherRows);
    const teacherLoad = buildTeacherLoad(teacherRows);
    const uncoveredCount = classCoverage.reduce((sum, row) => sum + row.open_count, 0);
    const setup = buildSetup({
      year: typeof academicYear === 'string' ? academicYear : null,
      classes: Number(classes.active) || Number(classes.total) || 0,
      sections: Number(sections.total) || 0,
      classesWithoutSections: Number(setupGaps.classes_without_sections) || 0,
      subjects: Number(subjects.total) || 0,
      unmappedSubjects: Number(unmapped.total) || 0,
      classesWithoutSubjects: Number(setupGaps.classes_without_subjects) || 0,
      teachers: Number(teachers.total) || 0,
      uncovered: uncoveredCount,
      slots: classCoverage.reduce((sum, row) => sum + row.assigned_count + row.open_count, 0),
      classesWithoutCurriculum: Number(setupGaps.classes_without_curriculum) || 0,
      chapters: Number(syllabus.total) || 0,
      timetableRows: Number(timetableRows.total) || 0,
      calendarEntries: asList(calendar).length,
    });
    const upcomingEvents = asList<{
      id: number;
      category: string;
      title: string;
      start_date: string;
      end_date: string;
    }>(calendar)
      .filter((entry) => String(entry.end_date || entry.start_date).slice(0, 10) >= today)
      .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)))
      .slice(0, 6);

    return NextResponse.json({
      success: true,
      data: {
        classes: Number(classes.total) || 0,
        activeClasses: Number(classes.active) || 0,
        sections: Number(sections.total) || 0,
        subjects: Number(subjects.total) || 0,
        activeSubjects: Number(subjects.active) || 0,
        teachers: Number(teachers.total) || 0,
        assignments: Number(assignments.total) || 0,
        classTeachers: Number(assignments.class_teachers) || 0,
        houses: Number(houses.houses) || 0,
        houseStudents: Number(houses.students) || 0,
        categories: Number(categories.total) || 0,
        unmappedSubjects: Number(unmapped.total) || 0,
        uncoveredCount,
        classCoverage,
        teacherLoad,
        syllabus: {
          total: Number(syllabus.total) || 0,
          notStarted: Number(syllabus.not_started) || 0,
          inProgress: Number(syllabus.in_progress) || 0,
          completed: Number(syllabus.completed) || 0,
          percent: planned > 0 ? Math.round((done / planned) * 100) : 0,
        },
        upcomingLessons: lessons,
        scheduledLessons: Number(scheduled.total) || 0,
        upcomingEvents,
        setup,
      },
    });
  } catch (error) {
    console.error('Academics dashboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load academics dashboard' },
      { status: 500 },
    );
  }
}
