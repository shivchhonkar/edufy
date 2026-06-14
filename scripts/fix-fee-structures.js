const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'edu_crm',
  user: 'postgres',
  password: 'shiv',
});

async function fixFeeStructures() {
  console.log('🔧 Fixing Fee Structures...\n');

  try {
    // Update all fee structures with null is_active to true
    const updateResult = await pool.query(`
      UPDATE fee_structures 
      SET is_active = true 
      WHERE is_active IS NULL
      RETURNING id, fee_type, is_active
    `);

    console.log(`✅ Updated ${updateResult.rows.length} fee structures:\n`);
    
    updateResult.rows.forEach(row => {
      console.log(`   - ID ${row.id}: ${row.fee_type} → is_active = ${row.is_active}`);
    });

    // Verify all fee structures now have is_active = true
    const verifyResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM fee_structures 
      WHERE is_active IS NULL
    `);

    console.log(`\n✅ Fee structures with null is_active: ${verifyResult.rows[0].count}`);

    // Show summary
    const summaryResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE is_active = false) as inactive,
        COUNT(*) FILTER (WHERE is_active IS NULL) as null_count,
        COUNT(*) as total
      FROM fee_structures
    `);

    const summary = summaryResult.rows[0];
    console.log(`\n📊 Summary:`);
    console.log(`   Total: ${summary.total}`);
    console.log(`   Active: ${summary.active}`);
    console.log(`   Inactive: ${summary.inactive}`);
    console.log(`   Null: ${summary.null_count}`);

    console.log('\n🎉 All fee structures are now active!');
    console.log('\n👉 Please refresh your browser page: http://localhost:3001/fees');
    console.log('   Go to Fee Structures tab and all structures should now appear.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

fixFeeStructures();









