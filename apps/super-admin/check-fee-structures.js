const { Pool } = require('pg');

// Database connection (you may need to adjust these settings)
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Shribi Edufy',
  password: 'password',
  port: 5432,
});

async function checkFeeStructures() {
  try {
    console.log('🔍 Checking Fee Structures Table...\n');

    // Query all fee structures
    const result = await pool.query(`
      SELECT 
        fs.id,
        fs.fee_type,
        fs.amount,
        fs.is_active,
        fs.academic_year,
        fs.frequency,
        fs.created_at,
        fs.updated_at,
        c.name as class_name,
        c.id as class_id
      FROM fee_structures fs
      LEFT JOIN classes c ON fs.class_id = c.id
      ORDER BY c.name ASC NULLS FIRST, fs.fee_type ASC, fs.created_at DESC
    `);

    console.log('📊 All Fee Structures in Database:');
    console.log('=====================================');
    console.log(`Total Records: ${result.rows.length}\n`);

    if (result.rows.length === 0) {
      console.log('❌ No fee structures found in database');
      return;
    }

    // Group by class
    const groupedByClass = {};
    result.rows.forEach(fee => {
      const className = fee.class_name || 'No Class';
      if (!groupedByClass[className]) {
        groupedByClass[className] = [];
      }
      groupedByClass[className].push(fee);
    });

    // Display by class
    Object.keys(groupedByClass).sort().forEach(className => {
      const fees = groupedByClass[className];
      console.log(`\n📚 ${className}:`);
      console.log('─'.repeat(50));
      
      fees.forEach((fee, index) => {
        const status = fee.is_active ? '✅ Active' : '❌ Inactive';
        const statusColor = fee.is_active ? '\x1b[32m' : '\x1b[31m';
        const resetColor = '\x1b[0m';
        
        console.log(`${index + 1}. ${fee.fee_type}`);
        console.log(`   ID: ${fee.id}`);
        console.log(`   Amount: ₹${fee.amount}`);
        console.log(`   Status: ${statusColor}${status}${resetColor}`);
        console.log(`   Academic Year: ${fee.academic_year}`);
        console.log(`   Frequency: ${fee.frequency}`);
        console.log(`   Created: ${fee.created_at.toISOString().split('T')[0]}`);
        console.log(`   Updated: ${fee.updated_at.toISOString().split('T')[0]}`);
        console.log('');
      });
    });

    // Show Class 7 specifically
    console.log('\n🎯 Class 7 Fee Structures (Detailed):');
    console.log('=====================================');
    const class7Fees = result.rows.filter(fee => 
      fee.class_name === 'Class 7' || fee.class_id === 7
    );

    if (class7Fees.length === 0) {
      console.log('❌ No Class 7 fee structures found');
    } else {
      class7Fees.forEach((fee, index) => {
        console.log(`${index + 1}. ID: ${fee.id} | ${fee.fee_type} | ₹${fee.amount} | ${fee.is_active ? 'Active' : 'Inactive'}`);
        console.log(`   Created: ${fee.created_at.toISOString()} | Updated: ${fee.updated_at.toISOString()}`);
      });
    }

    // Check for duplicates
    console.log('\n🔍 Duplicate Check:');
    console.log('==================');
    const duplicateCheck = await pool.query(`
      SELECT 
        fee_type,
        class_id,
        academic_year,
        COUNT(*) as count,
        STRING_AGG(id::text, ', ') as ids,
        STRING_AGG(CASE WHEN is_active THEN 'Active' ELSE 'Inactive' END, ', ') as statuses
      FROM fee_structures fs
      GROUP BY fee_type, class_id, academic_year
      HAVING COUNT(*) > 1
      ORDER BY fee_type, class_id
    `);

    if (duplicateCheck.rows.length > 0) {
      console.log('⚠️  DUPLICATE FEE STRUCTURES FOUND:');
      duplicateCheck.rows.forEach(dup => {
        const className = dup.class_id ? `Class ${dup.class_id}` : 'No Class';
        console.log(`${dup.fee_type} (${className}, ${dup.academic_year}):`);
        console.log(`   Count: ${dup.count}`);
        console.log(`   IDs: ${dup.ids}`);
        console.log(`   Statuses: ${dup.statuses}`);
        console.log('');
      });
    } else {
      console.log('✅ No duplicate fee structures found');
    }

  } catch (error) {
    console.error('❌ Error checking fee structures:', error.message);
  } finally {
    await pool.end();
  }
}

checkFeeStructures();
