/**
 * Universal script to fix duplicate fee structures for any class
 * Run with: node scripts/fix-duplicate-fees-universal.js
 */

const { Pool } = require('pg');

// Database connection without dotenv dependency
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'edulakhya',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function analyzeDuplicateFees() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Analyzing duplicate fees across all classes...\n');
    
    // Find all duplicate fee structures
    const duplicateQuery = `
      SELECT 
        fs.fee_type,
        fs.class_id,
        c.name as class_name,
        fs.academic_year,
        fs.frequency,
        COUNT(*) as duplicate_count,
        STRING_AGG(fs.id::text, ', ' ORDER BY fs.created_at DESC) as fee_ids,
        STRING_AGG(fs.amount::text, ', ' ORDER BY fs.created_at DESC) as amounts,
        STRING_AGG(fs.is_active::text, ', ' ORDER BY fs.created_at DESC) as active_status,
        STRING_AGG(fs.created_at::text, ', ' ORDER BY fs.created_at DESC) as created_dates
      FROM fee_structures fs
      LEFT JOIN classes c ON fs.class_id = c.id
      GROUP BY fs.fee_type, fs.class_id, c.name, fs.academic_year, fs.frequency
      HAVING COUNT(*) > 1
      ORDER BY c.name, fs.fee_type;
    `;
    
    const result = await client.query(duplicateQuery);
    
    if (result.rows.length === 0) {
      console.log('✅ No duplicate fees found across all classes!');
      return;
    }
    
    console.log(`📊 Found ${result.rows.length} groups of duplicate fees:\n`);
    
    for (const duplicate of result.rows) {
      console.log(`🎯 ${duplicate.class_name || 'All Classes'} - ${duplicate.fee_type}`);
      console.log(`   Academic Year: ${duplicate.academic_year}`);
      console.log(`   Frequency: ${duplicate.frequency}`);
      console.log(`   Duplicates: ${duplicate.duplicate_count}`);
      console.log(`   IDs: ${duplicate.fee_ids}`);
      console.log(`   Amounts: ${duplicate.amounts}`);
      console.log(`   Active Status: ${duplicate.active_status}`);
      console.log(`   Created Dates: ${duplicate.created_dates}`);
      
      // Check which ones have student fees
      const feeIds = duplicate.fee_ids.split(', ');
      const studentFeesQuery = `
        SELECT 
          fs.id,
          fs.amount,
          fs.is_active,
          fs.created_at,
          COUNT(sf.id) as student_fee_count
        FROM fee_structures fs
        LEFT JOIN student_fees sf ON fs.id = sf.fee_structure_id
        WHERE fs.id = ANY($1)
        GROUP BY fs.id, fs.amount, fs.is_active, fs.created_at
        ORDER BY fs.created_at DESC;
      `;
      
      const studentFeesResult = await client.query(studentFeesQuery, [feeIds]);
      
      console.log(`   📋 Detailed Analysis:`);
      studentFeesResult.rows.forEach((fee, index) => {
        console.log(`      ${index + 1}. ID ${fee.id}: ₹${fee.amount} (${fee.is_active ? 'Active' : 'Inactive'}) - ${fee.student_fee_count} student fees`);
      });
      
      const withStudentFees = studentFeesResult.rows.filter(f => f.student_fee_count > 0);
      const withoutStudentFees = studentFeesResult.rows.filter(f => f.student_fee_count === 0);
      
      console.log(`   💡 Recommendation:`);
      if (withStudentFees.length > 1) {
        console.log(`      ⚠️  Multiple fees have student records. Consider deactivating duplicates.`);
      } else if (withoutStudentFees.length > 0) {
        console.log(`      ✅ Can safely delete ${withoutStudentFees.length} fee(s) without student records.`);
      } else {
        console.log(`      ⚠️  All fees have student records. Consider deactivating duplicates.`);
      }
      
      console.log('   ' + '='.repeat(50));
    }
    
    console.log('\n🛠️  Solutions:');
    console.log('1. For fees WITHOUT student records: Delete them');
    console.log('2. For fees WITH student records: Deactivate duplicates instead');
    console.log('3. Use the UI delete button - it will show helpful error messages');
    console.log('4. Use the UI edit button to deactivate duplicates');
    
    console.log('\n📝 To fix manually:');
    console.log('1. Go to http://localhost:3000/fees');
    console.log('2. Try to delete duplicate fees');
    console.log('3. If deletion fails, edit the fee and uncheck "Enable this fee"');
    console.log('4. This will deactivate the duplicate while preserving data integrity');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the analysis
analyzeDuplicateFees();



