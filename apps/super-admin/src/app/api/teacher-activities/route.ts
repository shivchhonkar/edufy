import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureTeacherPedagogySchema } from '@/lib/ensure-teacher-pedagogy-schema';
import { requireHrAdmin, requireHrRead } from '@/lib/hr-auth';

const SELECT = `
  SELECT a.*,
    s.first_name || ' ' || s.last_name AS teacher_name,
    c.name AS class_name,
    sec.name AS section_name,
    sub.name AS subject_name
  FROM teacher_daily_activities a
  LEFT JOIN staff s ON a.staff_id = s.id
  LEFT JOIN classes c ON a.class_id = c.id
  LEFT JOIN sections sec ON a.section_id = sec.id
  LEFT JOIN subjects sub ON a.subject_id = sub.id`;

export async function GET(request: NextRequest) {
  try {
    const auth = requireHrRead(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureTeacherPedagogySchema(db);

    const staffId = request.nextUrl.searchParams.get('staff_id');
    const from = request.nextUrl.searchParams.get('from');
    const to = request.nextUrl.searchParams.get('to');
    const classId = request.nextUrl.searchParams.get('class_id');

    const params: unknown[] = [];
    let query = `${SELECT} WHERE 1=1`;

    if (staffId) {
      params.push(parseInt(staffId, 10));
      query += ` AND a.staff_id = $${params.length}`;
    }
    if (from) {
      params.push(from);
      query += ` AND a.activity_date >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      query += ` AND a.activity_date <= $${params.length}`;
    }
    if (classId) {
      params.push(parseInt(classId, 10));
      query += ` AND a.class_id = $${params.length}`;
    }

    query += ' ORDER BY a.activity_date DESC, a.id DESC';
    const result = await db.query(query, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Teacher activities GET:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch activities' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureTeacherPedagogySchema(db);

    const body = await request.json();
    const {
      staff_id, class_id, section_id, subject_id, activity_date,
      topic_covered, periods_taught, homework_given, remarks, status,
    } = body;

    if (!staff_id || !activity_date) {
      return NextResponse.json({ success: false, error: 'staff_id and activity_date are required' }, { status: 400 });
    }

    const result = await db.query(
      `INSERT INTO teacher_daily_activities
        (staff_id, class_id, section_id, subject_id, activity_date, topic_covered,
         periods_taught, homework_given, remarks, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        staff_id,
        class_id || null,
        section_id || null,
        subject_id || null,
        activity_date,
        topic_covered?.trim() || null,
        periods_taught ?? 1,
        homework_given === true,
        remarks?.trim() || null,
        status || 'completed',
        auth.user.id,
      ]
    );
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Teacher activities POST:', error);
    return NextResponse.json({ success: false, error: 'Failed to create activity' }, { status: 500 });
  }
}
