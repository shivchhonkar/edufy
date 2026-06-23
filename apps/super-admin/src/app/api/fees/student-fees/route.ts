import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureFeeSchema } from '@/lib/ensure-fee-schema';
import { resolveAcademicYear } from '@/lib/ensure-system-settings';
import { getActiveTransportAssignment } from '@/lib/transport-fee-sync';
import {
  calculateLateFee,
  loadLateFeePolicyForFeeRow,
} from '@/lib/fees/LateFeePolicyEngine';
import { ensureFeeExtensions } from '@/lib/fees/ensure-fee-extensions';
import { academicYearFilterValues } from '@/lib/fees/AcademicYear';

async function computeLateFee(
  db: Awaited<ReturnType<typeof getRequestDb>>['db'],
  row: {
    amount_due: string | number;
    amount_paid: string | number;
    due_date: string;
    late_fee_percentage?: string | number | null;
    late_fee_days?: string | number | null;
    late_fee_amount?: string | number | null;
    fee_structure_id?: number | null;
    fee_type?: string | null;
  }
): Promise<number> {
  const amountDue = parseFloat(String(row.amount_due || 0));
  const amountPaid = parseFloat(String(row.amount_paid || 0));
  const principalBalance = amountDue - amountPaid;

  // late_fee_amount stores collected late fees, not outstanding — never treat as due when principal is settled
  if (principalBalance <= 0) {
    return 0;
  }

  const policyFields = await loadLateFeePolicyForFeeRow(db, row);
  const result = calculateLateFee({
    amountDue,
    amountPaid,
    dueDate: row.due_date,
    ...policyFields,
  });
  return result.lateFee;
}

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureFeeSchema(db);
    await ensureFeeExtensions(db);

    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('student_id');
    const status = searchParams.get('status');
    const academicYear = await resolveAcademicYear(db, searchParams.get('academic_year'));
    const yearFilter = academicYearFilterValues(academicYear);
    const month = searchParams.get('month');

    let queryText = `
      SELECT sf.*, fs.fee_type, fs.frequency, fs.late_fee_percentage, fs.late_fee_days,
             c.name as class_name, sec.name as section_name
      FROM student_fees sf
      LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
      LEFT JOIN students s ON sf.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      WHERE sf.academic_year = ANY($1::text[])
    `;
    const queryParams: unknown[] = [yearFilter];
    let paramIndex = 2;

    if (studentId) {
      queryText += ` AND sf.student_id = $${paramIndex++}`;
      queryParams.push(parseInt(studentId, 10));
    }

    if (status) {
      queryText += ` AND sf.status = $${paramIndex++}`;
      queryParams.push(status);
    }

    if (month) {
      queryText += ` AND sf.month = $${paramIndex++}`;
      queryParams.push(parseInt(month, 10));
    }

    queryText += ' ORDER BY sf.due_date DESC';

    const result = await db.query(queryText, queryParams);

    const feesWithLateFee = await Promise.all(
      result.rows.map(async (row) => {
        const calculated_late_fee = await computeLateFee(db, row);
        return { ...row, calculated_late_fee };
      })
    );

    let transportInfo = null;
    if (studentId) {
      transportInfo = await getActiveTransportAssignment(db, parseInt(studentId, 10));
    }

    return NextResponse.json({
      success: true,
      data: feesWithLateFee,
      transport_info: transportInfo,
      academic_year: academicYear,
    });
  } catch (error) {
    console.error('Error fetching student fees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch student fees' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureFeeSchema(db);
    const body = await request.json();
    const {
      student_id,
      fee_structure_id,
      academic_year,
      amount_due,
      discount_amount,
      due_date,
      month,
      remarks,
    } = body;

    if (!student_id || !academic_year || !amount_due || !due_date) {
      return NextResponse.json(
        { success: false, error: 'Required fields are missing' },
        { status: 400 }
      );
    }

    const result = await db.query(
      `INSERT INTO student_fees (
        student_id, fee_structure_id, academic_year, amount_due,
        discount_amount, due_date, month, remarks, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        student_id,
        fee_structure_id,
        academic_year,
        amount_due,
        discount_amount || 0,
        due_date,
        month,
        remarks,
        'pending',
      ]
    );

    return NextResponse.json(
      {
        success: true,
        data: result.rows[0],
        message: 'Student fee record created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating student fee:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create student fee record' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const {
      id,
      amount_due,
      amount_paid,
      discount_amount,
      late_fee_amount,
      due_date,
      status,
      remarks,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Student fee ID is required' },
        { status: 400 }
      );
    }

    const result = await db.query(
      `UPDATE student_fees SET
        amount_due = $1,
        amount_paid = $2,
        discount_amount = $3,
        late_fee_amount = $4,
        due_date = $5,
        status = $6,
        remarks = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *`,
      [amount_due, amount_paid, discount_amount, late_fee_amount, due_date, status, remarks, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Student fee record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Student fee record updated successfully',
    });
  } catch (error) {
    console.error('Error updating student fee:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update student fee record' },
      { status: 500 }
    );
  }
}
