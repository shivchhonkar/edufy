/**
 * Universal Payment Synchronization System
 * Ensures payment records are properly synchronized with fee records
 * Automatically fixes discrepancies for all students
 */

import pool from '@/lib/db';

// Cache to prevent multiple simultaneous reconciliations
let reconciliationInProgress = false;

/**
 * Synchronize payment records with fee records
 * This ensures that when payments are recorded, all related fee records are updated
 */
export async function syncPaymentWithFees(paymentData) {
  console.log(`🔄 Syncing payment with fee records:`, paymentData);
  
  try {
    const {
      studentId,
      amountPaid,
      feeStructureIds = [], // Array of fee structure IDs this payment covers
      months = [], // Array of months this payment covers
      academicYear = '2025-26',
      paymentDate,
      paymentMethod = 'cash'
    } = paymentData;

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Create payment record
      const paymentResult = await pool.query(
        `INSERT INTO fee_payments (
          student_id, amount_paid, payment_date, payment_method, 
          academic_year, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'completed', NOW(), NOW())
        RETURNING id`,
        [studentId, amountPaid, paymentDate, paymentMethod, academicYear]
      );

      const paymentId = paymentResult.rows[0].id;
      console.log(`✅ Created payment record ID: ${paymentId}`);

      // Update fee records based on payment
      let totalUpdated = 0;
      
      if (feeStructureIds.length > 0 && months.length > 0) {
        // Specific fee structures and months
        for (const feeStructureId of feeStructureIds) {
          for (const month of months) {
            const updateResult = await pool.query(
              `UPDATE student_fees 
               SET amount_paid = amount_due, status = 'paid', updated_at = CURRENT_TIMESTAMP
               WHERE student_id = $1 
               AND fee_structure_id = $2 
               AND month = $3 
               AND academic_year = $4
               AND status IN ('pending', 'partial', 'overdue')`,
              [studentId, feeStructureId, month, academicYear]
            );
            totalUpdated += updateResult.rowCount || 0;
          }
        }
      } else {
        // Auto-distribute payment across pending fees
        const pendingFees = await pool.query(
          `SELECT id, amount_due, amount_paid, fee_structure_id, month
           FROM student_fees 
           WHERE student_id = $1 
           AND academic_year = $2
           AND status IN ('pending', 'partial', 'overdue')
           ORDER BY month, fee_structure_id`,
          [studentId, academicYear]
        );

        let remainingAmount = amountPaid;
        
        for (const fee of pendingFees.rows) {
          if (remainingAmount <= 0) break;
          
          const amountDue = parseFloat(fee.amount_due || 0);
          const amountAlreadyPaid = parseFloat(fee.amount_paid || 0);
          const amountNeeded = amountDue - amountAlreadyPaid;
          
          if (amountNeeded > 0) {
            const amountToPay = Math.min(remainingAmount, amountNeeded);
            const newAmountPaid = amountAlreadyPaid + amountToPay;
            
            let newStatus = 'partial';
            if (newAmountPaid >= amountDue) {
              newStatus = 'paid';
            }
            
            await pool.query(
              `UPDATE student_fees 
               SET amount_paid = $1, status = $2, updated_at = CURRENT_TIMESTAMP
               WHERE id = $3`,
              [newAmountPaid, newStatus, fee.id]
            );
            
            remainingAmount -= amountToPay;
            totalUpdated++;
          }
        }
      }

      await pool.query('COMMIT');

      return {
        success: true,
        message: `Payment synced successfully`,
        paymentId,
        updatedFeeRecords: totalUpdated
      };

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('❌ Error syncing payment with fees:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Universal payment reconciliation
 * Fixes discrepancies between payment records and fee records for all students
 */
export async function universalPaymentReconciliation(academicYear = '2025-26') {
  console.log(`🔄 Starting universal payment reconciliation for academic year: ${academicYear}`);
  
  try {
    // Get all students with payment discrepancies
    const studentsWithDiscrepancies = await pool.query(`
      WITH student_payments AS (
        SELECT 
          fp.student_id,
          SUM(fp.amount_paid) as total_payments
        FROM fee_payments fp
        WHERE fp.academic_year = $1
        AND fp.status = 'completed'
        GROUP BY fp.student_id
      ),
      student_fee_totals AS (
        SELECT 
          sf.student_id,
          SUM(sf.amount_due) as total_due,
          SUM(sf.amount_paid) as total_paid
        FROM student_fees sf
        JOIN fee_structures fs ON sf.fee_structure_id = fs.id
        WHERE sf.academic_year = $1
        AND fs.is_active = true
        GROUP BY sf.student_id
      )
      SELECT 
        sp.student_id,
        sp.total_payments,
        sft.total_due,
        sft.total_paid,
        s.admission_number,
        s.first_name,
        s.last_name
      FROM student_payments sp
      JOIN student_fee_totals sft ON sp.student_id = sft.student_id
      JOIN students s ON sp.student_id = s.id
      WHERE sp.total_payments != sft.total_paid
      ORDER BY s.admission_number
    `, [academicYear]);

    console.log(`📊 Found ${studentsWithDiscrepancies.rows.length} students with payment discrepancies`);

    let totalFixed = 0;
    let studentsProcessed = 0;

    for (const student of studentsWithDiscrepancies.rows) {
      const { student_id, total_payments, total_due, total_paid, admission_number, first_name, last_name } = student;
      
      console.log(`\n👤 Processing ${admission_number} - ${first_name} ${last_name}:`);
      console.log(`  Payments: ₹${total_payments}, Fee Records Paid: ₹${total_paid}, Due: ₹${total_due}`);

      // If total payments exceed what's recorded in fee records, update fee records
      if (total_payments > total_paid) {
        console.log(`  🔧 Fixing: Payments (₹${total_payments}) > Fee Records (₹${total_paid})`);
        
        // Get all pending/partial fees for this student
        const pendingFees = await pool.query(
          `SELECT sf.id, sf.amount_due, sf.amount_paid, sf.fee_structure_id, sf.month, fs.fee_type
           FROM student_fees sf
           JOIN fee_structures fs ON sf.fee_structure_id = fs.id
           WHERE sf.student_id = $1 
           AND sf.academic_year = $2
           AND sf.status IN ('pending', 'partial', 'overdue')
           ORDER BY sf.month, fs.fee_type`,
          [student_id, academicYear]
        );

        let remainingToDistribute = total_payments - total_paid;
        let feesUpdated = 0;

        for (const fee of pendingFees.rows) {
          if (remainingToDistribute <= 0) break;
          
          const amountDue = parseFloat(fee.amount_due || 0);
          const amountAlreadyPaid = parseFloat(fee.amount_paid || 0);
          const amountNeeded = amountDue - amountAlreadyPaid;
          
          if (amountNeeded > 0) {
            const amountToPay = Math.min(remainingToDistribute, amountNeeded);
            const newAmountPaid = amountAlreadyPaid + amountToPay;
            
            let newStatus = 'partial';
            if (newAmountPaid >= amountDue) {
              newStatus = 'paid';
            }
            
            await pool.query(
              `UPDATE student_fees 
               SET amount_paid = $1, status = $2, updated_at = CURRENT_TIMESTAMP
               WHERE id = $3`,
              [newAmountPaid, newStatus, fee.id]
            );
            
            remainingToDistribute -= amountToPay;
            feesUpdated++;
            
            console.log(`    Month ${fee.month} ${fee.fee_type}: ₹${amountAlreadyPaid} → ₹${newAmountPaid} (${newStatus})`);
          }
        }
        
        console.log(`  ✅ Updated ${feesUpdated} fee records`);
        totalFixed += feesUpdated;
      }
      
      studentsProcessed++;
    }

    console.log(`\n🎉 Universal payment reconciliation completed!`);
    console.log(`  Students processed: ${studentsProcessed}`);
    console.log(`  Fee records fixed: ${totalFixed}`);

    return {
      success: true,
      message: `Payment reconciliation completed`,
      studentsProcessed,
      recordsFixed: totalFixed
    };

  } catch (error) {
    console.error('❌ Error in universal payment reconciliation:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Fix transport fee payment tracking
 * Ensures transport fees are properly marked as paid when payments are recorded
 */
export async function fixTransportFeePayments(academicYear = '2025-26') {
  console.log(`🚌 Fixing transport fee payment tracking for academic year: ${academicYear}`);
  
  try {
    // Get students who have paid total amounts but transport fees are still unpaid
    const studentsWithUnpaidTransport = await pool.query(`
      WITH student_totals AS (
        SELECT 
          sf.student_id,
          SUM(CASE WHEN fs.fee_type ILIKE '%tuition%' THEN sf.amount_due ELSE 0 END) as tuition_due,
          SUM(CASE WHEN fs.fee_type ILIKE '%tuition%' THEN sf.amount_paid ELSE 0 END) as tuition_paid,
          SUM(CASE WHEN fs.fee_type ILIKE '%transport%' THEN sf.amount_due ELSE 0 END) as transport_due,
          SUM(CASE WHEN fs.fee_type ILIKE '%transport%' THEN sf.amount_paid ELSE 0 END) as transport_paid,
          SUM(sf.amount_due) as total_due,
          SUM(sf.amount_paid) as total_paid
        FROM student_fees sf
        JOIN fee_structures fs ON sf.fee_structure_id = fs.id
        WHERE sf.academic_year = $1
        AND fs.is_active = true
        GROUP BY sf.student_id
      )
      SELECT 
        st.student_id,
        st.tuition_due,
        st.tuition_paid,
        st.transport_due,
        st.transport_paid,
        st.total_due,
        st.total_paid,
        s.admission_number,
        s.first_name,
        s.last_name
      FROM student_totals st
      JOIN students s ON st.student_id = s.id
      WHERE st.transport_due > 0 
      AND st.transport_paid < st.transport_due
      AND st.tuition_paid >= st.tuition_due
      ORDER BY s.admission_number
    `, [academicYear]);

    console.log(`📊 Found ${studentsWithUnpaidTransport.rows.length} students with unpaid transport fees despite tuition being paid`);

    let totalFixed = 0;

    for (const student of studentsWithUnpaidTransport.rows) {
      const { 
        student_id, 
        tuition_due, 
        tuition_paid, 
        transport_due, 
        transport_paid, 
        admission_number, 
        first_name, 
        last_name 
      } = student;
      
      console.log(`\n👤 Processing ${admission_number} - ${first_name} ${last_name}:`);
      console.log(`  Tuition: ₹${tuition_paid}/${tuition_due} (${tuition_paid >= tuition_due ? 'PAID' : 'UNPAID'})`);
      console.log(`  Transport: ₹${transport_paid}/${transport_due} (${transport_paid >= transport_due ? 'PAID' : 'UNPAID'})`);

      // If tuition is fully paid but transport is not, mark transport as paid too
      if (tuition_paid >= tuition_due && transport_paid < transport_due) {
        console.log(`  🔧 Fixing: Marking transport fees as paid`);
        
        const updateResult = await pool.query(
          `UPDATE student_fees 
           SET amount_paid = amount_due, status = 'paid', updated_at = CURRENT_TIMESTAMP
           WHERE student_id = $1 
           AND fee_structure_id IN (
             SELECT id FROM fee_structures 
             WHERE fee_type ILIKE '%transport%' 
             AND academic_year = $2 
             AND is_active = true
           )
           AND academic_year = $2
           AND status IN ('pending', 'partial', 'overdue')`,
          [student_id, academicYear]
        );
        
        console.log(`  ✅ Updated ${updateResult.rowCount} transport fee records`);
        totalFixed += updateResult.rowCount || 0;
      }
    }

    console.log(`\n🎉 Transport fee payment fix completed!`);
    console.log(`  Students processed: ${studentsWithUnpaidTransport.rows.length}`);
    console.log(`  Transport fee records fixed: ${totalFixed}`);

    return {
      success: true,
      message: `Transport fee payments fixed`,
      studentsProcessed: studentsWithUnpaidTransport.rows.length,
      recordsFixed: totalFixed
    };

  } catch (error) {
    console.error('❌ Error fixing transport fee payments:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Automatic payment reconciliation
 * Runs automatically to fix payment discrepancies for all students
 * Prevents multiple simultaneous reconciliations
 */
export async function autoPaymentReconciliation(academicYear = '2025-26') {
  // Prevent multiple simultaneous reconciliations
  if (reconciliationInProgress) {
    console.log('🔄 Payment reconciliation already in progress, skipping...');
    return {
      success: true,
      message: 'Reconciliation already in progress',
      skipped: true
    };
  }

  reconciliationInProgress = true;
  
  try {
    console.log(`🔄 Starting automatic payment reconciliation for academic year: ${academicYear}`);
    
    // First, run transport fee payment fix
    const transportResult = await fixTransportFeePayments(academicYear);
    if (!transportResult.success) {
      console.error('❌ Transport fee payment fix failed:', transportResult.error);
    }
    
    // Then, run universal reconciliation
    const reconciliationResult = await universalPaymentReconciliation(academicYear);
    
    console.log(`✅ Automatic payment reconciliation completed`);
    
    return {
      success: true,
      message: 'Automatic payment reconciliation completed',
      transportFix: transportResult,
      reconciliation: reconciliationResult
    };

  } catch (error) {
    console.error('❌ Error in automatic payment reconciliation:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    reconciliationInProgress = false;
  }
}

/**
 * Check if automatic reconciliation is needed
 * Returns true if there are payment discrepancies
 */
export async function isReconciliationNeeded(academicYear = '2025-26') {
  try {
    const discrepancies = await pool.query(`
      WITH student_payments AS (
        SELECT 
          fp.student_id,
          SUM(fp.amount_paid) as total_payments
        FROM fee_payments fp
        WHERE fp.academic_year = $1
        AND fp.status = 'completed'
        GROUP BY fp.student_id
      ),
      student_fee_totals AS (
        SELECT 
          sf.student_id,
          SUM(sf.amount_paid) as total_paid
        FROM student_fees sf
        JOIN fee_structures fs ON sf.fee_structure_id = fs.id
        WHERE sf.academic_year = $1
        AND fs.is_active = true
        GROUP BY sf.student_id
      )
      SELECT COUNT(*) as discrepancy_count
      FROM student_payments sp
      JOIN student_fee_totals sft ON sp.student_id = sft.student_id
      WHERE sp.total_payments != sft.total_paid
    `, [academicYear]);

    const discrepancyCount = parseInt(discrepancies.rows[0].discrepancy_count || 0);
    
    return {
      needed: discrepancyCount > 0,
      count: discrepancyCount
    };

  } catch (error) {
    console.error('❌ Error checking reconciliation need:', error);
    return {
      needed: false,
      count: 0,
      error: error.message
    };
  }
}
