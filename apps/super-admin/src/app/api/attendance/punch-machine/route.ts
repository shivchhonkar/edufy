import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
// GET punch machine logs
export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const searchParams = request.nextUrl.searchParams;
    const deviceId = searchParams.get('device_id');
    const staffId = searchParams.get('staff_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const processed = searchParams.get('processed');

    let queryText = `
      SELECT 
        pml.*,
        s.first_name,
        s.last_name,
        s.employee_id,
        pm.device_name,
        pm.location as device_location
      FROM punch_machine_logs pml
      JOIN staff s ON pml.staff_id = s.id
      JOIN punch_machines pm ON pml.device_id = pm.device_id
      WHERE 1=1
    `;
    let queryParams: any[] = [];
    let paramCount = 0;

    if (deviceId) {
      paramCount++;
      queryText += ` AND pml.device_id = $${paramCount}`;
      queryParams.push(deviceId);
    }

    if (staffId) {
      paramCount++;
      queryText += ` AND pml.staff_id = $${paramCount}`;
      queryParams.push(staffId);
    }

    if (startDate) {
      paramCount++;
      queryText += ` AND DATE(pml.punch_time) >= $${paramCount}`;
      queryParams.push(startDate);
    }

    if (endDate) {
      paramCount++;
      queryText += ` AND DATE(pml.punch_time) <= $${paramCount}`;
      queryParams.push(endDate);
    }

    if (processed !== null) {
      paramCount++;
      queryText += ` AND pml.processed = $${paramCount}`;
      queryParams.push(processed === 'true');
    }

    queryText += ' ORDER BY pml.punch_time DESC';

    const result = await db.query(queryText, queryParams);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching punch machine logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch punch machine logs' },
      { status: 500 }
    );
  }
}

// POST receive punch machine data
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const {
      device_id,
      staff_id,
      punch_time,
      punch_type,
      raw_data,
      location,
    } = body;

    // Validation
    if (!device_id || !staff_id || !punch_time) {
      return NextResponse.json(
        { success: false, error: 'Device ID, Staff ID, and Punch Time are required' },
        { status: 400 }
      );
    }

    // Verify device exists and is active
    const deviceResult = await db.query(
      'SELECT * FROM punch_machines WHERE device_id = $1 AND status = $2',
      [device_id, 'active']
    );

    if (deviceResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or inactive device' },
        { status: 400 }
      );
    }

    // Verify staff exists
    const staffResult = await db.query(
      'SELECT id, employee_id FROM staff WHERE id = $1',
      [staff_id]
    );

    if (staffResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid staff ID' },
        { status: 400 }
      );
    }

    // Insert punch log
    const logResult = await db.query(
      `INSERT INTO punch_machine_logs (
        device_id, staff_id, punch_time, punch_type, raw_data, location
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        device_id,
        staff_id,
        punch_time,
        punch_type || 'check_in',
        raw_data ? JSON.stringify(raw_data) : null,
        location,
      ]
    );

    // Update device last sync time
    await db.query(
      'UPDATE punch_machines SET last_sync = CURRENT_TIMESTAMP WHERE device_id = $1',
      [device_id]
    );

    return NextResponse.json({
      success: true,
      data: logResult.rows[0],
      message: 'Punch data recorded successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error recording punch data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record punch data' },
      { status: 500 }
    );
  }
}

// PUT process punch machine logs to attendance
export async function PUT(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const { log_ids, auto_approve = false } = body;

    if (!Array.isArray(log_ids)) {
      return NextResponse.json(
        { success: false, error: 'log_ids must be an array' },
        { status: 400 }
      );
    }

    await db.query('BEGIN');

    try {
      const processedRecords = [];

      for (const logId of log_ids) {
        // Get the punch log
        const logResult = await db.query(
          'SELECT * FROM punch_machine_logs WHERE id = $1 AND processed = FALSE',
          [logId]
        );

        if (logResult.rows.length === 0) continue;

        const log = logResult.rows[0];
        const punchDate = new Date(log.punch_time).toISOString().split('T')[0];
        const punchTime = new Date(log.punch_time).toTimeString().split(' ')[0];

        // Check if attendance record exists for this date
        const attendanceResult = await db.query(
          'SELECT * FROM staff_attendance WHERE staff_id = $1 AND attendance_date = $2',
          [log.staff_id, punchDate]
        );

        if (attendanceResult.rows.length > 0) {
          // Update existing attendance record
          const attendance = attendanceResult.rows[0];
          let updateFields = {};
          
          if (log.punch_type === 'check_in' && (!attendance.check_in_time || punchTime < attendance.check_in_time)) {
            updateFields = { check_in_time: punchTime };
          } else if (log.punch_type === 'check_out' && (!attendance.check_out_time || punchTime > attendance.check_out_time)) {
            updateFields = { check_out_time: punchTime };
          } else if (log.punch_type === 'break_start') {
            updateFields = { break_start_time: punchTime };
          } else if (log.punch_type === 'break_end') {
            updateFields = { break_end_time: punchTime };
          }

          if (Object.keys(updateFields).length > 0) {
            const updateQuery = `UPDATE staff_attendance SET 
              ${Object.keys(updateFields).map((key, index) => `${key} = $${index + 1}`).join(', ')},
              attendance_type = 'punch_machine',
              device_id = $${Object.keys(updateFields).length + 1},
              location = $${Object.keys(updateFields).length + 2},
              updated_at = CURRENT_TIMESTAMP
            WHERE staff_id = $${Object.keys(updateFields).length + 3} AND attendance_date = $${Object.keys(updateFields).length + 4}
            RETURNING *`;

            const updateResult = await db.query(updateQuery, [
              ...Object.values(updateFields),
              log.device_id,
              log.location,
              log.staff_id,
              punchDate,
            ]);

            processedRecords.push(updateResult.rows[0]);
          }
        } else {
          // Create new attendance record
          const insertFields = {
            staff_id: log.staff_id,
            attendance_date: punchDate,
            attendance_type: 'punch_machine',
            device_id: log.device_id,
            location: log.location,
          };

          if (log.punch_type === 'check_in') {
            insertFields.check_in_time = punchTime;
          } else if (log.punch_type === 'check_out') {
            insertFields.check_out_time = punchTime;
          } else if (log.punch_type === 'break_start') {
            insertFields.break_start_time = punchTime;
          } else if (log.punch_type === 'break_end') {
            insertFields.break_end_time = punchTime;
          }

          const insertResult = await db.query(
            `INSERT INTO staff_attendance (${Object.keys(insertFields).join(', ')})
            VALUES (${Object.keys(insertFields).map((_, index) => `$${index + 1}`).join(', ')})
            RETURNING *`,
            Object.values(insertFields)
          );

          processedRecords.push(insertResult.rows[0]);
        }

        // Mark log as processed
        await db.query(
          'UPDATE punch_machine_logs SET processed = TRUE WHERE id = $1',
          [logId]
        );
      }

      await db.query('COMMIT');

      return NextResponse.json({
        success: true,
        data: processedRecords,
        message: `Successfully processed ${processedRecords.length} punch logs`,
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error processing punch logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process punch logs' },
      { status: 500 }
    );
  }
}








