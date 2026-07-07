import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureTransportSchema } from '@/lib/ensure-transport-schema';
import { ensureFeeSchema } from '@/lib/ensure-fee-schema';
import { resolveAcademicYear } from '@/lib/ensure-system-settings';
import { syncTransportFeesForStudent } from '@/lib/transport-fee-sync';
import {
  ACADEMIC_MONTH_SEQUENCE,
  academicYearFilterValues,
  calendarYearForMonth,
  getCalendarMonthName,
  parseAcademicYear,
} from '@/lib/fees/AcademicYear';

function parseStudentId(value: string) {
  const id = parseInt(value, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function monthPeriodLabel(academicYear: string, calendarMonth: number) {
  const parsed = parseAcademicYear(academicYear);
  const year = calendarYearForMonth(parsed, calendarMonth);
  const start = new Date(year, calendarMonth - 1, 1);
  const end = new Date(year, calendarMonth, 0);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).replace(/ /g, ' ');
  return `${fmt(start)} - ${fmt(end)}`;
}

function monthHeading(academicYear: string, calendarMonth: number) {
  const parsed = parseAcademicYear(academicYear);
  const year = calendarYearForMonth(parsed, calendarMonth);
  return `${getCalendarMonthName(calendarMonth)} ${year}`;
}

function stopCode(stopName: string | null | undefined, stopOrder: number | null | undefined) {
  if (!stopName) return null;
  const initials = stopName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 3);
  const order = String(stopOrder ?? 0).padStart(2, '0');
  return `${initials || 'ST'}-${order}`;
}

function scheduleStatus(
  amountDue: number,
  amountPaid: number,
  dueDate: string | null,
  feeStatus: string | null,
) {
  if (feeStatus === 'exempted') return 'exempted';
  if (amountPaid >= amountDue && amountDue > 0) return 'paid';
  if (amountDue <= 0) return 'paid';
  if (dueDate) {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    if (due < today && amountPaid < amountDue) return 'due';
  }
  return 'pending';
}

function academicMonthSort(month: number) {
  const index = ACADEMIC_MONTH_SEQUENCE.indexOf(month);
  return index === -1 ? month + 100 : index;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { studentId: string } },
) {
  try {
    const studentId = parseStudentId(params.studentId);
    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Invalid student id' }, { status: 400 });
    }

    const { db } = await getRequestDb(request);
    await ensureTransportSchema(db);
    await ensureFeeSchema(db);

    const academicYear = await resolveAcademicYear(
      db,
      request.nextUrl.searchParams.get('academic_year'),
    );
    const yearFilter = academicYearFilterValues(academicYear);

    const studentResult = await db.query(
      `SELECT s.id, s.first_name, s.last_name, s.admission_number, s.roll_number, s.photo_url,
              s.parent_phone, c.name AS class_name, sec.name AS section_name
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN sections sec ON s.section_id = sec.id
       WHERE s.id = $1`,
      [studentId],
    );

    if (!studentResult.rows.length) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const assignmentResult = await db.query(
      `SELECT st.id AS assignment_id, st.student_id, st.route_id, st.stop_id, st.transport_fee,
              st.start_date, st.end_date, st.status,
              r.route_name, r.route_number,
              rs.stop_name, rs.stop_order, rs.arrival_time, rs.pickup_fee,
              v.vehicle_number, v.vehicle_type, v.model, v.id AS vehicle_id,
              v.driver_name, v.driver_phone
       FROM student_transport st
       JOIN routes r ON st.route_id = r.id
       LEFT JOIN route_stops rs ON st.stop_id = rs.id
       LEFT JOIN LATERAL (
         SELECT va.vehicle_id
         FROM vehicle_assignments va
         WHERE va.route_id = st.route_id AND va.status = 'active'
         ORDER BY va.assigned_date DESC, va.id DESC
         LIMIT 1
       ) active_va ON true
       LEFT JOIN vehicles v ON v.id = active_va.vehicle_id
       WHERE st.student_id = $1
       ORDER BY CASE WHEN st.status = 'active' THEN 0 ELSE 1 END, st.start_date DESC, st.id DESC
       LIMIT 1`,
      [studentId],
    );

    if (!assignmentResult.rows.length) {
      return NextResponse.json(
        { success: false, error: 'No transport assignment found for this student' },
        { status: 404 },
      );
    }

    await syncTransportFeesForStudent(db, studentId, academicYear);

    const feesResult = await db.query(
      `SELECT sf.id, sf.month, sf.amount_due, sf.amount_paid, sf.due_date, sf.status,
              (
                SELECT MAX(fp.payment_date)
                FROM fee_payments fp
                WHERE fp.student_fee_id = sf.id
              ) AS payment_date
       FROM student_fees sf
       JOIN fee_structures fs ON sf.fee_structure_id = fs.id
       WHERE sf.student_id = $1
         AND sf.academic_year = ANY($2::text[])
         AND fs.fee_type ILIKE '%transport%'
       ORDER BY sf.month ASC`,
      [studentId, yearFilter],
    );

    const paymentSchedule = feesResult.rows
      .map((row) => {
        const month = parseInt(String(row.month), 10);
        const amountDue = parseFloat(String(row.amount_due || 0));
        const amountPaid = parseFloat(String(row.amount_paid || 0));
        const status = scheduleStatus(amountDue, amountPaid, row.due_date, row.status);

        return {
          id: row.id,
          month,
          month_label: monthHeading(academicYear, month),
          period_label: monthPeriodLabel(academicYear, month),
          monthly_charges: amountDue,
          paid_amount: amountPaid,
          balance: Math.max(0, amountDue - amountPaid),
          status,
          due_date: row.due_date,
          payment_date: row.payment_date,
        };
      })
      .sort((a, b) => academicMonthSort(a.month) - academicMonthSort(b.month));

    const totalCharges = paymentSchedule.reduce((sum, row) => sum + row.monthly_charges, 0);
    const paidAmount = paymentSchedule.reduce((sum, row) => sum + row.paid_amount, 0);
    const pendingAmount = Math.max(0, totalCharges - paidAmount);
    const paidMonths = paymentSchedule.filter((row) => row.status === 'paid' || row.status === 'exempted').length;
    const pendingMonths = paymentSchedule.length - paidMonths;

    const firstDue = paymentSchedule.find((row) => row.status === 'due');
    const firstPending = paymentSchedule.find((row) => row.status === 'pending');

    let dueStatus: 'due' | 'clear' | 'upcoming' = 'clear';
    let dueMonthLabel: string | null = null;
    if (firstDue) {
      dueStatus = 'due';
      dueMonthLabel = firstDue.month_label;
    } else if (firstPending) {
      dueStatus = 'upcoming';
      dueMonthLabel = firstPending.month_label;
    }

    const assignment = assignmentResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        student: studentResult.rows[0],
        academic_year: academicYear,
        transport: {
          assignment_id: assignment.assignment_id,
          status: assignment.status,
          route_name: assignment.route_name,
          route_number: assignment.route_number,
          stop_name: assignment.stop_name,
          stop_code: stopCode(assignment.stop_name, assignment.stop_order),
          stop_order: assignment.stop_order,
          arrival_time: assignment.arrival_time,
          transport_fee: parseFloat(String(assignment.transport_fee || assignment.pickup_fee || 0)),
          start_date: assignment.start_date,
          end_date: assignment.end_date,
        },
        vehicle: assignment.vehicle_number
          ? {
              id: assignment.vehicle_id,
              vehicle_number: assignment.vehicle_number,
              vehicle_type: assignment.vehicle_type,
              model: assignment.model,
            }
          : null,
        driver: assignment.driver_name
          ? {
              name: assignment.driver_name,
              phone: assignment.driver_phone,
            }
          : null,
        payment_overview: {
          total_charges: totalCharges,
          total_months: paymentSchedule.length,
          paid_amount: paidAmount,
          paid_months: paidMonths,
          pending_amount: pendingAmount,
          pending_months: pendingMonths,
          due_status: dueStatus,
          due_month_label: dueMonthLabel,
        },
        payment_schedule: paymentSchedule,
      },
    });
  } catch (error) {
    console.error('Error fetching student transport details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch student transport details' },
      { status: 500 },
    );
  }
}
