const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'edulakhya',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function fixClass7DuplicateTuition() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking for duplicate tuition fees in Class 7...\n');
    
    // First, let's see what we have
    const checkQuery = `
      SELECT 
        fs.id,
        fs.fee_type,
        fs.amount,
        fs.is_active,
        fs.created_at,
        c.name as class_name,
        COUNT(sf.id) as student_fee_count
      FROM fee_structures fs
      LEFT JOIN classes c ON fs.class_id = c.id
      LEFT JOIN student_fees sf ON fs.id = sf.fee_structure_id
      WHERE fs.fee_type ILIKE '%tuition%' 
        AND c.name = 'Class 7'
      GROUP BY fs.id, fs.fee_type, fs.amount, fs.is_active, fs.created_at, c.name
      ORDER BY fs.created_at DESC;
    `;
    
    const result = await client.query(checkQuery);
    
    if (result.rows.length === 0) {
      console.log('❌ No tuition fees found for Class 7');
      return;
    }
    
    console.log('📊 Found tuition fees for Class 7:');
    console.log('=====================================');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}`);
      console.log(`   Fee Type: ${row.fee_type}`);
      console.log(`   Amount: ₹${row.amount}`);
      console.log(`   Active: ${row.is_active ? 'Yes' : 'No'}`);
      console.log(`   Student Fees: ${row.student_fee_count}`);
      console.log(`   Created: ${row.created_at}`);
      console.log('   ---');
    });
    
    if (result.rows.length <= 1) {
      console.log('✅ No duplicates found for Class 7 tuition fees');
      return;
    }
    
    // Find the one with student fees (keep this one)
    const withStudentFees = result.rows.filter(row => row.student_fee_count > 0);
    const withoutStudentFees = result.rows.filter(row => row.student_fee_count === 0);
    
    console.log(`\n🎯 Analysis:`);
    console.log(`   - Tuition fees with student records: ${withStudentFees.length}`);
    console.log(`   - Tuition fees without student records: ${withoutStudentFees.length}`);
    
    if (withStudentFees.length > 1) {
      console.log('\n⚠️  Multiple tuition fees have student records. Manual review needed.');
      console.log('   Consider deactivating the duplicates instead of deleting.');
      return;
    }
    
    if (withoutStudentFees.length === 0) {
      console.log('\n⚠️  All tuition fees have student records. Cannot safely delete any.');
      console.log('   Consider deactivating duplicates instead.');
      return;
    }
    
    // Safe to delete the ones without student fees
    console.log('\n🗑️  Safe to delete tuition fees without student records:');
    for (const fee of withoutStudentFees) {
      console.log(`   - ID ${fee.id}: ${fee.fee_type} (₹${fee.amount})`);
    }
    
    // Ask for confirmation
    console.log('\n❓ Do you want to delete these duplicate tuition fees? (This will be logged but not executed)');
    console.log('   To actually delete, uncomment the deletion code below.');
    
    // Uncomment the following lines to actually perform the deletion:
    /*
    for (const fee of withoutStudentFees) {
      await client.query('DELETE FROM fee_structures WHERE id = $1', [fee.id]);
      console.log(`✅ Deleted fee structure ID ${fee.id}`);
    }
    console.log(`\n🎉 Successfully removed ${withoutStudentFees.length} duplicate tuition fee(s) for Class 7`);
    */
    
    // Alternative: Deactivate duplicates instead of deleting
    console.log('\n💡 Alternative: Deactivate duplicates instead of deleting');
    console.log('   This preserves data integrity while preventing new assignments.');
    
    // Uncomment to deactivate instead of delete:
    /*
    for (const fee of withoutStudentFees) {
      await client.query('UPDATE fee_structures SET is_active = false WHERE id = $1', [fee.id]);
      console.log(`✅ Deactivated fee structure ID ${fee.id}`);
    }
    console.log(`\n🎉 Successfully deactivated ${withoutStudentFees.length} duplicate tuition fee(s) for Class 7`);
    */
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
fixClass7DuplicateTuition();
