/**
 * Quick script to find student ID by admission number
 * Usage: node scripts/find-student.js ADM20252484
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

async function findStudent(admissionNumber) {
  try {
    const result = await pool.query(
      `SELECT 
        s.id, 
        s.admission_number, 
        s.first_name, 
        s.last_name,
        s.class_id,
        c.name as class_name,
        st.transport_fee,
        st.status as transport_status
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN student_transport st ON s.id = st.student_id AND st.status = 'active'
      WHERE s.admission_number = $1`,
      [admissionNumber]
    );

    if (result.rows.length === 0) {
      console.log(`❌ Student not found with admission number: ${admissionNumber}`);
      return;
    }

    const student = result.rows[0];
    console.log('\n✅ Student Found:');
    console.log('═'.repeat(60));
    console.log(`ID:               ${student.id}`);
    console.log(`Name:             ${student.first_name} ${student.last_name}`);
    console.log(`Admission Number: ${student.admission_number}`);
    console.log(`Class:            ${student.class_name || 'Not assigned'}`);
    console.log(`Transport Fee:    ${student.transport_fee ? `₹${student.transport_fee}/month` : 'No transport'}`);
    console.log(`Transport Status: ${student.transport_status || 'No transport'}`);
    console.log('═'.repeat(60));
    
    if (student.transport_fee) {
      console.log('\n💡 To sync this student\'s fees, run:');
      console.log(`   node scripts/sync-transport-fees.js ${student.id}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

const admissionNumber = process.argv[2];
if (!admissionNumber) {
  console.log('Usage: node scripts/find-student.js <admission_number>');
  console.log('Example: node scripts/find-student.js ADM20252484');
  process.exit(1);
}

findStudent(admissionNumber);


