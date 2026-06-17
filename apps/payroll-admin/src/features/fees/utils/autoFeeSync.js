/**
 * Universal Auto Fee Sync Utility
 * Automatically syncs and recalculates fees whenever any fee-related data changes
 */

import pool from '@/lib/db';

/**
 * Sync transport fees for a specific student
 * Called whenever transport assignment is updated
 */
export async function syncTransportFeesForStudent(studentId, newTransportFee, academicYear = '2025-26') {
  console.log(`🔄 Auto-syncing transport fees for student ${studentId}: ₹${newTransportFee}`);
  
  try {
    // Get or create transport fee structure
    let transportFeeStructure = await pool.query(
      `SELECT id FROM fee_structures 
       WHERE fee_type ILIKE '%transport%' 
       AND academic_year = $1 
       AND is_active = true
       LIMIT 1`,
      [academicYear]
    );

    let feeStructureId;
    if (transportFeeStructure.rows.length === 0) {
      // Create transport fee structure
      const newStructure = await pool.query(
        `INSERT INTO fee_structures (
          class_id, fee_type, amount, frequency, academic_year, 
          description, is_active, late_fee_percentage, late_fee_days
        ) VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id`,
        [
          'Transport Fee',
          newTransportFee,
          'monthly',
          academicYear,
          'Monthly transport fee (auto-synced)',
          true,
          0,
          7
        ]
      );
      feeStructureId = newStructure.rows[0].id;
      console.log(`📝 Created transport fee structure ID: ${feeStructureId}`);
    } else {
      feeStructureId = transportFeeStructure.rows[0].id;
      console.log(`✅ Using existing transport fee structure ID: ${feeStructureId}`);
    }

    // Update all pending/partial transport fees for this student
    const updateResult = await pool.query(
      `UPDATE student_fees 
       SET amount_due = $1, updated_at = CURRENT_TIMESTAMP
       WHERE student_id = $2 
       AND fee_structure_id = $3 
       AND status IN ('pending', 'partial', 'overdue')
       AND academic_year = $4`,
      [newTransportFee, studentId, feeStructureId, academicYear]
    );

    const updatedCount = updateResult.rowCount || 0;
    console.log(`✅ Updated ${updatedCount} transport fee records for student ${studentId}`);

    // If no existing fees, create them for all 12 months
    if (updatedCount === 0) {
      console.log(`📝 Creating new transport fee records for student ${studentId}`);
      
      const months = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
      
      for (const month of months) {
        // Check if fee already exists
        const existingFee = await pool.query(
          `SELECT id FROM student_fees 
           WHERE student_id = $1 AND fee_structure_id = $2 AND month = $3 AND academic_year = $4`,
          [studentId, feeStructureId, month, academicYear]
        );

        if (existingFee.rows.length === 0) {
          // Create new fee record
          const dueDate = new Date(2025, month - 1, 10);
          await pool.query(
            `INSERT INTO student_fees (
              student_id, fee_structure_id, academic_year, amount_due, amount_paid,
              due_date, month, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
            [
              studentId,
              feeStructureId,
              academicYear,
              newTransportFee,
              0,
              dueDate.toISOString().split('T')[0],
              month,
              'pending'
            ]
          );
        }
      }
      
      console.log(`✅ Created transport fee records for all 12 months`);
    }

    return {
      success: true,
      message: `Transport fees synced for student ${studentId}`,
      updatedCount,
      feeStructureId
    };

  } catch (error) {
    console.error(`❌ Error syncing transport fees for student ${studentId}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Recalculate all fee statuses for a student
 * Called whenever fees are updated to ensure proper status calculation
 */
export async function recalculateStudentFeeStatus(studentId, academicYear = '2025-26') {
  console.log(`🔄 Recalculating fee statuses for student ${studentId}`);
  
  try {
    const currentDate = new Date();
    
    // Update fee statuses based on due dates and payment status
    const updateResult = await pool.query(
      `UPDATE student_fees 
       SET status = CASE 
         WHEN amount_due <= amount_paid THEN 'paid'
         WHEN due_date < CURRENT_DATE AND amount_due > amount_paid THEN 'overdue'
         WHEN due_date >= CURRENT_DATE AND amount_due > amount_paid THEN 'pending'
         ELSE 'pending'
       END,
       updated_at = CURRENT_TIMESTAMP
       WHERE student_id = $1 
       AND academic_year = $2`,
      [studentId, academicYear]
    );

    console.log(`✅ Updated ${updateResult.rowCount || 0} fee statuses for student ${studentId}`);
    
    return {
      success: true,
      message: `Fee statuses recalculated for student ${studentId}`,
      updatedCount: updateResult.rowCount || 0
    };

  } catch (error) {
    console.error(`❌ Error recalculating fee statuses for student ${studentId}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Universal fee sync for any fee structure change
 * Can be called from any API that updates fee-related data
 */
export async function universalFeeSync(options = {}) {
  const {
    studentId = null,
    feeStructureId = null,
    newAmount = null,
    academicYear = '2025-26',
    reason = 'Manual sync'
  } = options;

  console.log(`🔄 Universal fee sync triggered: ${reason}`);
  
  try {
    let results = [];

    if (studentId && feeStructureId && newAmount !== null) {
      // Sync specific student and fee structure
      const updateResult = await pool.query(
        `UPDATE student_fees 
         SET amount_due = $1, updated_at = CURRENT_TIMESTAMP
         WHERE student_id = $2 
         AND fee_structure_id = $3 
         AND status IN ('pending', 'partial', 'overdue')
         AND academic_year = $4`,
        [newAmount, studentId, feeStructureId, academicYear]
      );

      results.push({
        type: 'specific_update',
        updatedCount: updateResult.rowCount || 0,
        studentId,
        feeStructureId,
        newAmount
      });

      // Recalculate statuses for this student
      const statusResult = await recalculateStudentFeeStatus(studentId, academicYear);
      results.push(statusResult);

    } else if (studentId) {
      // Recalculate all fees for a specific student
      const statusResult = await recalculateStudentFeeStatus(studentId, academicYear);
      results.push(statusResult);

    } else {
      // Full system recalculation (use sparingly)
      console.log(`⚠️  Full system recalculation - this might take a while`);
      
      const fullUpdateResult = await pool.query(
        `UPDATE student_fees 
         SET status = CASE 
           WHEN amount_due <= amount_paid THEN 'paid'
           WHEN due_date < CURRENT_DATE AND amount_due > amount_paid THEN 'overdue'
           WHEN due_date >= CURRENT_DATE AND amount_due > amount_paid THEN 'pending'
           ELSE 'pending'
         END,
         updated_at = CURRENT_TIMESTAMP
         WHERE academic_year = $1`,
        [academicYear]
      );

      results.push({
        type: 'full_system_update',
        updatedCount: fullUpdateResult.rowCount || 0,
        message: 'Full system fee status recalculation completed'
      });
    }

    console.log(`✅ Universal fee sync completed: ${reason}`);
    return {
      success: true,
      message: `Fee sync completed: ${reason}`,
      results
    };

  } catch (error) {
    console.error(`❌ Error in universal fee sync:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Clean up orphaned fee records
 * Removes fee records that reference non-existent fee structures
 */
export async function cleanupOrphanedFees(academicYear = '2025-26') {
  console.log(`🧹 Cleaning up orphaned fee records for academic year: ${academicYear}`);
  
  try {
    const deleteResult = await pool.query(
      `DELETE FROM student_fees 
       WHERE id IN (
         SELECT sf.id
         FROM student_fees sf
         LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
         WHERE fs.id IS NULL
         AND sf.academic_year = $1
       )`,
      [academicYear]
    );

    console.log(`✅ Cleaned up ${deleteResult.rowCount || 0} orphaned fee records`);
    
    return {
      success: true,
      message: `Cleaned up ${deleteResult.rowCount || 0} orphaned fee records`,
      deletedCount: deleteResult.rowCount || 0
    };

  } catch (error) {
    console.error(`❌ Error cleaning up orphaned fees:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}
