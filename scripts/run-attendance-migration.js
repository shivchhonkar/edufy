const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Database configuration - use same config as the app
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'edulakhya',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

const pool = new Pool(dbConfig);

async function runAttendanceMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting Staff Attendance Migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', 'add_staff_attendance.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ Staff Attendance Migration completed successfully!');
    console.log('📊 Created tables:');
    console.log('   - staff_attendance');
    console.log('   - punch_machines');
    console.log('   - punch_machine_logs');
    console.log('   - leave_types');
    console.log('   - staff_leaves');
    console.log('   - attendance_policies');
    console.log('');
    console.log('🔧 Features added:');
    console.log('   - Manual attendance entry');
    console.log('   - Punch machine integration');
    console.log('   - Leave management');
    console.log('   - Attendance policies');
    console.log('   - Working hours calculation');
    console.log('   - Attendance reports');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runAttendanceMigration();
