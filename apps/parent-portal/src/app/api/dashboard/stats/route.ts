import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireStudentFromQuery } from '@/lib/require-student-api';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireStudentFromQuery(request);
    if (authResult instanceof NextResponse) return authResult;
    const { studentId } = authResult;

    // Get current academic year
    console.log('Fetching academic year...');
    const academicYearResult = await pool.query(
      'SELECT academic_year FROM system_settings ORDER BY id DESC LIMIT 1'
    );
    const academicYear = academicYearResult.rows[0]?.academic_year || '2025-26';
    console.log('Academic year:', academicYear);

    // Get attendance stats for current month
    console.log('Fetching attendance...');
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    let attendance = { present_days: 0, absent_days: 0, total_days: 0 };
    let attendancePercentage = 0;
    
    try {
      const attendanceResult = await pool.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'present') as present_days,
          COUNT(*) FILTER (WHERE status = 'absent') as absent_days,
          COUNT(*) as total_days
         FROM attendance
         WHERE student_id = $1
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR FROM date) = $3`,
        [studentId, currentMonth, currentYear]
      );

      attendance = attendanceResult.rows[0];
      attendancePercentage = attendance.total_days > 0
        ? Math.round((attendance.present_days / attendance.total_days) * 100)
        : 0;
      console.log('Attendance fetched successfully');
    } catch (attError) {
      console.error('Error fetching attendance:', attError);
      console.log('Using default attendance values');
    }

    // Get fees stats
    console.log('Fetching fees...');
    let fees = { pending_amount: 0, paid_amount: 0, pending_count: 0 };
    
    try {
      const feesResult = await pool.query(
        `SELECT 
          COALESCE(SUM(amount_due - amount_paid + COALESCE(late_fee_amount, 0)), 0) as pending_amount,
          COALESCE(SUM(amount_paid), 0) as paid_amount,
          COUNT(*) FILTER (WHERE amount_due > amount_paid) as pending_count
         FROM student_fees
         WHERE student_id = $1
         AND academic_year = $2`,
        [studentId, academicYear]
      );

      fees = feesResult.rows[0];
      console.log('Fees fetched successfully');
    } catch (feesError) {
      console.error('Error fetching fees:', feesError);
      console.log('Using default fees values');
    }

    // Get student's class
    console.log('Fetching student class...');
    const studentClassResult = await pool.query(
      'SELECT class_id FROM students WHERE id = $1',
      [studentId]
    );

    console.log('Student class result:', studentClassResult.rows);
    console.log('Student class ID:', studentClassResult.rows[0]?.class_id);

    let homework = {
      pending: 0,
      completed: 0,
    };

    if (studentClassResult.rows.length > 0) {
      try {
        const classId = studentClassResult.rows[0].class_id;
        console.log('Student class ID:', classId);

        // First, check if homework table exists and has data for this class
        const allHomeworkResult = await pool.query(
          `SELECT h.id, h.title, h.class_id, h.status 
           FROM homework h 
           WHERE h.class_id = $1`,
          [classId]
        );
        console.log('All homework for class:', allHomeworkResult.rows);

        // Get homework stats - using same approach as super-admin
        const homeworkResult = await pool.query(
          `SELECT 
            COUNT(*) FILTER (WHERE hs.status = 'pending') as pending,
            COUNT(*) FILTER (WHERE hs.status = 'submitted') as submitted,
            COUNT(*) FILTER (WHERE hs.status = 'graded') as graded,
            COUNT(*) as total
           FROM homework h
           LEFT JOIN homework_submissions hs ON hs.homework_id = h.id AND hs.student_id = $1
           WHERE h.class_id = $2`,
          [studentId, classId]
        );

        console.log('Homework stats result:', homeworkResult.rows);

        if (homeworkResult.rows.length > 0) {
          const hwStats = homeworkResult.rows[0];
          homework = {
            pending: parseInt(hwStats.pending) || 0,
            completed: (parseInt(hwStats.submitted) || 0) + (parseInt(hwStats.graded) || 0),
          };
        }
      } catch (homeworkError) {
        console.error('Error fetching homework stats:', homeworkError);
        // If homework tables don't exist, just use default values
        console.log('Using default homework values (tables might not exist yet)');
      }
    }

    // Get grades (placeholder - you'll need to create this table)
    const grades = {
      overall: 'N/A',
      subjects: [],
    };

    // Get recent activity
    console.log('Fetching recent activity...');
    const recentActivity: Array<{
      title: string;
      description: string;
      time: string;
      iconName: string;
      iconColor: string;
      iconBg: string;
    }> = [];

    // Recent fee payments
    try {
      const recentPaymentsResult = await pool.query(
      `SELECT fp.*, sf.fee_type, sf.month
       FROM fee_payments fp
       JOIN student_fees sf ON fp.student_id = sf.student_id 
         AND fp.academic_year = sf.academic_year
       WHERE fp.student_id = $1
       AND fp.status = 'completed'
       ORDER BY fp.payment_date DESC
       LIMIT 3`,
      [studentId]
    );

      recentPaymentsResult.rows.forEach((payment: any) => {
        recentActivity.push({
          title: 'Fee Payment Received',
          description: `${payment.fee_type} - Month ${payment.month}`,
          time: formatTimeAgo(payment.payment_date),
          iconName: 'FiDollarSign',
          iconColor: 'text-green-600',
          iconBg: 'bg-green-100',
        });
      });
    } catch (paymentsError) {
      console.error('Error fetching recent payments:', paymentsError);
    }

    // Recent attendance
    try {
      const recentAttendanceResult = await pool.query(
      `SELECT * FROM attendance
       WHERE student_id = $1
       AND status = 'present'
       ORDER BY date DESC
       LIMIT 3`,
      [studentId]
    );

      recentAttendanceResult.rows.forEach((att: any) => {
        recentActivity.push({
          title: 'Attendance Marked',
          description: `Present - ${new Date(att.date).toLocaleDateString('en-IN')}`,
          time: formatTimeAgo(att.date),
          iconName: 'FiCalendar',
          iconColor: 'text-purple-600',
          iconBg: 'bg-purple-100',
        });
      });
    } catch (attendanceActivityError) {
      console.error('Error fetching recent attendance:', attendanceActivityError);
    }

    // Recent homework assignments
    if (studentClassResult.rows.length > 0) {
      try {
        const classId = studentClassResult.rows[0].class_id;
        const recentHomeworkResult = await pool.query(
          `SELECT h.*, s.name as subject_name, hs.status as submission_status
           FROM homework h
           LEFT JOIN subjects s ON h.subject_id = s.id
           LEFT JOIN homework_submissions hs ON hs.homework_id = h.id AND hs.student_id = $1
           WHERE h.class_id = $2
           ORDER BY h.assigned_date DESC NULLS LAST, h.created_at DESC
           LIMIT 3`,
          [studentId, classId]
        );

        recentHomeworkResult.rows.forEach((hw: any) => {
          const statusText = hw.submission_status === 'graded' ? 'Graded' :
                            hw.submission_status === 'submitted' ? 'Submitted' : 'New Assignment';
          recentActivity.push({
            title: `Homework - ${hw.subject_name}`,
            description: `${hw.title} - ${statusText}`,
            time: formatTimeAgo(hw.assigned_date || hw.created_at),
            iconName: 'FiBook',
            iconColor: hw.submission_status === 'pending' ? 'text-yellow-600' : 'text-blue-600',
            iconBg: hw.submission_status === 'pending' ? 'bg-yellow-100' : 'bg-blue-100',
          });
        });
      } catch (homeworkActivityError) {
        console.error('Error fetching recent homework:', homeworkActivityError);
        // Continue without homework in activity feed
      }
    }

    // Sort recent activity by time
    recentActivity.sort((a, b) => {
      // This is a simple sort, you might want to use actual timestamps
      return 0;
    });

    console.log('=== Dashboard Stats Success ===');
    console.log('Homework pending:', homework.pending);
    
    return NextResponse.json({
      success: true,
      data: {
        attendance: {
          percentage: `${attendancePercentage}%`,
          presentDays: Number(attendance.present_days) || 0,
          totalDays: Number(attendance.total_days) || 0,
          trend: {
            value: attendancePercentage > 75 ? '+5%' : '-3%',
            isPositive: attendancePercentage > 75,
          },
        },
        fees: {
          pending: Number(fees.pending_amount) || 0,
          paid: Number(fees.paid_amount) || 0,
          pendingCount: Number(fees.pending_count) || 0,
        },
        homework,
        grades,
        recentActivity: recentActivity.slice(0, 5),
      },
    });
  } catch (error: any) {
    console.error('=== FATAL ERROR in Dashboard Stats API ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard stats', details: error.message },
      { status: 500 }
    );
  }
}

function formatTimeAgo(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const diffInMs = now.getTime() - past.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  
  return past.toLocaleDateString('en-IN');
}


