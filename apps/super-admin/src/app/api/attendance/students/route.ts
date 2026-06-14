import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);

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
        s.class_id,
        s.section_id,
        c.name AS class_name,
        sec.name AS section_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      WHERE 1=1
    `;
    const queryParams: (string | number)[] = [];
    let paramCount = 0;

    if (studentId) {
      paramCount += 1;
      queryText += ` AND a.student_id = $${paramCount}`;
      queryParams.push(studentId);
    }

    if (classId) {
      paramCount += 1;
      queryText += ` AND s.class_id = $${paramCount}`;
      queryParams.push(classId);
    }

    if (sectionId) {
      paramCount += 1;
      queryText += ` AND s.section_id = $${paramCount}`;
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

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const { student_id, date, status, remarks, marked_by } = body;

    if (!student_id || !date) {
      return NextResponse.json(
        { success: false, error: 'Student ID and date are required' },
        { status: 400 }
      );
    }

    const existingRecord = await db.query(
      'SELECT id FROM attendance WHERE student_id = $1 AND date = $2',
      [student_id, date]
    );

    if (existingRecord.rows.length > 0) {
      const updateResult = await db.query(
        `UPDATE attendance SET
          status = $1,
          remarks = $2,
          marked_by = COALESCE($3, marked_by)
        WHERE student_id = $4 AND date = $5
        RETURNING *`,
        [status || 'present', remarks || null, marked_by || null, student_id, date]
      );

      return NextResponse.json({
        success: true,
        data: updateResult.rows[0],
        message: 'Student attendance updated successfully',
      });
    }

    const insertResult = await db.query(
      `INSERT INTO attendance (student_id, date, status, remarks, marked_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [student_id, date, status || 'present', remarks || null, marked_by || null]
    );

    return NextResponse.json({
      success: true,
      data: insertResult.rows[0],
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
        const { student_id, date, status, remarks } = record;

        if (!student_id || !date) continue;

        const existingRecord = await db.query(
          'SELECT id FROM attendance WHERE student_id = $1 AND date = $2',
          [student_id, date]
        );

        if (existingRecord.rows.length > 0) {
          const updateResult = await db.query(
            `UPDATE attendance SET status = $1, remarks = $2
             WHERE student_id = $3 AND date = $4
             RETURNING *`,
            [status || 'present', remarks || null, student_id, date]
          );
          results.push(updateResult.rows[0]);
        } else {
          const insertResult = await db.query(
            `INSERT INTO attendance (student_id, date, status, remarks)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [student_id, date, status || 'present', remarks || null]
          );
          results.push(insertResult.rows[0]);
        }
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
