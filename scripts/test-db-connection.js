require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

console.log('Environment variables:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'undefined');

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'edulakhya',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function testConnection() {
  try {
    console.log('\nTesting database connection...');
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful!');
    console.log('Current time:', result.rows[0].now);
    
    // Check if attendance tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%attendance%'
    `);
    
    console.log('\nExisting attendance tables:');
    if (tablesResult.rows.length === 0) {
      console.log('❌ No attendance tables found');
    } else {
      tablesResult.rows.forEach(row => console.log('✅', row.table_name));
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await pool.end();
  }
}

testConnection();








