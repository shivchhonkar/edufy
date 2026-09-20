import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb, type RequestDb } from '@/lib/request-db';
import {
  JOIN_ATTENDANCE_ENROLLMENT,
  JOIN_CURRENT_ENROLLMENT_ON_STUDENT,
  ATTENDANCE_PLACEMENT_SELECT,
} from '@/lib/enrollment-sql';
import {
  prepareEnrollmentSchema,
  resolveEnrollmentWriteContext,
} from '@/lib/enrollment-service';

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await prepareEnrollmentSchema(db);

    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'attendance'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      return NextResponse.json({
        success: false,
        error: 'Student attendance table not found.',
        migration_required: true,
      }, { status: 503 });
    }

    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('student_id');
    const enrollmentId = searchParams.get('enrollment_id');
    const classId = searchParams.get('class_id');
    const sectionId = searchParams.get('section_id');
    const startDate = searchParams.get('start_date') || searchParams.get('date');
    const endDate = searchParams.get('end_date') || searchParams.get('date');
    const status = searchParams.get('status');

    let queryText = `
      SELECT
        a.*,
        s.first_name,
        s.last_name,
        s.admission_number,
        ${ATTENDANCE_PLACEMENT_SELECT},
        c.name AS class_name,
        sec.name AS section_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      ${JOIN_CURRENT_ENROLLMENT_ON_STUDENT}
      ${JOIN_ATTENDANCE_ENROLLMENT}
      LEFT JOIN classes c ON COALESCE(ae.class_id, ce.class_id, s.class_id) = c.id
      LEFT JOIN sections sec ON COALESCE(ae.section_id, ce.section_id, s.section_id) = sec.id
      WHERE 1=1
    `;
    const queryParams: (string | number)[] = [];
    let paramCount = 0;

    if (studentId) {
      paramCount += 1;
      queryText += ` AND a.student_id = $${paramCount}`;
      queryParams.push(studentId);
    }

    if (enrollmentId) {
      paramCount += 1;
      queryText += ` AND a.enrollment_id = $${paramCount}`;
      queryParams.push(enrollmentId);
    }

    if (classId) {
      paramCount += 1;
      queryText += ` AND COALESCE(ae.class_id, ce.class_id, s.class_id) = $${paramCount}`;
      queryParams.push(classId);
    }

    if (sectionId) {
      paramCount += 1;
      queryText += ` AND COALESCE(ae.section_id, ce.section_id, s.section_id) = $${paramCount}`;
      queryParams.push(sectionId);
    }

    if (startDate) {
      paramCount += 1;
      queryText += ` AND a.date >= $${paramCount}`;
      queryParams.push(startDate);
    }

    if (endDate) {
      paramCount += 1;
      queryText += ` AND a.date <= $${paramCount}`;
      queryParams.push(endDate);
    }

    if (status) {
      paramCount += 1;
      queryText += ` AND a.status = $${paramCount}`;
      queryParams.push(status);
    }

    queryText += ' ORDER BY a.date DESC, s.first_name ASC';

    const result = await db.query(queryText, queryParams);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch student attendance records' },
      { status: 500 }
    );
  }
}

import type { RequestDb } from '@/lib/request-db';

async function upsertAttendanceRecord(
  db: RequestDb,
  params: {
    student_id: number;
    date: string;
    status?: string;
    remarks?: string | null;
    marked_by?: number | null;
    enrollment_id?: number | null;
  }
) {
  const writeCtx =
    params.enrollment_id != null
      ? await resolveEnrollmentWriteContext(db, params.student_id, {
          enrollmentId: params.enrollment_id,
        })
      : await resolveEnrollmentWriteContext(db, params.student_id, {
          asOfDate: params.date,
        });

  const enrollmentId = writeCtx?.enrollmentId ?? null;

  if (enrollmentId != null) {
    const existingByEnrollment = await db.query(
      'SELECT id FROM attendance WHERE enrollment_id = $1 AND date = $2',
      [enrollmentId, params.date]
    );

    if (existingByEnrollment.rows.length > 0) {
      const updateResult = await db.query(
        `UPDATE attendance SET
          status = $1,
          remarks = $2,
          marked_by = COALESCE($3, marked_by),
          student_id = $4
        WHERE enrollment_id = $5 AND date = $6
        RETURNING *`,
        [
          params.status || 'present',
          params.remarks || null,
          params.marked_by || null,
          params.student_id,
          enrollmentId,
          params.date,
        ]
      );
      return updateResult.rows[0];
    }
  }

  const existingRecord = await db.query(
    'SELECT id FROM attendance WHERE student_id = $1 AND date = $2',
    [params.student_id, params.date]
  );

  if (existingRecord.rows.length > 0) {
    const updateResult = await db.query(
      `UPDATE attendance SET
        status = $1,
        remarks = $2,
        marked_by = COALESCE($3, marked_by),
        enrollment_id = COALESCE($4, enrollment_id)
      WHERE student_id = $5 AND date = $6
      RETURNING *`,
      [
        params.status || 'present',
        params.remarks || null,
        params.marked_by || null,
        enrollmentId,
        params.student_id,
        params.date,
      ]
    );
    return updateResult.rows[0];
  }

  const insertResult = await db.query(
    `INSERT INTO attendance (student_id, enrollment_id, date, status, remarks, marked_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      params.student_id,
      enrollmentId,
      params.date,
      params.status || 'present',
      params.remarks || null,
      params.marked_by || null,
    ]
  );
  return insertResult.rows[0];
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await prepareEnrollmentSchema(db);
    const body = await request.json();
    const { student_id, date, status, remarks, marked_by, enrollment_id } = body;

    if (!student_id || !date) {
      return NextResponse.json(
        { success: false, error: 'Student ID and date are required' },
        { status: 400 }
      );
    }

    const row = await upsertAttendanceRecord(db, {
      student_id,
      date,
      status,
      remarks,
      marked_by,
      enrollment_id,
    });

    return NextResponse.json({
      success: true,
      data: row,
      message: 'Student attendance recorded successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error saving student attendance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save student attendance record' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await prepareEnrollmentSchema(db);
    const body = await request.json();
    const { attendance_records } = body;

    if (!Array.isArray(attendance_records)) {
      return NextResponse.json(
        { success: false, error: 'attendance_records must be an array' },
        { status: 400 }
      );
    }

    await db.query('BEGIN');

    try {
      const results = [];

      for (const record of attendance_records) {
        const { student_id, date, status, remarks, enrollment_id } = record;

        if (!student_id || !date) continue;

        const row = await upsertAttendanceRecord(db, {
          student_id,
          date,
          status,
          remarks,
          enrollment_id,
        });
        results.push(row);
      }

      await db.query('COMMIT');

      return NextResponse.json({
        success: true,
        data: results,
        message: `Successfully processed ${results.length} attendance records`,
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error bulk updating student attendance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to bulk update student attendance records' },
      { status: 500 }
    );
  }
}
