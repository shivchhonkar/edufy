import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { requireHrRead, requireHrAdmin } from '@/lib/hr-auth';
// GET attendance records with filters
export async function GET(request: NextRequest) {
  try {
    const auth = requireHrRead(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);
    // First check if attendance tables exist
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'staff_attendance'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      return NextResponse.json({
        success: false,
        error: 'Attendance tables not found. Please run the migration first.',
        migration_required: true
      }, { status: 503 });
    }

    const searchParams = request.nextUrl.searchParams;
    const staffId = searchParams.get('staff_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const status = searchParams.get('status');
    const department = searchParams.get('department');

    let queryText = `
      SELECT 
        sa.*,
        s.first_name,
        s.last_name,
        s.employee_id,
        s.department,
        s.designation
      FROM staff_attendance sa
      JOIN staff s ON sa.staff_id = s.id
      WHERE 1=1
    `;
    let queryParams: any[] = [];
    let paramCount = 0;

    if (staffId) {
      paramCount++;
      queryText += ` AND sa.staff_id = $${paramCount}`;
      queryParams.push(staffId);
    }

    if (startDate) {
      paramCount++;
      queryText += ` AND sa.attendance_date >= $${paramCount}`;
      queryParams.push(startDate);
    }

    if (endDate) {
      paramCount++;
      queryText += ` AND sa.attendance_date <= $${paramCount}`;
      queryParams.push(endDate);
    }

    if (status) {
      paramCount++;
      queryText += ` AND sa.status = $${paramCount}`;
      queryParams.push(status);
    }

    if (department) {
      paramCount++;
      queryText += ` AND s.department = $${paramCount}`;
      queryParams.push(department);
    }

    queryText += ' ORDER BY sa.attendance_date DESC, s.first_name ASC';

    const result = await db.query(queryText, queryParams);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch attendance records' },
      { status: 500 }
    );
  }
}

// POST create or update attendance record
export async function POST(request: NextRequest) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);
    const body = await request.json();
    const {
      staff_id,
      attendance_date,
      check_in_time,
      check_out_time,
      break_start_time,
      break_end_time,
      status,
      attendance_type,
      device_id,
      location,
      remarks,
      created_by,
    } = body;

    // Validation
    if (!staff_id || !attendance_date) {
      return NextResponse.json(
        { success: false, error: 'Staff ID and attendance date are required' },
        { status: 400 }
      );
    }

    // Check if attendance record already exists
    const existingRecord = await db.query(
      'SELECT id FROM staff_attendance WHERE staff_id = $1 AND attendance_date = $2',
      [staff_id, attendance_date]
    );

    if (existingRecord.rows.length > 0) {
      // Update existing record
      const updateResult = await db.query(
        `UPDATE staff_attendance SET 
          check_in_time = $1,
          check_out_time = $2,
          break_start_time = $3,
          break_end_time = $4,
          status = $5,
          attendance_type = $6,
          device_id = $7,
          location = $8,
          remarks = $9,
          updated_at = CURRENT_TIMESTAMP
        WHERE staff_id = $10 AND attendance_date = $11
        RETURNING *`,
        [
          check_in_time,
          check_out_time,
          break_start_time,
          break_end_time,
          status || 'present',
          attendance_type || 'manual',
          device_id,
          location,
          remarks,
          staff_id,
          attendance_date,
        ]
      );

      return NextResponse.json({
        success: true,
        data: updateResult.rows[0],
        message: 'Attendance record updated successfully',
      });
    } else {
      // Create new record
      const insertResult = await db.query(
        `INSERT INTO staff_attendance (
          staff_id, attendance_date, check_in_time, check_out_time,
          break_start_time, break_end_time, status, attendance_type,
          device_id, location, remarks, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          staff_id,
          attendance_date,
          check_in_time,
          check_out_time,
          break_start_time,
          break_end_time,
          status || 'present',
          attendance_type || 'manual',
          device_id,
          location,
          remarks,
          created_by,
        ]
      );

      return NextResponse.json({
        success: true,
        data: insertResult.rows[0],
        message: 'Attendance record created successfully',
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Error creating/updating attendance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save attendance record' },
      { status: 500 }
    );
  }
}

// PUT bulk attendance update
export async function PUT(request: NextRequest) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);
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
        const {
          staff_id,
          attendance_date,
          check_in_time,
          check_out_time,
          break_start_time,
          break_end_time,
          status,
          remarks,
          attendance_type,
        } = record;

        // Check if record exists
        const existingRecord = await db.query(
          'SELECT id FROM staff_attendance WHERE staff_id = $1 AND attendance_date = $2',
          [staff_id, attendance_date]
        );

        if (existingRecord.rows.length > 0) {
          // Update existing
          const updateResult = await db.query(
            `UPDATE staff_attendance SET 
              check_in_time = COALESCE($1, check_in_time),
              check_out_time = COALESCE($2, check_out_time),
              break_start_time = COALESCE($3, break_start_time),
              break_end_time = COALESCE($4, break_end_time),
              status = COALESCE($5, status),
              remarks = COALESCE($6, remarks),
              attendance_type = COALESCE($9, attendance_type, 'manual'),
              updated_at = CURRENT_TIMESTAMP
            WHERE staff_id = $7 AND attendance_date = $8
            RETURNING *`,
            [
              check_in_time ?? null,
              check_out_time ?? null,
              break_start_time ?? null,
              break_end_time ?? null,
              status,
              remarks ?? null,
              staff_id,
              attendance_date,
              attendance_type || 'manual',
            ]
          );
          results.push(updateResult.rows[0]);
        } else {
          // Insert new
          const insertResult = await db.query(
            `INSERT INTO staff_attendance (
              staff_id, attendance_date, check_in_time, check_out_time,
              break_start_time, break_end_time, status, remarks, attendance_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [
              staff_id,
              attendance_date,
              check_in_time || null,
              check_out_time || null,
              break_start_time || null,
              break_end_time || null,
              status || 'present',
              remarks || null,
              attendance_type || 'manual',
            ]
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
    console.error('Error bulk updating attendance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to bulk update attendance records' },
      { status: 500 }
    );
  }
}