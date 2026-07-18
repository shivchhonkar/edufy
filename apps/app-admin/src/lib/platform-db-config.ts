import { Pool, type PoolConfig } from 'pg';

type PgConnectionConfig = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
};

function parsePgUrl(connectionString: string): Partial<PgConnectionConfig> {
  try {
    const url = new URL(connectionString);
    return {
      host: url.hostname || undefined,
      port: url.port ? parseInt(url.port, 10) : 5432,
      database: url.pathname?.replace(/^\//, '') || undefined,
      user: url.username ? decodeURIComponent(url.username) : undefined,
      password: url.password ? decodeURIComponent(url.password) : '',
    };
  } catch {
    return {};
  }
}

function readEnvPassword(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value != null && value !== '') {
      return String(value);
    }
  }
  return undefined;
}

function resolveBaseConfig(): PgConnectionConfig {
  const fromControlUrl = process.env.CONTROL_DATABASE_URL
    ? parsePgUrl(process.env.CONTROL_DATABASE_URL)
    : {};

  const password =
    readEnvPassword('CONTROL_DB_PASSWORD', 'DB_PASSWORD') ??
    fromControlUrl.password ??
    '';

  return {
    host: process.env.CONTROL_DB_HOST || fromControlUrl.host || 'localhost',
    port: parseInt(process.env.CONTROL_DB_PORT || String(fromControlUrl.port ?? 5432), 10),
    database: process.env.CONTROL_DB_NAME || fromControlUrl.database || 'Shribi Edufy_control',
    user: process.env.CONTROL_DB_USER || fromControlUrl.user || 'postgres',
    password: String(password),
  };
}

export function getControlDbConfig(): PgConnectionConfig {
  return resolveBaseConfig();
}

export function createControlPool(): Pool {
  const config = getControlDbConfig();
  if (typeof config.password !== 'string') {
    throw new Error(
      'Database password is not configured. Set CONTROL_DB_PASSWORD or CONTROL_DATABASE_URL.',
    );
  }

  const poolConfig: PoolConfig = {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
  };

  return new Pool(poolConfig);
}
