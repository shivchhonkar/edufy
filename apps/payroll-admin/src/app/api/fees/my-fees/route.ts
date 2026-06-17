import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { requireAuth, HR_ADMIN_ROLES } from '@/lib/api-auth';
import { hasRole } from '@/lib/auth';

// GET student's own fees (admin/staff only — student portal uses parent app)
export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request, auth.user.tenant_id);
    // TODO: Get student_id from JWT token/session
    // For now, accepting student_id from query params
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('student_id');
    const academicYear = searchParams.get('academic_year') || new Date().getFullYear().toString();

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'Student ID is required' },
        { status: 400 }
      );
    }

    if (!hasRole(auth.user.role || '', [...HR_ADMIN_ROLES, 'teacher', 'accountant'])) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get student info
    const studentResult = await db.query(
      `SELECT s.*, c.name as class_name, sec.name as section_name
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN sections sec ON s.section_id = sec.id
       WHERE s.id = $1`,
      [studentId]
    );

    if (studentResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    const student = studentResult.rows[0];

    // Get all fee records for the student
    const feesResult = await db.query(
      `SELECT sf.*, 
              fs.fee_type, fs.frequency,
              fc.name as category_name
       FROM student_fees sf
       LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
       LEFT JOIN fee_categories fc ON fs.category_id = fc.id
       WHERE sf.student_id = $1 AND sf.academic_year = $2
       ORDER BY sf.due_date DESC`,
      [studentId, academicYear]
    );

    // Calculate late fees for each record
    const feesWithLateFees = await Promise.all(
      feesResult.rows.map(async (fee: any) => {
        if (fee.status === 'overdue' || fee.status === 'partial') {
          const lateFeeResult = await db.query(
            'SELECT calculate_late_fee($1) as late_fee',
            [fee.id]
          );
          fee.calculated_late_fee = lateFeeResult.rows[0]?.late_fee || 0;
        } else {
          fee.calculated_late_fee = 0;
        }
        return fee;
      })
    );

    // Get payment history
    const paymentsResult = await db.query(
      `SELECT fp.*, fs.fee_type, fc.name as category_name
       FROM fee_payments fp
       LEFT JOIN fee_structures fs ON fp.fee_structure_id = fs.id
       LEFT JOIN fee_categories fc ON fs.category_id = fc.id
       WHERE fp.student_id = $1 AND fp.status = 'completed'
       AND fp.academic_year = $2
       ORDER BY fp.payment_date DESC`,
      [studentId, academicYear]
    );

    // Get transport fee if applicable
    const transportResult = await db.query(
      `SELECT st.*, r.route_name, rs.stop_name, rs.pickup_fee
       FROM student_transport st
       LEFT JOIN routes r ON st.route_id = r.id
       LEFT JOIN route_stops rs ON st.stop_id = rs.id
       WHERE st.student_id = $1 AND st.status = 'active'`,
      [studentId]
    );

    // Calculate summary
    const pendingFees = feesWithLateFees.filter(f => ['pending', 'partial', 'overdue'].includes(f.status));
    const totalPending = pendingFees.reduce((sum, f) => sum + (f.amount_due - f.amount_paid), 0);
    const totalPaid = paymentsResult.rows.reduce((sum, p) => sum + p.amount_paid, 0);
    const totalLateFees = feesWithLateFees.reduce((sum, f) => sum + (f.calculated_late_fee || 0), 0);
    const overdueFees = feesWithLateFees.filter(f => f.status === 'overdue');
    const totalOverdue = overdueFees.reduce((sum, f) => sum + (f.amount_due - f.amount_paid), 0);

    // Monthly breakdown
    const monthlyBreakdown = feesWithLateFees.reduce((acc: any, fee) => {
      if (fee.month) {
        if (!acc[fee.month]) {
          acc[fee.month] = {
            month: fee.month,
            total_due: 0,
            total_paid: 0,
            fees: []
          };
        }
        acc[fee.month].total_due += fee.amount_due;
        acc[fee.month].total_paid += fee.amount_paid;
        acc[fee.month].fees.push(fee);
      }
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: {
        student: {
          id: student.id,
          name: `${student.first_name} ${student.last_name}`,
          admission_number: student.admission_number,
          class: student.class_name,
          section: student.section_name,
        },
        summary: {
          total_pending: totalPending,
          total_paid: totalPaid,
          total_late_fees: totalLateFees,
          total_overdue: totalOverdue,
          pending_count: pendingFees.length,
          overdue_count: overdueFees.length,
        },
        fees: feesWithLateFees,
        payments: paymentsResult.rows,
        transport: transportResult.rows[0] || null,
        monthly_breakdown: Object.values(monthlyBreakdown),
      },
    });
  } catch (error) {
    console.error('Error fetching student fees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch student fees' },
      { status: 500 }
    );
  }
}

