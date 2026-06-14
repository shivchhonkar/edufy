import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';

export async function POST(request: NextRequest) {
  const authResult = await getAuthenticatedDb(request);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const body = await request.json();
    const {
      fee_structure_id,
      new_amount,
      academic_year,
      update_existing_fees = true,
    } = body;

    if (!fee_structure_id || new_amount === undefined) {
      return NextResponse.json(
        { success: false, error: 'fee_structure_id and new_amount are required' },
        { status: 400 }
      );
    }

    return await db.transaction(async (client) => {
      const feeStructureResult = await client.query(
        `SELECT id, fee_type, amount, class_id, frequency, academic_year 
         FROM fee_structures WHERE id = $1`,
        [fee_structure_id]
      );

      if (feeStructureResult.rows.length === 0) {
        throw new Error('Fee structure not found');
      }

      const feeStructure = feeStructureResult.rows[0];
      const oldAmount = parseFloat(feeStructure.amount);
      const newAmountNum = parseFloat(new_amount);

      await client.query(
        `UPDATE fee_structures 
         SET amount = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [newAmountNum, fee_structure_id]
      );

      if (update_existing_fees) {
        const targetAcademicYear = academic_year || feeStructure.academic_year;
        await client.query(
          `UPDATE student_fees 
           SET amount_due = $1, updated_at = CURRENT_TIMESTAMP
           WHERE fee_structure_id = $2
           AND academic_year = $3
           AND status IN ('pending', 'partial')`,
          [newAmountNum, fee_structure_id, targetAcademicYear]
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          fee_structure_id,
          fee_type: feeStructure.fee_type,
          old_amount: oldAmount,
          new_amount: newAmountNum,
          students_affected: update_existing_fees ? 'updated' : 'not updated',
        },
        message: `Fee structure updated successfully${update_existing_fees ? ' and applied to pending student fees' : ''}`,
      });
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update fee structure';
    console.error('Error updating fee structure:', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
