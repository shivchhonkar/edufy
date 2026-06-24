/**
 * Unified Fee Management System
 * 
 * This module provides a centralized way to manage ALL types of fees
 * - Ensures single source of truth (student_fees table)
 * - Automatic synchronization across all related records
 * - Works for any fee type: Tuition, Transport, Lab, Library, etc.
 * - No data duplication
 * 
 * @author Shribi Edufy Team
 * @version 2.0
 */

import pool from './db';
import { FeeGenerationService } from '@/lib/fees/FeeGenerationService';
import { clientAsRequestDb } from '@/lib/fees/request-db-adapter';

export interface FeeUpdateOptions {
  studentId?: number;
  feeStructureId?: number;
  newAmount: number;
  academicYear?: string;
  updateExistingFees?: boolean;
  onlyPending?: boolean;
  reason?: string;
}

export interface BulkFeeUpdateOptions {
  feeType: string;
  classId?: number;
  newAmount: number;
  academicYear?: string;
  updateExistingFees?: boolean;
}

/**
 * Universal Fee Update - Updates fees for a specific student
 * This is the primary method for updating any type of fee
 */
export async function updateStudentFee(options: FeeUpdateOptions): Promise<{
  success: boolean;
  updatedCount: number;
  message: string;
  error?: string;
}> {
  const client = await pool.connect();
  
  try {
    const {
      studentId,
      feeStructureId,
      newAmount,
      academicYear,
      updateExistingFees = true,
      onlyPending = true,
      reason
    } = options;

    if (!studentId && !feeStructureId) {
      throw new Error('Either studentId or feeStructureId must be provided');
    }

    await client.query('BEGIN');

    try {
      // Get target academic year
      let targetAcademicYear = academicYear;
      if (!targetAcademicYear) {
        const yearResult = await client.query(
          `SELECT academic_year FROM academic_years WHERE is_active = true ORDER BY id DESC LIMIT 1`
        );
        targetAcademicYear = yearResult.rows.length > 0 
          ? yearResult.rows[0].academic_year 
          : new Date().getFullYear().toString();
      }

      // Build update query
      let updateQuery = `
        UPDATE student_fees 
        SET amount_due = $1, updated_at = CURRENT_TIMESTAMP
        WHERE 1=1
      `;
      const queryParams: any[] = [newAmount];
      let paramCount = 1;

      if (studentId) {
        paramCount++;
        updateQuery += ` AND student_id = $${paramCount}`;
        queryParams.push(studentId);
      }

      if (feeStructureId) {
        paramCount++;
        updateQuery += ` AND fee_structure_id = $${paramCount}`;
        queryParams.push(feeStructureId);
      }

      paramCount++;
      updateQuery += ` AND academic_year = $${paramCount}`;
      queryParams.push(targetAcademicYear);

      if (onlyPending) {
        updateQuery += ` AND status IN ('pending', 'partial')`;
      }

      const result = await client.query(updateQuery, queryParams);
      const updatedCount = result.rowCount || 0;

      // Log the change if reason provided
      if (reason && updatedCount > 0) {
        await client.query(
          `INSERT INTO fee_update_log (student_id, fee_structure_id, old_amount, new_amount, reason, updated_at)
           SELECT student_id, fee_structure_id, amount_due, $1, $2, NOW()
           FROM student_fees
           WHERE student_id = $3
           ON CONFLICT DO NOTHING`,
          [newAmount, reason, studentId]
        ).catch(() => {
          // Table might not exist
          console.log('Fee update log not available');
        });
      }

      await client.query('COMMIT');

      console.log(`✅ Updated ${updatedCount} fee record(s) for student ${studentId || 'multiple'}`);

      return {
        success: true,
        updatedCount,
        message: `Successfully updated ${updatedCount} fee record(s)`
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error: any) {
    console.error('Error updating student fee:', error);
    return {
      success: false,
      updatedCount: 0,
      message: 'Failed to update fees',
      error: error.message
    };
  } finally {
    client.release();
  }
}

/**
 * Bulk Fee Update - Updates fees for multiple students
 * Used when a fee structure changes and needs to be applied to all students
 */
export async function bulkUpdateFees(options: BulkFeeUpdateOptions): Promise<{
  success: boolean;
  updatedCount: number;
  affectedStudents: number;
  message: string;
  error?: string;
}> {
  const client = await pool.connect();
  
  try {
    const {
      feeType,
      classId,
      newAmount,
      academicYear,
      updateExistingFees = true
    } = options;

    await client.query('BEGIN');

    try {
      // Get fee structure ID
      let feeStructureQuery = `
        SELECT id FROM fee_structures 
        WHERE fee_type ILIKE $1
      `;
      const feeQueryParams: any[] = [`%${feeType}%`];

      if (classId) {
        feeStructureQuery += ` AND (class_id = $2 OR class_id IS NULL)`;
        feeQueryParams.push(classId);
      }

      feeStructureQuery += ` ORDER BY id DESC LIMIT 1`;

      const feeStructureResult = await client.query(feeStructureQuery, feeQueryParams);

      if (feeStructureResult.rows.length === 0) {
        throw new Error(`Fee structure not found for type: ${feeType}`);
      }

      const feeStructureId = feeStructureResult.rows[0].id;

      // Update the fee structure
      await client.query(
        `UPDATE fee_structures SET amount = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [newAmount, feeStructureId]
      );

      if (updateExistingFees) {
        // Get target academic year
        let targetAcademicYear = academicYear;
        if (!targetAcademicYear) {
          const yearResult = await client.query(
            `SELECT academic_year FROM academic_years WHERE is_active = true ORDER BY id DESC LIMIT 1`
          );
          targetAcademicYear = yearResult.rows.length > 0 
            ? yearResult.rows[0].academic_year 
            : new Date().getFullYear().toString();
        }

        // Update all student fees
        const updateResult = await client.query(
          `UPDATE student_fees 
           SET amount_due = $1, updated_at = CURRENT_TIMESTAMP
           WHERE fee_structure_id = $2 
           AND academic_year = $3
           AND status IN ('pending', 'partial')`,
          [newAmount, feeStructureId, targetAcademicYear]
        );

        const updatedCount = updateResult.rowCount || 0;

        // Count affected students
        const studentsResult = await client.query(
          `SELECT COUNT(DISTINCT student_id) as count
           FROM student_fees
           WHERE fee_structure_id = $1 AND academic_year = $2`,
          [feeStructureId, targetAcademicYear]
        );

        const affectedStudents = parseInt(studentsResult.rows[0]?.count || '0');

        await client.query('COMMIT');

        console.log(`✅ Bulk update: ${updatedCount} fees updated for ${affectedStudents} students`);

        return {
          success: true,
          updatedCount,
          affectedStudents,
          message: `Successfully updated fees for ${affectedStudents} student(s)`
        };
      }

      await client.query('COMMIT');

      return {
        success: true,
        updatedCount: 0,
        affectedStudents: 0,
        message: 'Fee structure updated (existing fees not modified)'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error: any) {
    console.error('Error in bulk fee update:', error);
    return {
      success: false,
      updatedCount: 0,
      affectedStudents: 0,
      message: 'Failed to update fees',
      error: error.message
    };
  } finally {
    client.release();
  }
}

/**
 * Get Student Fee Amount - Single source for fee amounts
 * Always queries student_fees table (single source of truth)
 */
export async function getStudentFeeAmount(
  studentId: number,
  feeType: string,
  month?: number,
  academicYear?: string
): Promise<number | null> {
  const client = await pool.connect();
  
  try {
    let targetAcademicYear = academicYear;
    if (!targetAcademicYear) {
      const yearResult = await client.query(
        `SELECT academic_year FROM academic_years WHERE is_active = true ORDER BY id DESC LIMIT 1`
      );
      targetAcademicYear = yearResult.rows.length > 0 
        ? yearResult.rows[0].academic_year 
        : new Date().getFullYear().toString();
    }

    let query = `
      SELECT sf.amount_due
      FROM student_fees sf
      JOIN fee_structures fs ON sf.fee_structure_id = fs.id
      WHERE sf.student_id = $1
      AND fs.fee_type ILIKE $2
      AND fs.is_active = true
      AND sf.academic_year = $3
    `;
    const params: any[] = [studentId, `%${feeType}%`, targetAcademicYear];

    if (month) {
      query += ` AND sf.month = $4`;
      params.push(month);
    }

    query += ` ORDER BY sf.month ASC LIMIT 1`;

    const result = await client.query(query, params);

    return result.rows.length > 0 ? parseFloat(result.rows[0].amount_due) : null;
  } catch (error) {
    console.error('Error getting student fee amount:', error);
    return null;
  } finally {
    client.release();
  }
}

/**
 * Sync Transport Fees - Ensures transport fees match transport assignments
 * This is a helper function that uses the unified fee system
 */
export async function syncTransportFeesForStudent(
  studentId: number,
  transportFee: number,
  academicYear?: string
): Promise<{ success: boolean; updatedCount: number; message: string }> {
  // Use the unified update function
  return updateStudentFee({
    studentId,
    newAmount: transportFee,
    academicYear,
    updateExistingFees: true,
    onlyPending: true,
    reason: 'Transport assignment updated'
  });
}

/**
 * Generate Fees for Student - delegates to FeeGenerationService
 */
export async function generateFeesForStudent(
  studentId: number,
  academicYear: string,
  months: number[]
): Promise<{ success: boolean; created: number; message: string; error?: string }> {
  const client = await pool.connect();

  try {
    const db = clientAsRequestDb(client);

    const result = await FeeGenerationService.generateMonths(db, {
      academicYear,
      months,
      studentIds: [studentId],
      monthlyOnly: true,
      conflictStrategy: 'ignore',
    });

    return {
      success: true,
      created: result.feesAssigned,
      message: `Generated ${result.feesAssigned} fee record(s)`,
    };
  } catch (error: unknown) {
    console.error('Error generating fees:', error);
    return {
      success: false,
      created: 0,
      message: 'Failed to generate fees',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    client.release();
  }
}


