import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import type { RequestDb } from '@/lib/request-db';
import { ensureFeeSchema } from '@/lib/ensure-fee-schema';
import { ensureSystemSettings } from '@/lib/ensure-system-settings';
import { cleanupOrphanedTransportFees } from '@/lib/transport-fee-sync';
import { autoPaymentReconciliation, isReconciliationNeeded } from '@/features/fees/utils/paymentSync';

async function autoCleanupOrphanedFees(academicYear: string, db: RequestDb) {
  try {
    const orphanedCount = await db.query(
      `SELECT COUNT(*) as count FROM student_fees 
       WHERE fee_structure_id IS NULL 
       AND academic_year = $1`,
      [academicYear]
    );
    
    if (parseInt(orphanedCount.rows[0].count) > 0) {
      console.log(`🧹 Auto-cleaning ${orphanedCount.rows[0].count} orphaned fee records...`);
      
      const deleteResult = await db.query(
        `DELETE FROM student_fees 
         WHERE fee_structure_id IS NULL 
         AND academic_year = $1`,
        [academicYear]
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

// GET fee statistics
export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureFeeSchema(db);
    await ensureSystemSettings(db);
    const searchParams = request.nextUrl.searchParams;
    const academicYear = searchParams.get('academic_year') || new Date().getFullYear().toString();
    const month = searchParams.get('month');

    let currentAcademicYear = academicYear;
    if (academicYear === new Date().getFullYear().toString()) {
      const settingsResult = await db.query('SELECT academic_year FROM system_settings ORDER BY id DESC LIMIT 1');
      if (settingsResult.rows.length > 0 && settingsResult.rows[0].academic_year) {
        currentAcademicYear = settingsResult.rows[0].academic_year;
      }
    }

    console.log('Fee Stats - Using Academic Year:', currentAcademicYear);

    // Auto-fix payment discrepancies and orphaned records if needed (runs in background)
    try {
      // 1. Auto-cleanup orphaned fee records
      const orphanedCleaned = await autoCleanupOrphanedFees(currentAcademicYear, db);
      
      const transportOrphanedCleaned = await autoCleanupOrphanedTransportFees(db, currentAcademicYear);
      
      // 3. Auto-fix payment discrepancies
      const reconciliationCheck = await isReconciliationNeeded(currentAcademicYear);
      if (reconciliationCheck.needed && reconciliationCheck.count > 0) {
        console.log(`🔄 Auto-fixing ${reconciliationCheck.count} payment discrepancies...`);
        // Run reconciliation in background (don't wait for it)
        autoPaymentReconciliation(currentAcademicYear).catch(error => {
          console.error('❌ Background reconciliation failed:', error);
        });
      }
      
      // Log auto-fix summary
      if (orphanedCleaned > 0 || transportOrphanedCleaned > 0 || (reconciliationCheck.needed && reconciliationCheck.count > 0)) {
        console.log(`🔧 Auto-fix summary: ${orphanedCleaned} orphaned records cleaned, ${transportOrphanedCleaned} transport orphaned records cleaned, ${reconciliationCheck.count || 0} payment discrepancies fixed`);
      }
    } catch (error) {
      console.error('❌ Error in auto-fix operations:', error);
      // Don't fail the stats request if auto-fix operations fail
    }

    // Total collected - filter by academic year
    let collectedQuery = `
      SELECT COALESCE(SUM(amount_paid), 0) as total_collected
      FROM fee_payments
      WHERE status = 'completed'
      AND (academic_year = $1 OR academic_year IS NULL)
    `;
    let collectedParams: any[] = [currentAcademicYear];
    let paramCount = 1;

    if (month) {
      paramCount++;
      collectedQuery += ` AND EXTRACT(MONTH FROM payment_date) = $${paramCount}`;
      collectedParams.push(month);
    }

    const collectedResult = await db.query(collectedQuery, collectedParams);

    // Total pending - based on actual assigned fees and fee structures total amount that will be paid by students in complete academic session
    // This includes ALL fees for the academic year (past, current, and future)
    const pendingResult = await db.query(
      `SELECT COALESCE(SUM(
        CASE 
          WHEN sf.amount_due > sf.amount_paid 
          THEN sf.amount_due - sf.amount_paid + COALESCE(sf.late_fee_amount, 0)
          ELSE 0
        END
      ), 0) as total_pending
      FROM student_fees sf
      JOIN students s ON sf.student_id = s.id
      WHERE s.status = 'active'
      AND sf.academic_year = $1
      AND sf.amount_due > sf.amount_paid`,
      [currentAcademicYear]
    );

    // This month collection - filter by academic year
    // For academic year starting April, "this month" should be calculated based on academic year context
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    // Calculate academic month (April = 1, May = 2, ..., March = 12)
    let academicMonth = currentMonth;
    if (currentMonth >= 4) {
      academicMonth = currentMonth - 3; // April (4) becomes 1, May (5) becomes 2, etc.
    } else {
      academicMonth = currentMonth + 9; // January (1) becomes 10, February (2) becomes 11, March (3) becomes 12
    }
    
    const thisMonthResult = await db.query(
      `SELECT COALESCE(SUM(amount_paid), 0) as this_month
       FROM fee_payments
       WHERE status = 'completed'
       AND EXTRACT(MONTH FROM payment_date) = $1
       AND EXTRACT(YEAR FROM payment_date) = $2
       AND (academic_year = $3 OR academic_year IS NULL)`,
      [currentMonth, currentYear, currentAcademicYear]
    );

    // Total overdue - total due amount of current month and previous months (April-October)
    // For academic year starting April: overdue = all fees from April to current month
    // (currentDate and currentMonth already defined above)
    
    // Calculate which months should be considered overdue based on academic year
    let overdueCondition = '';
    if (currentMonth >= 4) {
      // We're in April or later of the same year
      overdueCondition = `sf.month BETWEEN 4 AND ${currentMonth}`;
    } else {
      // We're in Jan-Mar of next year, so overdue includes Apr-Dec of previous year + Jan-current month
      overdueCondition = `(sf.month BETWEEN 4 AND 12 OR sf.month BETWEEN 1 AND ${currentMonth})`;
    }
    
    const overdueResult = await db.query(
      `SELECT COALESCE(SUM(
        CASE 
          WHEN sf.amount_due > sf.amount_paid 
          THEN sf.amount_due - sf.amount_paid + COALESCE(sf.late_fee_amount, 0)
          ELSE 0
        END
      ), 0) as total_overdue
      FROM student_fees sf
      JOIN students s ON sf.student_id = s.id
      WHERE s.status = 'active'
      AND sf.academic_year = $1
      AND sf.amount_due > sf.amount_paid
      AND (${overdueCondition})`,
      [currentAcademicYear]
    );

    // Total late fees
    const lateFeesResult = await db.query(
      `SELECT COALESCE(SUM(late_fee_amount), 0) as total_late_fees
       FROM student_fees
       WHERE academic_year = $1`,
      [currentAcademicYear]
    );

    // Recent payments (last 10) - filter by academic year
    const recentPaymentsResult = await db.query(
      `SELECT fp.*, s.first_name, s.last_name, s.admission_number,
              c.name as class_name
       FROM fee_payments fp
       JOIN students s ON fp.student_id = s.id
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE fp.status = 'completed'
       AND (fp.academic_year = $1 OR fp.academic_year IS NULL)
       ORDER BY fp.payment_date DESC
       LIMIT 10`,
      [currentAcademicYear]
    );

    // Students with pending fees - based on actual assigned fees (any unpaid fees in academic year)
    const pendingStudentsResult = await db.query(
      `SELECT COUNT(DISTINCT sf.student_id) as count
       FROM student_fees sf
       JOIN students s ON sf.student_id = s.id
       WHERE s.status = 'active'
       AND sf.academic_year = $1
       AND sf.amount_due > sf.amount_paid`,
      [currentAcademicYear]
    );

    // Fee collection by category - filter by academic year
    const categoryCollectionResult = await db.query(
      `SELECT COALESCE(fc.name, 'Uncategorized') as category, COALESCE(SUM(fp.amount_paid), 0) as total
       FROM fee_payments fp
       LEFT JOIN fee_structures fs ON fp.fee_structure_id = fs.id
       LEFT JOIN fee_categories fc ON fs.category_id = fc.id
       WHERE fp.status = 'completed'
       AND (fp.academic_year = $1 OR fp.academic_year IS NULL)
       GROUP BY COALESCE(fc.name, 'Uncategorized')
       ORDER BY total DESC`,
      [currentAcademicYear]
    );

    // Monthly collection trend (last 12 months) - filter by academic year
    const monthlyTrendResult = await db.query(
      `SELECT 
        EXTRACT(MONTH FROM payment_date) as month,
        EXTRACT(YEAR FROM payment_date) as year,
        COALESCE(SUM(amount_paid), 0) as total
       FROM fee_payments
       WHERE status = 'completed'
       AND (academic_year = $1 OR academic_year IS NULL)
       AND payment_date >= CURRENT_DATE - INTERVAL '12 months'
       GROUP BY EXTRACT(MONTH FROM payment_date), EXTRACT(YEAR FROM payment_date)
       ORDER BY year, month`,
      [currentAcademicYear]
    );

    // Debug logging
    console.log('Fee Stats Results:', {
      academicYear: currentAcademicYear,
      totalCollected: collectedResult.rows[0].total_collected,
      totalPending: pendingResult.rows[0].total_pending,
      thisMonth: thisMonthResult.rows[0].this_month,
      totalOverdue: overdueResult.rows[0].total_overdue,
      pendingStudentsCount: pendingStudentsResult.rows[0].count,
      explanation: {
        pending: `₹${pendingResult.rows[0].total_pending} pending = total amount to be paid in complete academic session`,
        overdue: `₹${overdueResult.rows[0].total_overdue} overdue = total due amount from April to current month (${overdueCondition})`,
        currentMonth: currentMonth,
        academicMonth: academicMonth
      },
      currentDate: currentDate.toISOString().split('T')[0]
    });

    return NextResponse.json({
      success: true,
      data: {
        total_collected: parseFloat(collectedResult.rows[0].total_collected),
        total_pending: parseFloat(pendingResult.rows[0].total_pending),
        this_month: parseFloat(thisMonthResult.rows[0].this_month),
        total_overdue: parseFloat(overdueResult.rows[0].total_overdue),
        total_late_fees: parseFloat(lateFeesResult.rows[0].total_late_fees),
        pending_students_count: parseInt(pendingStudentsResult.rows[0].count),
        recent_payments: recentPaymentsResult.rows,
        collection_by_category: categoryCollectionResult.rows,
        monthly_trend: monthlyTrendResult.rows,
        academic_year_used: currentAcademicYear, // Include for debugging
      },
    });
  } catch (error) {
    console.error('Error fetching fee statistics:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch fee statistics';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

