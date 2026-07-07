import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';

// POST - Exempt a fee for a student (by student_fee_id or legacy month/year for tuition)
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const {
      student_id,
      student_fee_id,
      month,
      year,
      academic_year,
      exemption_reason,
    } = body;

    if (!student_id) {
      return NextResponse.json(
        { success: false, error: 'Student ID is required' },
        { status: 400 },
      );
    }

    const studentResult = await db.query('SELECT * FROM students WHERE id = $1', [student_id]);

    if (studentResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const student = studentResult.rows[0];
    const reason = exemption_reason || 'Fee exempted by admin';

    if (student_fee_id) {
      const feeResult = await db.query(
        `SELECT sf.*, fs.fee_type
         FROM student_fees sf
         LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
         WHERE sf.id = $1 AND sf.student_id = $2`,
        [student_fee_id, student_id],
      );

      if (feeResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Fee record not found for this student' },
          { status: 404 },
        );
      }

      const fee = feeResult.rows[0];
      if (fee.status === 'exempted') {
        return NextResponse.json({
          success: true,
          message: 'Fee is already exempted',
          data: fee,
        });
      }

      const result = await db.query(
        `UPDATE student_fees
         SET status = 'exempted',
             amount_paid = amount_due,
             late_fee_amount = 0,
             exemption_reason = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND student_id = $3
         RETURNING *`,
        [reason, student_fee_id, student_id],
      );

      return NextResponse.json({
        success: true,
        message: 'Fee exempted successfully',
        data: result.rows[0],
      });
    }

    if (!month || !year) {
      return NextResponse.json(
        { success: false, error: 'Either student_fee_id or month and year are required' },
        { status: 400 },
      );
    }

    const feeStructureResult = await db.query(
      `SELECT * FROM fee_structures
       WHERE class_id = $1
       AND fee_type ILIKE '%tuition%'
       AND is_active = true
       AND academic_year = $2
       LIMIT 1`,
      [student.class_id, academic_year],
    );

    const feeStructureId = feeStructureResult.rows.length > 0 ? feeStructureResult.rows[0].id : null;

    const existingFeeResult = await db.query(
      `SELECT sf.*
       FROM student_fees sf
       LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
       WHERE sf.student_id = $1
         AND sf.month = $2
         AND sf.academic_year = $3
         AND (fs.fee_type ILIKE '%tuition%' OR sf.fee_structure_id IS NULL)
       LIMIT 1`,
      [student_id, month, academic_year],
    );

    let result;
    if (existingFeeResult.rows.length > 0) {
      result = await db.query(
        `UPDATE student_fees
         SET status = 'exempted',
             amount_paid = amount_due,
             late_fee_amount = 0,
             exemption_reason = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [reason, existingFeeResult.rows[0].id],
      );
    } else {
      const defaultAmount =
        feeStructureResult.rows.length > 0 ? feeStructureResult.rows[0].amount : 4000;

      result = await db.query(
        `INSERT INTO student_fees (
          student_id, fee_structure_id, month, academic_year,
          amount_due, amount_paid, status, exemption_reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          student_id,
          feeStructureId,
          month,
          academic_year,
          defaultAmount,
          defaultAmount,
          'exempted',
          reason,
        ],
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Fee exempted successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error exempting fee:', error);
    return NextResponse.json({ success: false, error: 'Failed to exempt fee' }, { status: 500 });
  }
}
