/**
 * Check current fees for a student by admission number
 * Usage: node scripts/check-student-fees.js ADM20252484
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

async function checkStudentFees(admissionNumber) {
  try {
    // Get student info
    const studentResult = await pool.query(
      `SELECT id, first_name, last_name, admission_number FROM students WHERE admission_number = $1`,
      [admissionNumber]
    );

    if (studentResult.rows.length === 0) {
      console.log(`❌ Student not found: ${admissionNumber}`);
      return;
    }

    const student = studentResult.rows[0];
    console.log('\n📋 Student Information:');
    console.log('═'.repeat(80));
    console.log(`Name: ${student.first_name} ${student.last_name}`);
    console.log(`Admission Number: ${student.admission_number}`);
    console.log(`Student ID: ${student.id}`);
    console.log('═'.repeat(80));

    // Get transport assignment
    console.log('\n🚌 Transport Assignment:');
    console.log('─'.repeat(80));
    const transportResult = await pool.query(
      `SELECT st.transport_fee, st.status, r.route_name, rs.stop_name
       FROM student_transport st
       LEFT JOIN routes r ON st.route_id = r.id
       LEFT JOIN route_stops rs ON st.stop_id = rs.id
       WHERE st.student_id = $1`,
      [student.id]
    );

    if (transportResult.rows.length === 0) {
      console.log('❌ No transport assignment found');
    } else {
      const transport = transportResult.rows[0];
      console.log(`Route: ${transport.route_name || 'N/A'}`);
      console.log(`Stop: ${transport.stop_name || 'N/A'}`);
      console.log(`Transport Fee (in student_transport): ₹${transport.transport_fee || 0}/month`);
      console.log(`Status: ${transport.status}`);
    }

    // Get transport fees from student_fees
    console.log('\n💰 Transport Fees (in student_fees table):');
    console.log('─'.repeat(80));
    const feesResult = await pool.query(
      `SELECT 
        sf.month,
        sf.amount_due,
        sf.amount_paid,
        sf.status,
        sf.academic_year,
        fs.fee_type
      FROM student_fees sf
      JOIN fee_structures fs ON sf.fee_structure_id = fs.id
      WHERE sf.student_id = $1 
      AND fs.fee_type ILIKE '%transport%'
      ORDER BY sf.month`,
      [student.id]
    );

    if (feesResult.rows.length === 0) {
      console.log('❌ No transport fees found in student_fees table');
      console.log('\n💡 This means transport fees need to be synced!');
      console.log('   Run: node scripts/sync-transport-fees.js');
    } else {
      console.log(`Found ${feesResult.rows.length} transport fee records:`);
      console.log('');
      console.log('Month | Amount Due | Amount Paid | Status   | Academic Year');
      console.log('─'.repeat(80));
      
      let totalPending = 0;
      feesResult.rows.forEach(fee => {
        const pending = parseFloat(fee.amount_due) - parseFloat(fee.amount_paid || 0);
        if (fee.status === 'pending' || fee.status === 'partial') {
          totalPending += pending;
        }
        console.log(
          `${String(fee.month).padStart(5)} | ` +
          `₹${String(fee.amount_due).padStart(9)} | ` +
          `₹${String(fee.amount_paid || 0).padStart(10)} | ` +
          `${fee.status.padEnd(8)} | ` +
          `${fee.academic_year}`
        );
      });
      console.log('─'.repeat(80));
      console.log(`Total Pending: ₹${totalPending}`);
    }

    // Compare transport_fee with student_fees
    if (transportResult.rows.length > 0 && feesResult.rows.length > 0) {
      const transportFee = parseFloat(transportResult.rows[0].transport_fee || 0);
      const studentFee = parseFloat(feesResult.rows[0].amount_due || 0);
      
      console.log('\n🔍 Comparison:');
      console.log('─'.repeat(80));
      console.log(`Transport Assignment Fee: ₹${transportFee}`);
      console.log(`Student Fees Amount Due:  ₹${studentFee}`);
      
      if (transportFee !== studentFee) {
        console.log('\n⚠️  MISMATCH DETECTED!');
        console.log('   The transport assignment fee does not match the student fees.');
        console.log('   You need to sync the fees!');
        console.log('\n💡 Run: node scripts/sync-transport-fees.js');
      } else {
        console.log('\n✅ Fees are in sync!');
      }
    }

    console.log('\n' + '═'.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

const admissionNumber = process.argv[2];
if (!admissionNumber) {
  console.log('Usage: node scripts/check-student-fees.js <admission_number>');
  console.log('Example: node scripts/check-student-fees.js ADM20252484');
  process.exit(1);
}

checkStudentFees(admissionNumber);


