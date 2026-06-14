import { Pool } from 'pg';

// Debug: Log environment variables (remove password from log)
console.log('Database configuration:', {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || '5432',
  database: process.env.DB_NAME || 'Shribi Edufy',
  user: process.env.DB_USER || 'postgres',
  passwordConfigured: !!process.env.DB_PASSWORD,
});

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'Shribi Edufy',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres', // Default fallback to 'postgres'
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text, duration, rows: res.rowCount });
  return res;
}

export default pool;

