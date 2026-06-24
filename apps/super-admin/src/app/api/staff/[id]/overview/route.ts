import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { requireHrRead } from '@/lib/hr-auth';
import { parseStaffId, staffExists } from '@/lib/staff-profile-api';

function monthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = requireHrRead(request);
    if (auth instanceof NextResponse) return auth;

    const staffId = parseStaffId(params.id);
    if (!staffId) {
      return NextResponse.json({ success: false, error: 'Invalid staff id' }, { status: 400 });
    }

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);

    if (!(await staffExists(db, staffId))) {
      return NextResponse.json({ success: false, error: 'Staff not found' }, { status: 404 });
    }

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const { start, end } = monthRange(year, month);

    const [
      staffResult,
      attendanceResult,
      leaveResult,
      assignmentStatsResult,
      studentCountResult,
    ] = await Promise.all([
      db.query<{ salary: string | number | null }>(
        'SELECT salary FROM staff WHERE id = $1',
        [staffId],
      ),
      db.query<{ status: string }>(
        `SELECT status FROM staff_attendance
         WHERE staff_id = $1 AND attendance_date >= $2 AND attendance_date <= $3`,
        [staffId, start, end],
      ).catch(() => ({ rows: [] as { status: string }[] })),
      db.query<{
        allocated: string | number;
        used: string | number;
        carried_forward: string | number;
        max_days_per_year?: number;
      }>(
        `SELECT lb.allocated, lb.used, lb.carried_forward, lt.max_days_per_year
         FROM leave_balances lb
         JOIN leave_types lt ON lb.leave_type_id = lt.id
         WHERE lb.staff_id = $1 AND lb.year = $2`,
        [staffId, year],
      ).catch(async () => {
        const types = await db.query<{ max_days_per_year: number }>(
          'SELECT max_days_per_year FROM leave_types WHERE is_active = true',
        ).catch(() => ({ rows: [] as { max_days_per_year: number }[] }));
        return {
          rows: types.rows.map((t) => ({
            allocated: t.max_days_per_year || 0,
            used: 0,
            carried_forward: 0,
          })),
        };
      }),
      db.query<{ classes_assigned: string; subjects_assigned: string }>(
        `SELECT
          (SELECT COUNT(*)::text FROM (
             SELECT DISTINCT class_id, COALESCE(section_id, -1)
             FROM teacher_assignments
             WHERE staff_id = $1
           ) x) AS classes_assigned,
          (SELECT COUNT(DISTINCT subject_id)::text
             FROM teacher_assignments
             WHERE staff_id = $1 AND subject_id IS NOT NULL) AS subjects_assigned`,
        [staffId],
      ).catch(() => ({
        rows: [{ classes_assigned: '0', subjects_assigned: '0' }],
      })),
      db.query<{ count: string }>(
        `SELECT COUNT(DISTINCT st.id)::text AS count
         FROM students st
         INNER JOIN teacher_assignments ta
           ON ta.class_id = st.class_id
          AND (ta.section_id IS NULL OR ta.section_id = st.section_id)
         WHERE ta.staff_id = $1
           AND LOWER(COALESCE(st.status, 'active')) = 'active'`,
        [staffId],
      ).catch(() => ({ rows: [{ count: '0' }] })),
    ]);

    const attendanceRows = attendanceResult.rows;
    let attendancePercentage = 0;
    if (attendanceRows.length > 0) {
      const presentLike = attendanceRows.filter((row) =>
        ['present', 'late', 'half_day'].includes(row.status),
      ).length;
      attendancePercentage = Math.round((presentLike / attendanceRows.length) * 100);
    }

    const leavesRemaining = leaveResult.rows.reduce((sum, row) => {
      const record = row as {
        allocated?: string | number;
        used?: string | number;
        carried_forward?: string | number;
        max_days_per_year?: number;
      };
      const allocated = parseFloat(String(record.allocated ?? record.max_days_per_year ?? 0));
      const used = parseFloat(String(record.used ?? 0));
      const carried = parseFloat(String(record.carried_forward ?? 0));
      return sum + Math.max(0, allocated + carried - used);
    }, 0);

    const salary = parseFloat(String(staffResult.rows[0]?.salary ?? 0));

    return NextResponse.json({
      success: true,
      data: {
        attendance_percentage: attendancePercentage,
        leaves_remaining: Math.round(leavesRemaining * 10) / 10,
        salary,
        classes_assigned: parseInt(assignmentStatsResult.rows[0]?.classes_assigned || '0', 10),
        subjects_assigned: parseInt(assignmentStatsResult.rows[0]?.subjects_assigned || '0', 10),
        students_handled: parseInt(studentCountResult.rows[0]?.count || '0', 10),
        period: { month, year },
      },
    });
  } catch (error) {
    console.error('Staff overview error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch staff overview' },
      { status: 500 },
    );
  }
}
