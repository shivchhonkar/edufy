const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:shiv@localhost:5432/edu_crm'
});

async function addGSTColumns() {
  try {
    console.log('Adding GST columns to inventory_items table...\n');
    
    // Add gst_percentage column
    await pool.query(`
      ALTER TABLE inventory_items 
      ADD COLUMN IF NOT EXISTS gst_percentage DECIMAL(5, 2) DEFAULT 18.00
    `);
    console.log('✅ Added gst_percentage column');
    
    // Add hsn_code column
    await pool.query(`
      ALTER TABLE inventory_items 
      ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20)
    `);
    console.log('✅ Added hsn_code column');
    
    // Verify columns were added
    const result = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'inventory_items' 
      AND column_name IN ('gst_percentage', 'hsn_code')
      ORDER BY column_name
    `);
    
    console.log('\n📋 Verified columns:');
    result.rows.forEach(col => {
      console.log(`  • ${col.column_name} (${col.data_type})`);
    });
    
    console.log('\n✅ Table is ready for bulk upload with GST support!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addGSTColumns();

























































