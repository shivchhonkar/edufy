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

type RangeFilter = 'this_week' | 'this_month' | 'custom' | null;

function buildPaymentDateFilter(
  range: RangeFilter,
  startDate: string | null,
  endDate: string | null,
  dateColumn: string,
  startParamIndex: number,
) {
  if (range === 'this_week') {
    return {
      clause: `${dateColumn} >= DATE_TRUNC('week', CURRENT_DATE) AND ${dateColumn} < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'`,
      params: [] as string[],
      nextIndex: startParamIndex,
    };
  }

  if (range === 'this_month') {
    return {
      clause: `EXTRACT(MONTH FROM ${dateColumn}) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM ${dateColumn}) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      params: [] as string[],
      nextIndex: startParamIndex,
    };
  }

  if (range === 'custom' && startDate && endDate) {
    return {
      clause: `${dateColumn} >= $${startParamIndex}::date AND ${dateColumn} < ($${startParamIndex + 1}::date + INTERVAL '1 day')`,
      params: [startDate, endDate],
      nextIndex: startParamIndex + 2,
    };
  }

  return {
    clause: '',
    params: [] as string[],
    nextIndex: startParamIndex,
  };
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
    const range = (searchParams.get('range') as RangeFilter) || null;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

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
    const collectedDateFilter = buildPaymentDateFilter(
      range,
      startDate,
      endDate,
      'payment_date',
      paramCount + 1,
    );
    if (collectedDateFilter.clause) {
      collectedQuery += ` AND ${collectedDateFilter.clause}`;
      collectedParams.push(...collectedDateFilter.params);
      paramCount = collectedDateFilter.nextIndex - 1;
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
    const recentPaymentsDateFilter = buildPaymentDateFilter(
      range,
      startDate,
      endDate,
      'fp.payment_date',
      2,
    );
    const recentPaymentsResult = await db.query(
      `SELECT fp.*, s.first_name, s.last_name, s.admission_number,
              c.name as class_name, sec.name as section_name
       FROM fee_payments fp
       JOIN students s ON fp.student_id = s.id
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN sections sec ON s.section_id = sec.id
       WHERE fp.status = 'completed'
       AND (fp.academic_year = $1 OR fp.academic_year IS NULL)
       ${recentPaymentsDateFilter.clause ? `AND ${recentPaymentsDateFilter.clause}` : ''}
       ORDER BY fp.payment_date DESC
       LIMIT 10`,
      [currentAcademicYear, ...recentPaymentsDateFilter.params]
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

    // Fee collection by category - prefer payment_receipts breakup when available
    let categoryCollectionResult;
    const categoryDateFilter = buildPaymentDateFilter(
      range,
      startDate,
      endDate,
      'payment_date',
      2,
    );
    const categoryDateFilterWithAlias = buildPaymentDateFilter(
      range,
      startDate,
      endDate,
      'fp.payment_date',
      2,
    );
    try {
      categoryCollectionResult = await db.query(
        `WITH receipt_totals AS (
           SELECT 'Tuition Fee'::text AS category, COALESCE(SUM(total_tuition_paid), 0)::numeric AS total
           FROM payment_receipts
           WHERE academic_year = $1
             ${categoryDateFilter.clause ? `AND ${categoryDateFilter.clause}` : ''}
           UNION ALL
           SELECT 'Transport Fee'::text AS category, COALESCE(SUM(total_transport_paid), 0)::numeric AS total
           FROM payment_receipts
           WHERE academic_year = $1
             ${categoryDateFilter.clause ? `AND ${categoryDateFilter.clause}` : ''}
           UNION ALL
           SELECT 'Examination & Activity Fee'::text AS category, COALESCE(SUM(total_other_paid), 0)::numeric AS total
           FROM payment_receipts
           WHERE academic_year = $1
             ${categoryDateFilter.clause ? `AND ${categoryDateFilter.clause}` : ''}
         ),
         payment_base AS (
           SELECT fp.*
           FROM fee_payments fp
           WHERE fp.status = 'completed'
             AND (fp.academic_year = $1 OR fp.academic_year IS NULL)
             ${categoryDateFilterWithAlias.clause ? `AND ${categoryDateFilterWithAlias.clause}` : ''}
             AND NOT EXISTS (SELECT 1 FROM payment_receipts pr WHERE pr.payment_id = fp.id)
         ),
         mapped_categories AS (
           SELECT
             pb.id,
             COALESCE(
               CASE
                 WHEN LOWER(COALESCE(fs.fee_type, '')) LIKE '%tuition%' OR LOWER(COALESCE(fs.fee_type, '')) LIKE '%tution%' THEN ARRAY['Tuition Fee']
                 WHEN LOWER(COALESCE(fs.fee_type, '')) LIKE '%transport%' THEN ARRAY['Transport Fee']
                 WHEN LOWER(COALESCE(fs.fee_type, '')) LIKE '%registration%' OR LOWER(COALESCE(fs.fee_type, '')) LIKE '%admission%' THEN ARRAY['Registration Fee']
                 WHEN LOWER(COALESCE(fs.fee_type, '')) LIKE '%exam%' OR LOWER(COALESCE(fs.fee_type, '')) LIKE '%activity%' THEN ARRAY['Examination & Activity Fee']
                 WHEN LOWER(COALESCE(fs.fee_type, '')) LIKE '%library%' THEN ARRAY['Library Fee']
                 WHEN LOWER(COALESCE(fs.fee_type, '')) LIKE '%sport%' THEN ARRAY['Sports Fee']
                 WHEN LOWER(COALESCE(fs.fee_type, '')) LIKE '%late%' THEN ARRAY['Late Fee']
                 ELSE NULL
               END,
               (
                 SELECT ARRAY_AGG(DISTINCT
                   CASE
                     WHEN LOWER(COALESCE(fs2.fee_type, '')) LIKE '%tuition%' OR LOWER(COALESCE(fs2.fee_type, '')) LIKE '%tution%' THEN 'Tuition Fee'
                     WHEN LOWER(COALESCE(fs2.fee_type, '')) LIKE '%transport%' THEN 'Transport Fee'
                     WHEN LOWER(COALESCE(fs2.fee_type, '')) LIKE '%registration%' OR LOWER(COALESCE(fs2.fee_type, '')) LIKE '%admission%' THEN 'Registration Fee'
                     WHEN LOWER(COALESCE(fs2.fee_type, '')) LIKE '%exam%' OR LOWER(COALESCE(fs2.fee_type, '')) LIKE '%activity%' THEN 'Examination & Activity Fee'
                     WHEN LOWER(COALESCE(fs2.fee_type, '')) LIKE '%library%' THEN 'Library Fee'
                     WHEN LOWER(COALESCE(fs2.fee_type, '')) LIKE '%sport%' THEN 'Sports Fee'
                     WHEN LOWER(COALESCE(fs2.fee_type, '')) LIKE '%late%' THEN 'Late Fee'
                     ELSE NULL
                   END
                 )
                 FROM student_fees sf2
                 LEFT JOIN fee_structures fs2 ON fs2.id = sf2.fee_structure_id
                 WHERE sf2.student_id = pb.student_id
                   AND sf2.academic_year = COALESCE(pb.academic_year, $1)
                   AND DATE(sf2.updated_at) = DATE(pb.payment_date)
                   AND sf2.amount_paid > 0
               ),
               ARRAY['Uncategorized']
             ) AS categories,
             COALESCE(pb.amount_paid, 0)::numeric AS amount_paid
           FROM payment_base pb
           LEFT JOIN fee_structures fs ON pb.fee_structure_id = fs.id
         ),
         inferred_totals AS (
           SELECT
             COALESCE(cat.category, 'Uncategorized')::text AS category,
             SUM(
               CASE
                 WHEN COALESCE(array_length(mc.categories, 1), 0) > 0
                 THEN mc.amount_paid / array_length(mc.categories, 1)
                 ELSE mc.amount_paid
               END
             )::numeric AS total
           FROM mapped_categories mc
           LEFT JOIN LATERAL unnest(mc.categories) AS cat(category) ON true
           GROUP BY COALESCE(cat.category, 'Uncategorized')
         )
         SELECT category, SUM(total) AS total
         FROM (
           SELECT * FROM receipt_totals
           UNION ALL
           SELECT * FROM inferred_totals
         ) merged
         GROUP BY category
         HAVING SUM(total) > 0
         ORDER BY total DESC`,
        [currentAcademicYear, ...categoryDateFilter.params]
      );
    } catch (error) {
      // Fallback for tenants without payment_receipts table
      categoryCollectionResult = await db.query(
        `WITH payment_base AS (
           SELECT fp.*
           FROM fee_payments fp
           WHERE fp.status = 'completed'
             AND (fp.academic_year = $1 OR fp.academic_year IS NULL)
             ${categoryDateFilterWithAlias.clause ? `AND ${categoryDateFilterWithAlias.clause}` : ''}
         ),
         mapped_categories AS (
           SELECT
             pb.id,
             COALESCE(
               CASE
                 WHEN LOWER(COALESCE(fs.fee_type, '')) LIKE '%tuition%' OR LOWER(COALESCE(fs.fee_type, '')) LIKE '%tution%' THEN ARRAY['Tuition Fee']
                 WHEN LOWER(COALESCE(fs.fee_type, '')) LIKE '%transport%' THEN ARRAY['Transport Fee']
                 WHEN LOWER(COALESCE(fs.fee_type, '')) LIKE '%registration%' OR LOWER(COALESCE(fs.fee_type, '')) LIKE '%admission%' THEN ARRAY['Registration Fee']
                 WHEN LOWER(COALESCE(fs.fee_type, '')) LIKE '%exam%' OR LOWER(COALESCE(fs.fee_type, '')) LIKE '%activity%' THEN ARRAY['Examination & Activity Fee']
                 WHEN LOWER(COALESCE(fs.fee_type, '')) LIKE '%library%' THEN ARRAY['Library Fee']
                 WHEN LOWER(COALESCE(fs.fee_type, '')) LIKE '%sport%' THEN ARRAY['Sports Fee']
                 WHEN LOWER(COALESCE(fs.fee_type, '')) LIKE '%late%' THEN ARRAY['Late Fee']
                 ELSE NULL
               END,
               (
                 SELECT ARRAY_AGG(DISTINCT
                   CASE
                     WHEN LOWER(COALESCE(fs2.fee_type, '')) LIKE '%tuition%' OR LOWER(COALESCE(fs2.fee_type, '')) LIKE '%tution%' THEN 'Tuition Fee'
                     WHEN LOWER(COALESCE(fs2.fee_type, '')) LIKE '%transport%' THEN 'Transport Fee'
                     WHEN LOWER(COALESCE(fs2.fee_type, '')) LIKE '%registration%' OR LOWER(COALESCE(fs2.fee_type, '')) LIKE '%admission%' THEN 'Registration Fee'
                     WHEN LOWER(COALESCE(fs2.fee_type, '')) LIKE '%exam%' OR LOWER(COALESCE(fs2.fee_type, '')) LIKE '%activity%' THEN 'Examination & Activity Fee'
                     WHEN LOWER(COALESCE(fs2.fee_type, '')) LIKE '%library%' THEN 'Library Fee'
                     WHEN LOWER(COALESCE(fs2.fee_type, '')) LIKE '%sport%' THEN 'Sports Fee'
                     WHEN LOWER(COALESCE(fs2.fee_type, '')) LIKE '%late%' THEN 'Late Fee'
                     ELSE NULL
                   END
                 )
                 FROM student_fees sf2
                 LEFT JOIN fee_structures fs2 ON fs2.id = sf2.fee_structure_id
                 WHERE sf2.student_id = pb.student_id
                   AND sf2.academic_year = COALESCE(pb.academic_year, $1)
                   AND DATE(sf2.updated_at) = DATE(pb.payment_date)
                   AND sf2.amount_paid > 0
               ),
               ARRAY['Uncategorized']
             ) AS categories,
             COALESCE(pb.amount_paid, 0)::numeric AS amount_paid
           FROM payment_base pb
           LEFT JOIN fee_structures fs ON pb.fee_structure_id = fs.id
         )
         SELECT
           COALESCE(cat.category, 'Uncategorized') AS category,
           SUM(
             CASE
               WHEN COALESCE(array_length(mc.categories, 1), 0) > 0
               THEN mc.amount_paid / array_length(mc.categories, 1)
               ELSE mc.amount_paid
             END
           ) AS total
         FROM mapped_categories mc
         LEFT JOIN LATERAL unnest(mc.categories) AS cat(category) ON true
         GROUP BY COALESCE(cat.category, 'Uncategorized')
         ORDER BY total DESC`,
        [currentAcademicYear, ...categoryDateFilterWithAlias.params]
      );
    }

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

