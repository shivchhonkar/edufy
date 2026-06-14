const { query } = require('./src/lib/db');

async function fixClass7Duplicate() {
  try {
    console.log('🔧 Fixing Class 7 Duplicate Fee Structures...\n');

    // Find all fee structures for Class 7
    const result = await query(`
      SELECT 
        fs.id,
        fs.fee_type,
        fs.amount,
        fs.is_active,
        fs.academic_year,
        fs.frequency,
        fs.created_at,
        c.name as class_name
      FROM fee_structures fs
      LEFT JOIN classes c ON fs.class_id = c.id
      WHERE (c.name = 'Class 7' OR fs.class_id = 7)
      AND fs.academic_year = '2025-26'
      AND fs.fee_type ILIKE '%tuition%'
      ORDER BY fs.created_at DESC
    `);

    console.log('📊 Found Tuition Fee Structures for Class 7:');
    console.log('============================================');
    
    if (result.rows.length === 0) {
      console.log('❌ No tuition fee structures found for Class 7');
      return;
    }

    result.rows.forEach((fee, index) => {
      console.log(`${index + 1}. ID: ${fee.id} | Amount: ₹${fee.amount} | Status: ${fee.is_active ? '✅ Active' : '❌ Inactive'} | Created: ${fee.created_at}`);
    });

    if (result.rows.length === 1) {
      console.log('\n✅ Only one tuition fee structure found - activating it...');
      const fee = result.rows[0];
      
      if (!fee.is_active) {
        await query('UPDATE fee_structures SET is_active = true WHERE id = $1', [fee.id]);
        console.log(`✅ Activated fee structure ID ${fee.id} (₹${fee.amount})`);
      } else {
        console.log(`✅ Fee structure ID ${fee.id} is already active`);
      }
    } else {
      // Multiple structures - keep the most recent one active, deactivate others
      console.log('\n⚠️  Multiple tuition fee structures found - cleaning up duplicates...');
      
      const mostRecent = result.rows[0]; // Most recent (created_at DESC)
      const others = result.rows.slice(1);
      
      // Activate the most recent one
      if (!mostRecent.is_active) {
        await query('UPDATE fee_structures SET is_active = true WHERE id = $1', [mostRecent.id]);
        console.log(`✅ Activated most recent fee structure ID ${mostRecent.id} (₹${mostRecent.amount})`);
      } else {
        console.log(`✅ Most recent fee structure ID ${mostRecent.id} is already active`);
      }
      
      // Deactivate older duplicates
      for (const other of others) {
        if (other.is_active) {
          await query('UPDATE fee_structures SET is_active = false WHERE id = $1', [other.id]);
          console.log(`❌ Deactivated older fee structure ID ${other.id} (₹${other.amount})`);
        } else {
          console.log(`ℹ️  Fee structure ID ${other.id} is already inactive`);
        }
      }
      
      console.log(`\n🧹 Cleanup Summary:`);
      console.log(`   - Active: ID ${mostRecent.id} (₹${mostRecent.amount}) - Created: ${mostRecent.created_at}`);
      for (const other of others) {
        console.log(`   - Inactive: ID ${other.id} (₹${other.amount}) - Created: ${other.created_at}`);
      }
    }

    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    const verifyResult = await query(`
      SELECT 
        fs.id,
        fs.fee_type,
        fs.amount,
        fs.is_active,
        fs.created_at
      FROM fee_structures fs
      LEFT JOIN classes c ON fs.class_id = c.id
      WHERE (c.name = 'Class 7' OR fs.class_id = 7)
      AND fs.academic_year = '2025-26'
      AND fs.fee_type ILIKE '%tuition%'
      ORDER BY fs.is_active DESC, fs.created_at DESC
    `);

    console.log('\n📋 Final Status:');
    verifyResult.rows.forEach((fee, index) => {
      console.log(`${index + 1}. ID: ${fee.id} | Amount: ₹${fee.amount} | Status: ${fee.is_active ? '✅ Active' : '❌ Inactive'}`);
    });

    console.log('\n🎉 Class 7 tuition fee structure fix completed!');
    console.log('   Refresh your browser to see the changes.');

  } catch (error) {
    console.error('❌ Error fixing Class 7 duplicate:', error);
  } finally {
    process.exit(0);
  }
}

fixClass7Duplicate();
