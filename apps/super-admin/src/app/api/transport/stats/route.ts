import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { ensureTransportSchema } from '@/lib/ensure-transport-schema';
import { ensureFeeSchema } from '@/lib/ensure-fee-schema';
import { resolveAcademicYear } from '@/lib/ensure-system-settings';
import { academicYearFilterValues } from '@/lib/fees/AcademicYear';

function parseCount(value: unknown) {
  return parseInt(String(value ?? 0), 10) || 0;
}

function parseAmount(value: unknown) {
  return parseFloat(String(value ?? 0)) || 0;
}

function tripStatusForRoute(hasVehicle: boolean) {
  if (!hasVehicle) return 'not_started';
  const hour = new Date().getHours();
  if (hour >= 10) return 'completed';
  if (hour >= 7) return 'on_time';
  return 'not_started';
}

export async function GET(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    await ensureTransportSchema(db);
    await ensureFeeSchema(db);

    const academicYear = await resolveAcademicYear(db, null);
    const yearFilter = academicYearFilterValues(academicYear);
    const currentMonth = new Date().getMonth() + 1;
    const today = new Date().toISOString().split('T')[0];

    const [
      vehicleCounts,
      routeCounts,
      stopCount,
      studentTransportCounts,
      monthlyFee,
      driverCounts,
      assignedVehicles,
      maintenanceNeeded,
      attendanceToday,
      upcomingTrips,
      todayTrips,
      feeOverview,
      overdueStudents,
    ] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'active')::int AS active,
          COUNT(*) FILTER (WHERE status IS DISTINCT FROM 'active')::int AS inactive
        FROM vehicles
      `),
      db.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'active')::int AS active,
          COUNT(*) FILTER (WHERE status IS DISTINCT FROM 'active')::int AS inactive
        FROM routes
      `),
      db.query('SELECT COUNT(*)::int AS count FROM route_stops'),
      db.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'active')::int AS active,
          COUNT(DISTINCT route_id) FILTER (WHERE status = 'active')::int AS active_routes
        FROM student_transport
      `),
      db.query(
        `SELECT COALESCE(SUM(transport_fee), 0) AS total
         FROM student_transport WHERE status = 'active'`,
      ),
      db.query(`
        SELECT
          (SELECT COUNT(*)::int FROM drivers) AS table_drivers,
          (SELECT COUNT(DISTINCT driver_name)::int FROM vehicles
           WHERE driver_name IS NOT NULL AND TRIM(driver_name) <> '') AS vehicle_drivers
      `),
      db.query(`
        SELECT COUNT(DISTINCT vehicle_id)::int AS count
        FROM vehicle_assignments
        WHERE status = 'active'
      `),
      db.query(
        `SELECT id, vehicle_number, vehicle_type, insurance_expiry,
                pollution_certificate_expiry, fitness_certificate_expiry
         FROM vehicles
         WHERE status = 'active'
         AND (
           insurance_expiry < CURRENT_DATE + INTERVAL '30 days'
           OR pollution_certificate_expiry < CURRENT_DATE + INTERVAL '30 days'
           OR fitness_certificate_expiry < CURRENT_DATE + INTERVAL '30 days'
         )
         ORDER BY insurance_expiry
         LIMIT 5`,
      ),
      db.query(
        `SELECT
           COUNT(*) FILTER (
             WHERE a.status IN ('present', 'late', 'half_day')
           )::int AS present,
           COUNT(*) FILTER (WHERE a.status = 'absent')::int AS absent,
           COUNT(*) FILTER (WHERE a.status = 'on_leave')::int AS cancelled,
           COUNT(*) FILTER (WHERE a.id IS NULL)::int AS yet_to_board,
           COUNT(*)::int AS total
         FROM student_transport st
         JOIN students s ON s.id = st.student_id
         LEFT JOIN attendance a ON a.student_id = s.id AND a.date = CURRENT_DATE
         WHERE st.status = 'active'`,
      ),
      db.query(
        `SELECT r.id, r.route_name, r.route_number, r.starting_point, r.ending_point,
                MIN(rs.arrival_time) AS trip_time
         FROM routes r
         JOIN route_stops rs ON rs.route_id = r.id
         WHERE r.status = 'active'
         GROUP BY r.id, r.route_name, r.route_number, r.starting_point, r.ending_point
         ORDER BY MIN(rs.arrival_time) NULLS LAST, r.route_name
         LIMIT 6`,
      ),
      db.query(
        `SELECT r.id, r.route_name, r.route_number,
                r.starting_point, r.ending_point,
                v.vehicle_number, v.driver_name,
                COUNT(DISTINCT st.student_id)::int AS student_count,
                BOOL_OR(va.id IS NOT NULL) AS has_vehicle
         FROM routes r
         LEFT JOIN vehicle_assignments va ON va.route_id = r.id AND va.status = 'active'
         LEFT JOIN vehicles v ON v.id = va.vehicle_id
         LEFT JOIN student_transport st ON st.route_id = r.id AND st.status = 'active'
         WHERE r.status = 'active'
         GROUP BY r.id, r.route_name, r.route_number, r.starting_point, r.ending_point,
                  v.vehicle_number, v.driver_name
         ORDER BY r.route_name
         LIMIT 8`,
      ),
      db.query(
        `SELECT
           COALESCE(SUM(sf.amount_due), 0) AS total_due,
           COALESCE(SUM(sf.amount_paid), 0) AS total_paid
         FROM student_fees sf
         JOIN fee_structures fs ON sf.fee_structure_id = fs.id
         WHERE sf.academic_year = ANY($1::text[])
           AND sf.month = $2
           AND fs.fee_type ILIKE '%transport%'`,
        [yearFilter, currentMonth],
      ),
      db.query(
        `SELECT s.id AS student_id, s.first_name, s.last_name,
                r.route_name,
                GREATEST(0, sf.amount_due - sf.amount_paid) AS due_amount,
                sf.due_date
         FROM student_fees sf
         JOIN students s ON s.id = sf.student_id
         JOIN fee_structures fs ON sf.fee_structure_id = fs.id
         LEFT JOIN student_transport st ON st.student_id = s.id AND st.status = 'active'
         LEFT JOIN routes r ON r.id = st.route_id
         WHERE sf.academic_year = ANY($1::text[])
           AND fs.fee_type ILIKE '%transport%'
           AND sf.amount_due > sf.amount_paid
           AND sf.due_date < CURRENT_DATE
           AND sf.status NOT IN ('exempted', 'paid')
         ORDER BY sf.due_date ASC
         LIMIT 6`,
        [yearFilter],
      ),
    ]);

    const vehicles = vehicleCounts.rows[0] || {};
    const routes = routeCounts.rows[0] || {};
    const students = studentTransportCounts.rows[0] || {};
    const driversRow = driverCounts.rows[0] || {};
    const totalDrivers = Math.max(
      parseCount(driversRow.table_drivers),
      parseCount(driversRow.vehicle_drivers),
    );
    const activeDrivers = parseCount(driversRow.vehicle_drivers);
    const inactiveDrivers = Math.max(0, totalDrivers - activeDrivers);

    const totalVehicleCount = parseCount(vehicles.total);
    const vehiclesInUse = parseCount(assignedVehicles.rows[0]?.count);
    const vehiclesIdle = Math.max(0, totalVehicleCount - vehiclesInUse);
    const utilizationPercent =
      totalVehicleCount > 0 ? Math.round((vehiclesInUse / totalVehicleCount) * 100) : 0;

    const attendance = attendanceToday.rows[0] || {};
    const attendanceTotal = parseCount(attendance.total) || 1;

    const feeRow = feeOverview.rows[0] || {};
    const totalDue = parseAmount(feeRow.total_due);
    const totalPaid = parseAmount(feeRow.total_paid);
    const pendingAmount = Math.max(0, totalDue - totalPaid);
    const overdueAmount = overdueStudents.rows.reduce(
      (sum, row) => sum + parseAmount(row.due_amount),
      0,
    );

    const stats = {
      vehicles: {
        total: parseCount(vehicles.total),
        active: parseCount(vehicles.active),
        inactive: parseCount(vehicles.inactive),
      },
      drivers: {
        total: totalDrivers,
        active: activeDrivers,
        inactive: inactiveDrivers,
      },
      routes: {
        total: parseCount(routes.total),
        active: parseCount(routes.active),
        inactive: parseCount(routes.inactive),
        running: parseCount(routes.active),
      },
      students: {
        total: parseCount(students.total),
        active: parseCount(students.active),
        active_routes: parseCount(students.active_routes),
        total_stops: parseCount(stopCount.rows[0]?.count),
      },
      monthly_transport_fee: parseAmount(monthlyFee.rows[0]?.total),
      // Legacy fields for reports page
      total_vehicles: parseCount(vehicles.active),
      active_routes: parseCount(routes.active),
      students_using_transport: parseCount(students.active),
      utilization: {
        percent: utilizationPercent,
        in_use: vehiclesInUse,
        idle: vehiclesIdle,
        total: totalVehicleCount,
      },
      attendance_today: {
        present: parseCount(attendance.present),
        absent: parseCount(attendance.absent),
        yet_to_board: parseCount(attendance.yet_to_board),
        cancelled: parseCount(attendance.cancelled),
        total: parseCount(attendance.total),
        present_percent: Math.round((parseCount(attendance.present) / attendanceTotal) * 1000) / 10,
        absent_percent: Math.round((parseCount(attendance.absent) / attendanceTotal) * 1000) / 10,
        yet_to_board_percent:
          Math.round((parseCount(attendance.yet_to_board) / attendanceTotal) * 1000) / 10,
        cancelled_percent:
          Math.round((parseCount(attendance.cancelled) / attendanceTotal) * 1000) / 10,
      },
      upcoming_trips: upcomingTrips.rows.map((row) => ({
        id: row.id,
        route_name: row.route_name,
        route_number: row.route_number,
        label: [row.route_number, row.route_name].filter(Boolean).join(' - '),
        path: [row.starting_point, row.ending_point].filter(Boolean).join(' → '),
        trip_time: row.trip_time,
      })),
      today_trips: todayTrips.rows.map((row) => ({
        id: row.id,
        route_name: row.route_name,
        route_number: row.route_number,
        route_label: [row.route_number, row.route_name].filter(Boolean).join(' - '),
        driver_name: row.driver_name || '—',
        vehicle_number: row.vehicle_number || '—',
        trip: 'Morning',
        status: tripStatusForRoute(Boolean(row.has_vehicle)),
        student_count: parseCount(row.student_count),
      })),
      fee_collection: {
        total_due: totalDue,
        collected: totalPaid,
        pending: pendingAmount,
        overdue: overdueAmount,
        overdue_students_count: overdueStudents.rows.length,
        collected_percent: totalDue > 0 ? Math.round((totalPaid / totalDue) * 1000) / 10 : 0,
        pending_percent: totalDue > 0 ? Math.round((pendingAmount / totalDue) * 1000) / 10 : 0,
        overdue_percent: totalDue > 0 ? Math.round((overdueAmount / totalDue) * 1000) / 10 : 0,
      },
      overdue_students: overdueStudents.rows.map((row) => ({
        student_id: row.student_id,
        name: `${row.first_name} ${row.last_name}`.trim(),
        route_name: row.route_name || '—',
        due_amount: parseAmount(row.due_amount),
        due_date: row.due_date,
      })),
      maintenance_needed: maintenanceNeeded.rows,
      last_updated: new Date().toISOString(),
      academic_year: academicYear,
      report_date: today,
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching transport stats:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load stats' },
      { status: 500 },
    );
  }
}
