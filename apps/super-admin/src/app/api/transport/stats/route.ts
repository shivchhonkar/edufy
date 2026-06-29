import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';

export async function GET(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    const totalVehicles = await db.query(
      'SELECT COUNT(*) as count FROM vehicles WHERE status = $1',
      ['active'],
    );

    const activeRoutes = await db.query(
      'SELECT COUNT(*) as count FROM routes WHERE status = $1',
      ['active'],
    );

    const studentsUsingTransport = await db.query(
      'SELECT COUNT(*) as count FROM student_transport WHERE status = $1',
      ['active'],
    );

    const monthlyFee = await db.query(
      'SELECT COALESCE(SUM(transport_fee), 0) as total FROM student_transport WHERE status = $1',
      ['active'],
    );

    const maintenanceNeeded = await db.query(
      `SELECT * FROM vehicles 
       WHERE status = 'active' 
       AND (
         insurance_expiry < CURRENT_DATE + INTERVAL '30 days'
         OR pollution_certificate_expiry < CURRENT_DATE + INTERVAL '30 days'
         OR fitness_certificate_expiry < CURRENT_DATE + INTERVAL '30 days'
       )
       ORDER BY insurance_expiry
       LIMIT 5`,
    );

    const stats = {
      total_vehicles: parseInt(String(totalVehicles.rows[0]?.count ?? 0), 10),
      active_routes: parseInt(String(activeRoutes.rows[0]?.count ?? 0), 10),
      students_using_transport: parseInt(String(studentsUsingTransport.rows[0]?.count ?? 0), 10),
      monthly_transport_fee: parseFloat(String(monthlyFee.rows[0]?.total ?? 0)),
      maintenance_needed: maintenanceNeeded.rows,
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
