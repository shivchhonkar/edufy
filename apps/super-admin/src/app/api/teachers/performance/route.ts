import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureTeacherPedagogySchema } from '@/lib/ensure-teacher-pedagogy-schema';
import { ensureTimetableSchema } from '@/lib/ensure-timetable-schema';
import { requireHrRead } from '@/lib/hr-auth';

interface TeacherMetrics {
  staff_id: number;
  teacher_name: string;
  activity_count: number;
  periods_logged: number;
  syllabus_progress_pct: number;
  chapters_completed: number;
  chapters_total: number;
  timetable_slots: number;
  homework_count: number;
  score: number;
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireHrRead(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureTeacherPedagogySchema(db);
    await ensureTimetableSchema(db);

    const staffId = request.nextUrl.searchParams.get('staff_id');
    const days = parseInt(request.nextUrl.searchParams.get('days') || '30', 10);

    const teachersResult = await db.query(`
      SELECT DISTINCT s.id, s.first_name || ' ' || s.last_name AS teacher_name
      FROM staff s
      WHERE s.status = 'active'
        AND (
          EXISTS (SELECT 1 FROM teacher_assignments ta WHERE ta.staff_id = s.id)
          OR EXISTS (SELECT 1 FROM class_timetable ct WHERE ct.staff_id = s.id)
          OR EXISTS (SELECT 1 FROM teacher_daily_activities a WHERE a.staff_id = s.id)
        )
      ORDER BY teacher_name
    `);

    const metrics: TeacherMetrics[] = [];

    for (const teacher of teachersResult.rows as { id: number; teacher_name: string }[]) {
      if (staffId && teacher.id !== parseInt(staffId, 10)) continue;

      const [activities, syllabus, timetable, homework] = await Promise.all([
        db.query(
          `SELECT COUNT(*)::int AS cnt, COALESCE(SUM(periods_taught), 0)::int AS periods
           FROM teacher_daily_activities
           WHERE staff_id = $1 AND activity_date >= CURRENT_DATE - $2::int`,
          [teacher.id, days]
        ),
        db.query(
          `SELECT
             COUNT(DISTINCT sc.id)::int AS total,
             COUNT(DISTINCT CASE WHEN sp.status = 'completed' THEN sc.id END)::int AS completed,
             COALESCE(AVG(
               CASE WHEN sc.total_periods > 0
                 THEN LEAST(100, (COALESCE(sp.periods_completed, 0)::float / sc.total_periods) * 100)
                 ELSE 0 END
             ), 0)::float AS avg_pct
           FROM syllabus_chapters sc
           LEFT JOIN syllabus_progress sp ON sp.chapter_id = sc.id AND sp.staff_id = $1
           WHERE sc.is_active = true`,
          [teacher.id]
        ),
        db.query(
          `SELECT COUNT(*)::int AS slots FROM class_timetable WHERE staff_id = $1 AND subject_id IS NOT NULL`,
          [teacher.id]
        ),
        db.query(
          `SELECT COUNT(*)::int AS cnt FROM homework h
           INNER JOIN staff st ON st.user_id = h.assigned_by
           WHERE st.id = $1 AND h.created_at >= CURRENT_DATE - $2::int`,
          [teacher.id, days]
        ),
      ]);

      const activityCount = activities.rows[0]?.cnt ?? 0;
      const periodsLogged = activities.rows[0]?.periods ?? 0;
      const chaptersTotal = syllabus.rows[0]?.total ?? 0;
      const chaptersCompleted = syllabus.rows[0]?.completed ?? 0;
      const syllabusPct = Math.round(syllabus.rows[0]?.avg_pct ?? 0);
      const timetableSlots = timetable.rows[0]?.slots ?? 0;
      const homeworkCount = homework.rows[0]?.cnt ?? 0;

      const activityScore = Math.min(30, activityCount * 3);
      const syllabusScore = Math.round(syllabusPct * 0.35);
      const timetableScore = Math.min(20, timetableSlots * 2);
      const homeworkScore = Math.min(15, homeworkCount * 3);
      const score = Math.min(100, activityScore + syllabusScore + timetableScore + homeworkScore);

      metrics.push({
        staff_id: teacher.id,
        teacher_name: teacher.teacher_name,
        activity_count: activityCount,
        periods_logged: periodsLogged,
        syllabus_progress_pct: syllabusPct,
        chapters_completed: chaptersCompleted,
        chapters_total: chaptersTotal,
        timetable_slots: timetableSlots,
        homework_count: homeworkCount,
        score,
      });
    }

    metrics.sort((a, b) => b.score - a.score);
    const ranked = metrics.map((m, i) => ({ ...m, rank: i + 1 }));

    const summary = {
      total_teachers: ranked.length,
      avg_score: ranked.length
        ? Math.round(ranked.reduce((s, t) => s + t.score, 0) / ranked.length)
        : 0,
      top_teacher: ranked[0] || null,
      period_days: days,
    };

    if (staffId && ranked.length === 1) {
      return NextResponse.json({ success: true, data: { teacher: ranked[0], summary, ranking: ranked } });
    }

    return NextResponse.json({ success: true, data: { summary, ranking: ranked } });
  } catch (error) {
    console.error('Teacher performance:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch performance data' }, { status: 500 });
  }
}
