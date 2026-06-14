const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'edulakhya',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('Running database migrations...');
    
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await client.query(schema);
    
    console.log('✅ Migrations completed successfully!');
  } catch (error) {
    console.error('❌ Error running migrations:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(console.error);










