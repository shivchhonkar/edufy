/**
 * Script to check for duplicate fee structures
 * Run with: node scripts/check-duplicate-fees.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'edulakhya',
});

async function checkDuplicateFees() {
  try {
    console.log('🔍 Checking for duplicate fee structures...\n');

    // Query to find all fee structures
    const result = await pool.query(`
      SELECT 
        fs.id,
        fs.fee_type,
        fs.description,
        c.name as class_name,
        fs.class_id,
        fs.amount,
        fs.frequency,
        fs.academic_year,
        fs.is_active,
        fc.name as category_name,
        fs.created_at
      FROM fee_structures fs
      LEFT JOIN classes c ON fs.class_id = c.id
      LEFT JOIN fee_categories fc ON fs.category_id = fc.id
      ORDER BY fs.fee_type, c.name, fs.created_at DESC
    `);

    console.log(`📊 Total fee structures found: ${result.rows.length}\n`);

    // Group by fee_type to find duplicates
    const grouped = {};
    result.rows.forEach(fee => {
      const key = fee.fee_type.toLowerCase();
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(fee);
    });

    // Display duplicates
    let hasDuplicates = false;
    Object.keys(grouped).forEach(feeType => {
      const fees = grouped[feeType];
      if (fees.length > 1) {
        hasDuplicates = true;
        console.log(`⚠️  DUPLICATE: ${fees[0].fee_type} (${fees.length} entries)`);
        console.log('─'.repeat(80));
        
        fees.forEach((fee, index) => {
          console.log(`\n  Entry ${index + 1}:`);
          console.log(`    ID: ${fee.id}`);
          console.log(`    Class: ${fee.class_name || 'All Classes'}`);
          console.log(`    Amount: ₹${fee.amount}`);
          console.log(`    Academic Year: ${fee.academic_year}`);
          console.log(`    Frequency: ${fee.frequency}`);
          console.log(`    Status: ${fee.is_active ? '✅ Active' : '❌ Inactive'}`);
          console.log(`    Description: ${fee.description || 'N/A'}`);
          console.log(`    Category: ${fee.category_name || 'N/A'}`);
          console.log(`    Created: ${new Date(fee.created_at).toLocaleString()}`);
        });
        console.log('\n' + '═'.repeat(80) + '\n');
      }
    });

    if (!hasDuplicates) {
      console.log('✅ No duplicates found! All fee structures are unique.\n');
    } else {
      console.log('\n💡 How to fix duplicates:');
      console.log('   1. Review the entries above');
      console.log('   2. Decide which ones to keep (usually the newest or most accurate)');
      console.log('   3. Delete unwanted entries using the ID');
      console.log('   4. Or deactivate them by setting is_active = false\n');
      
      console.log('📝 Example SQL to delete a duplicate:');
      console.log('   DELETE FROM fee_structures WHERE id = <ID_NUMBER>;\n');
      
      console.log('📝 Example SQL to deactivate a duplicate:');
      console.log('   UPDATE fee_structures SET is_active = false WHERE id = <ID_NUMBER>;\n');
    }

    // Summary by fee type
    console.log('📋 Summary of all fee types:');
    console.log('─'.repeat(80));
    Object.keys(grouped).sort().forEach(feeType => {
      const count = grouped[feeType].length;
      const icon = count > 1 ? '⚠️ ' : '✅ ';
      console.log(`${icon} ${grouped[feeType][0].fee_type}: ${count} entry/entries`);
    });

  } catch (error) {
    console.error('❌ Error checking duplicate fees:', error);
  } finally {
    await pool.end();
  }
}

checkDuplicateFees();





