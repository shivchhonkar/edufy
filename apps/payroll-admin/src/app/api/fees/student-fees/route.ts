import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import type { RequestDb } from '@/lib/request-db';
import { ensureFeeSchema } from '@/lib/ensure-fee-schema';
import { resolveAcademicYear } from '@/lib/ensure-system-settings';
import {
  getActiveTransportAssignment,
  syncTransportFeesForStudent,
  cleanupOrphanedTransportFees,
} from '@/lib/transport-fee-sync';
import { autoPaymentReconciliation, isReconciliationNeeded } from '@/features/fees/utils/paymentSync';

function computeLateFee(row: {
  amount_due: string | number;
  amount_paid: string | number;
  due_date: string;
  late_fee_percentage?: string | number | null;
  late_fee_days?: string | number | null;
  late_fee_amount?: string | number | null;
}): number {
  const stored = parseFloat(String(row.late_fee_amount || 0));
  if (stored > 0) return stored;

  const balance = parseFloat(String(row.amount_due || 0)) - parseFloat(String(row.amount_paid || 0));
  if (balance <= 0 || !row.due_date) return 0;

  const pct = parseFloat(String(row.late_fee_percentage || 0));
  const graceDays = parseInt(String(row.late_fee_days ?? 7), 10);
  if (pct <= 0) return 0;

  const dueDate = new Date(row.due_date);
  const daysOverdue = Math.floor((Date.now() - dueDate.getTime()) / 86400000);
  if (daysOverdue <= graceDays) return 0;

  return Math.round((balance * pct) / 100 * 100) / 100;
}

async function autoCleanupOrphanedFees(db: RequestDb) {
  try {
    const orphanedCount = await db.query(
      `SELECT COUNT(*) as count FROM student_fees 
       WHERE fee_structure_id IS NULL 
       AND academic_year = $1`,
      ['2025-26']
    );
    
    if (parseInt(orphanedCount.rows[0].count) > 0) {
      console.log(`🧹 Auto-cleaning ${orphanedCount.rows[0].count} orphaned fee records...`);
      
      const deleteResult = await db.query(
        `DELETE FROM student_fees 
         WHERE fee_structure_id IS NULL 
         AND academic_year = $1`,
        ['2025-26']
      );
      
      console.log(`✅ Auto-cleaned ${deleteResult.rowCount} orphaned fee records`);
      return deleteResult.rowCount;
    }
    
    return 0;
  } catch (error) {
    console.error('❌ Error in auto-cleanup of orphaned fees:', error);
    return 0;
  }
}

async function autoCleanupOrphanedTransportFees(db: RequestDb, academicYear: string) {
  try {
    return await cleanupOrphanedTransportFees(db, academicYear);
  } catch (error) {
    console.error('❌ Error in auto-cleanup of orphaned transport fees:', error);
    return 0;
  }
}

// GET student fees
export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureFeeSchema(db);
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('student_id');
    const status = searchParams.get('status');
    const academicYear = await resolveAcademicYear(db, searchParams.get('academic_year'));
    const month = searchParams.get('month');

    if (studentId && academicYear) {
      try {
        await syncTransportFeesForStudent(db, parseInt(studentId, 10), academicYear);
      } catch (error) {
        console.error('Error syncing transport fees for student:', error);
      }
    }

    // Auto-fix payment discrepancies and orphaned records if needed (runs in background)
    try {
      // 1. Auto-cleanup orphaned fee records
      const orphanedCleaned = await autoCleanupOrphanedFees(db);
      
      const transportOrphanedCleaned = await autoCleanupOrphanedTransportFees(db, academicYear);
      
      // 3. Auto-fix payment discrepancies
      const reconciliationCheck = await isReconciliationNeeded(academicYear);
      if (reconciliationCheck.needed && reconciliationCheck.count > 0) {
        console.log(`🔄 Auto-fixing ${reconciliationCheck.count} payment discrepancies...`);
        // Run reconciliation in background (don't wait for it)
        autoPaymentReconciliation(academicYear).catch(error => {
          console.error('❌ Background reconciliation failed:', error);
        });
      }
      
      // Log auto-fix summary
      if (orphanedCleaned > 0 || transportOrphanedCleaned > 0 || (reconciliationCheck.needed && reconciliationCheck.count > 0)) {
        console.log(`🔧 Auto-fix summary: ${orphanedCleaned} orphaned records cleaned, ${transportOrphanedCleaned} transport orphaned records cleaned, ${reconciliationCheck.count || 0} payment discrepancies fixed`);
      }
    } catch (error) {
      console.error('❌ Error in auto-fix operations:', error);
      // Don't fail the request if auto-fix operations fail
    }

    let queryText = `
      SELECT sf.*, 
             s.first_name, s.last_name, s.admission_number,
             fs.fee_type, fs.frequency,
             fs.late_fee_percentage, fs.late_fee_days,
             fc.name as category_name,
             c.name as class_name
      FROM student_fees sf
      JOIN students s ON sf.student_id = s.id
      LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
      LEFT JOIN fee_categories fc ON fs.category_id = fc.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE 1=1
    `;
    let queryParams: any[] = [];
    let paramCount = 0;

    if (studentId) {
      paramCount++;
      queryText += ` AND sf.student_id = $${paramCount}`;
      queryParams.push(studentId);
    }

    if (status) {
      paramCount++;
      queryText += ` AND sf.status = $${paramCount}`;
      queryParams.push(status);
    }

    if (academicYear) {
      paramCount++;
      queryText += ` AND sf.academic_year = $${paramCount}`;
      queryParams.push(academicYear);
    }

    if (month) {
      paramCount++;
      queryText += ` AND sf.month = $${paramCount}`;
      queryParams.push(month);
    }

    queryText += ' ORDER BY sf.due_date DESC';

    const result = await db.query(queryText, queryParams);

    const rowsWithLateFees = result.rows.map((row: Record<string, unknown>) => {
      const balance = parseFloat(String(row.amount_due || 0)) - parseFloat(String(row.amount_paid || 0));
      const shouldCalcLate =
        balance > 0 &&
        ['overdue', 'partial', 'pending'].includes(String(row.status || ''));
      return {
        ...row,
        calculated_late_fee: shouldCalcLate ? computeLateFee(row as Parameters<typeof computeLateFee>[0]) : 0,
      };
    });

    let transport = null;
    if (studentId) {
      transport = await getActiveTransportAssignment(db, parseInt(studentId, 10));
    }

    return NextResponse.json({
      success: true,
      data: rowsWithLateFees,
      transport,
    });
  } catch (error) {
    console.error('Error fetching student fees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch student fees' },
      { status: 500 }
    );
  }
}

// POST create student fee record
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
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

    // Validation
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
        student_id, fee_structure_id, academic_year, amount_due,
        discount_amount || 0, due_date, month, remarks, 'pending'
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Student fee record created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating student fee:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create student fee record' },
      { status: 500 }
    );
  }
}

// PUT update student fee record
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
      [
        amount_due, amount_paid, discount_amount,
        late_fee_amount, due_date, status, remarks, id
      ]
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

