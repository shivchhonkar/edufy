const { query } = require('./src/lib/db');

async function debugClass7Fees() {
  try {
    console.log('🔍 Debugging Class 7 Fee Structures...\n');

    // Check all fee structures for Class 7
    const result = await query(`
      SELECT 
        fs.id,
        fs.fee_type,
        fs.amount,
        fs.is_active,
        fs.academic_year,
        fs.frequency,
        fs.created_at,
        fs.updated_at,
        c.name as class_name
      FROM fee_structures fs
      LEFT JOIN classes c ON fs.class_id = c.id
      WHERE c.name = 'Class 7' OR fs.class_id = 7
      ORDER BY fs.fee_type, fs.created_at DESC
    `);

    console.log('📊 Class 7 Fee Structures:');
    console.log('================================');
    
    if (result.rows.length === 0) {
      console.log('❌ No fee structures found for Class 7');
      return;
    }

    result.rows.forEach((fee, index) => {
      console.log(`${index + 1}. ${fee.fee_type}`);
      console.log(`   ID: ${fee.id}`);
      console.log(`   Amount: ₹${fee.amount}`);
      console.log(`   Status: ${fee.is_active ? '✅ Active' : '❌ Inactive'}`);
      console.log(`   Academic Year: ${fee.academic_year}`);
      console.log(`   Frequency: ${fee.frequency}`);
      console.log(`   Class: ${fee.class_name || 'Not found'}`);
      console.log(`   Created: ${fee.created_at}`);
      console.log(`   Updated: ${fee.updated_at}`);
      console.log('');
    });

    // Check for duplicates
    const duplicateCheck = await query(`
      SELECT 
        fee_type,
        COUNT(*) as count,
        STRING_AGG(id::text, ', ') as ids,
        STRING_AGG(CASE WHEN is_active THEN 'Active' ELSE 'Inactive' END, ', ') as statuses
      FROM fee_structures fs
      LEFT JOIN classes c ON fs.class_id = c.id
      WHERE (c.name = 'Class 7' OR fs.class_id = 7)
      AND fs.academic_year = '2025-26'
      GROUP BY fee_type
      HAVING COUNT(*) > 1
    `);

    if (duplicateCheck.rows.length > 0) {
      console.log('⚠️  DUPLICATE FEE STRUCTURES FOUND:');
      console.log('=====================================');
      duplicateCheck.rows.forEach(dup => {
        console.log(`${dup.fee_type}:`);
        console.log(`   Count: ${dup.count}`);
        console.log(`   IDs: ${dup.ids}`);
        console.log(`   Statuses: ${dup.statuses}`);
        console.log('');
      });
    } else {
      console.log('✅ No duplicate fee structures found');
    }

    // Check student fees using these structures
    const studentFeesCheck = await query(`
      SELECT 
        fs.fee_type,
        COUNT(sf.id) as student_fee_count,
        SUM(CASE WHEN sf.status = 'paid' THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN sf.status = 'pending' THEN 1 ELSE 0 END) as pending_count
      FROM fee_structures fs
      LEFT JOIN student_fees sf ON fs.id = sf.fee_structure_id
      LEFT JOIN classes c ON fs.class_id = c.id
      WHERE (c.name = 'Class 7' OR fs.class_id = 7)
      AND fs.academic_year = '2025-26'
      GROUP BY fs.id, fs.fee_type
    `);

    console.log('👥 Student Fee Usage:');
    console.log('=====================');
    studentFeesCheck.rows.forEach(usage => {
      console.log(`${usage.fee_type}:`);
      console.log(`   Total Records: ${usage.student_fee_count}`);
      console.log(`   Paid: ${usage.paid_count}`);
      console.log(`   Pending: ${usage.pending_count}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error debugging Class 7 fees:', error);
  } finally {
    process.exit(0);
  }
}

debugClass7Fees();
