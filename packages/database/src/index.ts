import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

/** Connection config for a tenant (school) database. Use with getPoolForTenant / queryForTenant. */
export interface TenantDbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

// Default pool: single-tenant / legacy (one DB from env)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'edulakhya',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Per-tenant pool cache (School A → DB_A, School B → DB_B)
const tenantPools = new Map<string, Pool>();
const TENANT_POOL_MAX = 10;

function poolKey(config: TenantDbConfig): string {
  return `${config.host}:${config.port}:${config.database}`;
}

/**
 * Get or create a connection pool for a tenant's database.
 * Use this for multi-tenant (separate DB per school).
 */
export function getPoolForTenant(config: TenantDbConfig): Pool {
  const key = poolKey(config);
  let tenantPool = tenantPools.get(key);
  if (!tenantPool) {
    if (tenantPools.size >= TENANT_POOL_MAX) {
      const firstKey = tenantPools.keys().next().value;
      if (firstKey) {
        const old = tenantPools.get(firstKey);
        if (old) old.end();
        tenantPools.delete(firstKey);
      }
    }
    tenantPool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    tenantPool.on('error', (err) => {
      console.error('Tenant pool error', config.database, err);
    });
    tenantPools.set(key, tenantPool);
  }
  return tenantPool;
}

/** Run a query against a tenant's database (separate DB per school). */
export async function queryForTenant<T extends QueryResultRow = QueryResultRow>(
  config: TenantDbConfig,
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const tenantPool = getPoolForTenant(config);
  const start = Date.now();
  try {
    const res = await tenantPool.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Tenant query', { db: config.database, duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Tenant database query error:', config.database, error);
    throw error;
  }
}

/** Get a client from a tenant's pool (for transactions). */
export async function getClientForTenant(config: TenantDbConfig): Promise<PoolClient> {
  return getPoolForTenant(config).connect();
}

/** Run a transaction in a tenant's database. */
export async function transactionForTenant<T>(
  config: TenantDbConfig,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClientForTenant(config);
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Query wrapper with error handling (default pool - single tenant / legacy)
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function checkConnection(): Promise<boolean> {
  try {
    await query('SELECT NOW()');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

export default pool;

