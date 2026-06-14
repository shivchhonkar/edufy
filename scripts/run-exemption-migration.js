const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'edu_crm',
  password: 'shiv',
  port: 5432,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running fee exemption migration...\n');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'add-fee-exemption-column.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the migration
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('   - Added exemption_reason column to student_fees table');
    console.log('   - Added index for faster queries on exempted fees');
    console.log('   - Updated existing exempted records with default reason\n');
    
    // Verify the column was added
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'student_fees' 
      AND column_name = 'exemption_reason'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Verified: exemption_reason column exists');
      console.log(`   Type: ${result.rows[0].data_type}`);
    } else {
      console.log('❌ Warning: Column not found after migration');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);








