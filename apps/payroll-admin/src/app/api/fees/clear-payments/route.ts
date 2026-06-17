import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
// POST - Clear all fee payments
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json().catch(() => ({}));
    const deleteAllFees = body.deleteAllFees || false; // Option to delete student_fees records too

    // Start a transaction
    await db.query('BEGIN');

    // Delete all fee payments
    const deletePaymentsResult = await db.query(
      'DELETE FROM fee_payments RETURNING id'
    );
    const deletedPaymentsCount = deletePaymentsResult.rows.length;

    let resetFeesCount = 0;
    let deletedFeesCount = 0;

    if (deleteAllFees) {
      // Delete all student_fees records
      const deleteFeesResult = await db.query(
        'DELETE FROM student_fees RETURNING id'
      );
      deletedFeesCount = deleteFeesResult.rows.length;
    } else {
      // Reset all student fees (keep the records but reset amounts)
      const resetFeesResult = await db.query(`
        UPDATE student_fees 
        SET 
          amount_paid = 0,
          late_fee_amount = 0,
          status = CASE
            WHEN CURRENT_DATE > due_date THEN 'overdue'
            ELSE 'pending'
          END,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `);
      resetFeesCount = resetFeesResult.rows.length;
    }

    // Commit transaction
    await db.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: deleteAllFees 
        ? 'All fee payments and fee records deleted successfully'
        : 'All fee payments cleared successfully',
      data: {
        paymentsDeleted: deletedPaymentsCount,
        feesReset: deleteAllFees ? 0 : resetFeesCount,
        feesDeleted: deleteAllFees ? deletedFeesCount : 0
      }
    });
  } catch (error) {
    // Rollback on error
    await db.query('ROLLBACK');
    console.error('Error clearing fee payments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear fee payments' },
      { status: 500 }
    );
  }
}

