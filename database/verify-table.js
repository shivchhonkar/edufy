const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:shiv@localhost:5432/edu_crm'
});

async function verifyTable() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'inventory_items' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n✅ Inventory Items Table Columns:\n');
    result.rows.forEach(col => {
      console.log(`  • ${col.column_name.padEnd(20)} (${col.data_type})`);
    });
    
    console.log('\n✅ Table is ready for bulk upload!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

verifyTable();

























































