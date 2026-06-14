/**
 * Script to sync transport fees from student_transport to student_fees
 * Run this script when transport fees are updated and need to be reflected in the fees page
 * 
 * Usage:
 * node scripts/sync-transport-fees.js [student_id] [academic_year]
 * 
 * Examples:
 * node scripts/sync-transport-fees.js          # Sync all students
 * node scripts/sync-transport-fees.js 123      # Sync specific student
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'edu_crm',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function syncTransportFees(studentId, academicYear) {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting transport fee synchronization...\n');
    
    await client.query('BEGIN');

    // Get or determine the academic year
    let targetAcademicYear = academicYear;
    if (!targetAcademicYear) {
      const academicYearResult = await client.query(
        `SELECT academic_year FROM academic_years WHERE is_active = true ORDER BY id DESC LIMIT 1`
      );
      targetAcademicYear = academicYearResult.rows.length > 0 
        ? academicYearResult.rows[0].academic_year 
        : new Date().getFullYear().toString();
    }

    console.log(`📅 Academic Year: ${targetAcademicYear}\n`);

    // Get or create transport fee structure
    let transportFeeStructure = await client.query(
      `SELECT id FROM fee_structures 
       WHERE fee_type ILIKE '%transport%' 
       AND academic_year = $1 
       AND frequency = 'monthly'
       LIMIT 1`,
      [targetAcademicYear]
    );

    let feeStructureId;

    if (transportFeeStructure.rows.length === 0) {
      console.log('📝 Creating transport fee structure...');
      const newStructure = await client.query(
        `INSERT INTO fee_structures (
          class_id, fee_type, amount, frequency, academic_year, 
          description, is_active, late_fee_percentage, late_fee_days
        ) VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id`,
        [
          'Transport Fee',
          0,
          'monthly',
          targetAcademicYear,
          'Monthly transport fee (varies by route)',
          true,
          0,
          7
        ]
      );
      feeStructureId = newStructure.rows[0].id;
      console.log(`✅ Created transport fee structure with ID: ${feeStructureId}\n`);
    } else {
      feeStructureId = transportFeeStructure.rows[0].id;
      console.log(`✅ Using existing transport fee structure ID: ${feeStructureId}\n`);
    }

    // Get all students with active transport assignments
    let query = `
      SELECT st.student_id, st.transport_fee, s.first_name, s.last_name, s.admission_number
      FROM student_transport st
      JOIN students s ON st.student_id = s.id
      WHERE st.status = 'active' AND st.transport_fee IS NOT NULL AND st.transport_fee > 0
    `;
    let queryParams = [];

    if (studentId) {
      query += ` AND st.student_id = $1`;
      queryParams.push(studentId);
    }

    const transportAssignments = await client.query(query, queryParams);
    console.log(`📊 Found ${transportAssignments.rows.length} students with active transport\n`);

    if (transportAssignments.rows.length === 0) {
      console.log('⚠️  No students with active transport found. Nothing to sync.');
      await client.query('ROLLBACK');
      return;
    }

    let syncedCount = 0;
    let updatedCount = 0;
    let createdCount = 0;

    // For each student, sync their transport fees
    for (const assignment of transportAssignments.rows) {
      const { student_id: sid, transport_fee, first_name, last_name, admission_number } = assignment;
      console.log(`\n👤 Processing ${first_name} ${last_name} (${admission_number})`);
      console.log(`   Student ID: ${sid} | Transport Fee: ₹${transport_fee}`);

      // Generate fees for all 12 months
      for (let month = 1; month <= 12; month++) {
        const year = new Date().getFullYear();
        const dueDate = new Date(year, month - 1, 10);

        // Check if fee record exists
        const existingFee = await client.query(
          `SELECT id, amount_due, status FROM student_fees 
           WHERE student_id = $1 
           AND fee_structure_id = $2 
           AND academic_year = $3 
           AND month = $4`,
          [sid, feeStructureId, targetAcademicYear, month]
        );

        if (existingFee.rows.length > 0) {
          // Update existing fee if amount is different and status is pending/partial
          const existingRecord = existingFee.rows[0];
          if (
            parseFloat(existingRecord.amount_due) !== parseFloat(transport_fee) &&
            (existingRecord.status === 'pending' || existingRecord.status === 'partial')
          ) {
            await client.query(
              `UPDATE student_fees 
               SET amount_due = $1, updated_at = CURRENT_TIMESTAMP
               WHERE id = $2`,
              [transport_fee, existingRecord.id]
            );
            updatedCount++;
            console.log(`   ✏️  Month ${month}: Updated ₹${existingRecord.amount_due} → ₹${transport_fee}`);
          }
        } else {
          // Create new fee record
          await client.query(
            `INSERT INTO student_fees (
              student_id, fee_structure_id, academic_year, amount_due,
              due_date, month, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
            [
              sid,
              feeStructureId,
              targetAcademicYear,
              transport_fee,
              dueDate.toISOString().split('T')[0],
              month,
              'pending'
            ]
          );
          createdCount++;
          console.log(`   ➕  Month ${month}: Created ₹${transport_fee}`);
        }
        syncedCount++;
      }
    }

    await client.query('COMMIT');

    console.log('\n' + '='.repeat(60));
    console.log('✅ SYNC COMPLETE!');
    console.log('='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   - Students Processed: ${transportAssignments.rows.length}`);
    console.log(`   - Total Fee Records Synced: ${syncedCount}`);
    console.log(`   - New Records Created: ${createdCount}`);
    console.log(`   - Existing Records Updated: ${updatedCount}`);
    console.log(`   - Academic Year: ${targetAcademicYear}`);
    console.log('='.repeat(60));

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error syncing transport fees:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Main execution
(async () => {
  const studentId = process.argv[2] ? parseInt(process.argv[2]) : null;
  const academicYear = process.argv[3] || null;

  try {
    await syncTransportFees(studentId, academicYear);
    console.log('\n✅ Done! You can now check the fees page to see the updated amounts.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed to sync transport fees:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();


