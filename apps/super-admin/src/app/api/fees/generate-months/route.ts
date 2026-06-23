import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { FeeGenerationService } from '@/lib/fees/FeeGenerationService';

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const { student_id, academic_year, months } = body;

    if (!student_id || !academic_year || !months || months.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Required fields are missing' },
        { status: 400 }
      );
    }

    const studentResult = await db.query('SELECT id FROM students WHERE id = $1', [student_id]);
    if (studentResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const transportResult = await db.query(
      `SELECT st.*, rs.pickup_fee, r.route_name
       FROM student_transport st
       LEFT JOIN route_stops rs ON st.stop_id = rs.id
       LEFT JOIN routes r ON st.route_id = r.id
       WHERE st.student_id = $1 AND st.status = 'active'`,
      [student_id]
    );

    const result = await FeeGenerationService.generateMonths(db, {
      academicYear: academic_year,
      months,
      studentIds: [student_id],
      monthlyOnly: true,
      conflictStrategy: 'touch',
    });

    return NextResponse.json({
      success: true,
      data: {
        created_count: result.createdFees.length,
        student_has_transport: transportResult.rows.length > 0,
        transport_fee:
          transportResult.rows[0]?.pickup_fee || transportResult.rows[0]?.monthly_fee || null,
      },
      message: `Generated/verified fees for ${months.length} month(s)`,
    });
  } catch (error) {
    console.error('Error generating monthly fees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate monthly fees' },
      { status: 500 }
    );
  }
}
