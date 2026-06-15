import { NextResponse } from 'next/server';
import { query } from '@edulakhya/database';

export async function GET() {
  try {
    // Total vehicles count
    const totalVehicles = await query(
      'SELECT COUNT(*) as count FROM vehicles WHERE status = $1',
      ['active']
    );

    // Active routes count
    const activeRoutes = await query(
      'SELECT COUNT(*) as count FROM routes WHERE status = $1',
      ['active']
    );

    // Students using transport
    const studentsUsingTransport = await query(
      'SELECT COUNT(*) as count FROM student_transport WHERE status = $1',
      ['active']
    );

    // Monthly transport fee total
    const monthlyFee = await query(
      'SELECT COALESCE(SUM(transport_fee), 0) as total FROM student_transport WHERE status = $1',
      ['active']
    );

    // Vehicles needing maintenance (certificates expiring soon)
    const maintenanceNeeded = await query(
      `SELECT * FROM vehicles 
       WHERE status = 'active' 
       AND (
         insurance_expiry < CURRENT_DATE + INTERVAL '30 days'
         OR pollution_certificate_expiry < CURRENT_DATE + INTERVAL '30 days'
         OR fitness_certificate_expiry < CURRENT_DATE + INTERVAL '30 days'
       )
       ORDER BY insurance_expiry
       LIMIT 5`,
      []
    );

    const stats = {
      total_vehicles: parseInt(totalVehicles.rows[0].count),
      active_routes: parseInt(activeRoutes.rows[0].count),
      students_using_transport: parseInt(studentsUsingTransport.rows[0].count),
      monthly_transport_fee: parseFloat(monthlyFee.rows[0].total),
      maintenance_needed: maintenanceNeeded.rows
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


























































