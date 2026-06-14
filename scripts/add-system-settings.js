const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Read DATABASE_URL from .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
let DATABASE_URL = '';

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/DATABASE_URL=(.+)/);
  if (match) {
    DATABASE_URL = match[1].trim();
  }
} catch (error) {
  console.error('Error reading .env.local file:', error.message);
  process.exit(1);
}

if (!DATABASE_URL) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting system settings table migration...');
    
    // Read the SQL file
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', 'add_system_settings_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Run the migration
    await client.query(sql);
    
    console.log('✅ System settings table created successfully!');
    
    // Verify the table was created
    const result = await client.query(`
      SELECT * FROM system_settings
    `);
    
    console.log(`\n📊 System Settings in database: ${result.rows.length}`);
    if (result.rows.length > 0) {
      const settings = result.rows[0];
      console.log(`   School Name: ${settings.school_name || 'Not set'}`);
      console.log(`   Currency: ${settings.currency}`);
      console.log(`   Late Fee: ${settings.late_fee_percentage}% after ${settings.late_fee_days} days`);
      console.log(`   Auto-assign Fees: ${settings.auto_assign_fees ? 'Yes' : 'No'}`);
      console.log(`   Send Notifications: ${settings.send_notifications ? 'Yes' : 'No'}`);
    }
    
  } catch (error) {
    console.error('❌ Error running migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });




