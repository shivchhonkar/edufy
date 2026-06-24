import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureTransportSchema } from '@/lib/ensure-transport-schema';
import { ensureFeeSchema } from '@/lib/ensure-fee-schema';
import { resolveAcademicYear } from '@/lib/ensure-system-settings';
import { syncTransportFeesForStudent } from '@/lib/transport-fee-sync';

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTransportSchema(db);
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('student_id');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const routeId = searchParams.get('route_id');
    const classId = searchParams.get('class_id');
    const sectionId = searchParams.get('section_id');

    if (studentId) {
      const result = await db.query(
        `SELECT st.*, r.route_name, rs.stop_name, rs.pickup_fee
         FROM student_transport st
         LEFT JOIN routes r ON st.route_id = r.id
         LEFT JOIN route_stops rs ON st.stop_id = rs.id
         WHERE st.student_id = $1 AND st.status = 'active'`,
        [studentId]
      );
      return NextResponse.json({ success: true, data: result.rows });
    }

    let queryText = `
      SELECT st.id, st.student_id, st.route_id, st.stop_id, st.transport_fee,
             st.start_date, st.end_date, st.status,
             s.admission_number, s.first_name, s.last_name, s.photo_url, s.parent_phone,
             c.id as class_id, c.name as class_name, sec.name as section_name,
             r.route_name, r.route_number, rs.stop_name, rs.arrival_time
      FROM student_transport st
      JOIN students s ON st.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      JOIN routes r ON st.route_id = r.id
      LEFT JOIN route_stops rs ON st.stop_id = rs.id
      WHERE 1=1
    `;
    const queryParams: unknown[] = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      queryText += ` AND st.status = $${paramCount}`;
      queryParams.push(status);
    }
    if (routeId) {
      paramCount++;
      queryText += ` AND st.route_id = $${paramCount}`;
      queryParams.push(routeId);
    }
    if (classId) {
      paramCount++;
      queryText += ` AND s.class_id = $${paramCount}`;
      queryParams.push(classId);
    }
    if (sectionId) {
      paramCount++;
      queryText += ` AND s.section_id = $${paramCount}`;
      queryParams.push(sectionId);
    }
    if (search) {
      paramCount++;
      queryText += ` AND (LOWER(s.first_name) LIKE LOWER($${paramCount}) OR LOWER(s.last_name) LIKE LOWER($${paramCount}) OR LOWER(s.admission_number) LIKE LOWER($${paramCount}))`;
      queryParams.push(`%${search}%`);
    }

    queryText += ' ORDER BY r.route_name, s.first_name, s.last_name';
    const result = await db.query(queryText, queryParams);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching transport assignments:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch transport assignments';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTransportSchema(db);
    const body = await request.json();

    const studentIds: number[] = body.student_ids?.length
      ? body.student_ids.map((id: number | string) => parseInt(String(id), 10))
      : body.student_id
        ? [parseInt(String(body.student_id), 10)]
        : [];

    const { route_id, stop_id, transport_fee, start_date, end_date, status = 'active' } = body;

    if (!studentIds.length || !route_id || !start_date) {
      return NextResponse.json({ success: false, error: 'Student(s), route, and start date are required' }, { status: 400 });
    }

    let fee = transport_fee;
    if ((fee == null || fee === '') && stop_id) {
      const stop = await db.query<{ pickup_fee: number | null }>('SELECT pickup_fee FROM route_stops WHERE id = $1', [stop_id]);
      fee = stop.rows[0]?.pickup_fee ?? null;
    }
    if ((fee == null || fee === '') && route_id) {
      const route = await db.query<{ monthly_fee: number | null }>('SELECT monthly_fee FROM routes WHERE id = $1', [route_id]);
      fee = route.rows[0]?.monthly_fee ?? null;
    }

    const created: unknown[] = [];
    const skipped: string[] = [];

    for (const studentId of studentIds) {
      const existing = await db.query(
        "SELECT id FROM student_transport WHERE student_id = $1 AND status = 'active'",
        [studentId]
      );
      if (existing.rows.length) {
        skipped.push(String(studentId));
        continue;
      }
      const result = await db.query(
        `INSERT INTO student_transport (student_id, route_id, stop_id, transport_fee, start_date, end_date, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [studentId, route_id, stop_id || null, fee, start_date, end_date || null, status]
      );
      created.push(result.rows[0]);
    }

    if (created.length) {
      await ensureFeeSchema(db);
      const academicYear = await resolveAcademicYear(db, null);
      for (const row of created as { student_id: number }[]) {
        try {
          await syncTransportFeesForStudent(db, row.student_id, academicYear);
        } catch (syncErr) {
          console.error(`Transport fee sync failed for student ${row.student_id}:`, syncErr);
        }
      }
    }

    if (!created.length) {
      return NextResponse.json(
        { success: false, error: 'All selected students already have active transport assignments' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      data: created.length === 1 ? created[0] : created,
      created_count: created.length,
      skipped_count: skipped.length,
      message: `Assigned ${created.length} student(s)${skipped.length ? ` (${skipped.length} already assigned)` : ''}`,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating transport assignment:', error);
    const message = error instanceof Error ? error.message : 'Failed to create transport assignment';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
