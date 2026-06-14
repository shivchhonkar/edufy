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
    console.log('🔄 Starting academic years table migration...');
    
    // Read the SQL file
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', 'add_academic_years_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Run the migration
    await client.query(sql);
    
    console.log('✅ Academic years table created successfully!');
    
    // Verify the table was created
    const result = await client.query(`
      SELECT * FROM academic_years ORDER BY start_date DESC
    `);
    
    console.log(`\n📊 Academic Years in database: ${result.rows.length}`);
    result.rows.forEach(year => {
      console.log(`   - ${year.name} (${year.start_date.toISOString().split('T')[0]} to ${year.end_date.toISOString().split('T')[0]}) ${year.is_active ? '✓ Active' : ''}`);
    });
    
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

