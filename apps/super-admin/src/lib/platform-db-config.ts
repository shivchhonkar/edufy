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
  const fromDatabaseUrl = process.env.DATABASE_URL
    ? parsePgUrl(process.env.DATABASE_URL)
    : {};

  const password =
    readEnvPassword('CONTROL_DB_PASSWORD', 'TENANT_DB_PASSWORD', 'DB_PASSWORD') ??
    fromControlUrl.password ??
    fromDatabaseUrl.password ??
    '';

  const config: PgConnectionConfig = {
    host:
      process.env.CONTROL_DB_HOST ||
      process.env.TENANT_DB_HOST ||
      process.env.DB_HOST ||
      fromControlUrl.host ||
      fromDatabaseUrl.host ||
      'localhost',
    port: parseInt(
      process.env.CONTROL_DB_PORT ||
        process.env.TENANT_DB_PORT ||
        process.env.DB_PORT ||
        String(fromControlUrl.port ?? fromDatabaseUrl.port ?? 5432),
      10,
    ),
    database:
      process.env.CONTROL_DB_NAME ||
      fromControlUrl.database ||
      'Shribi Edufy_control',
    user:
      process.env.CONTROL_DB_USER ||
      process.env.TENANT_DB_USER ||
      process.env.DB_USER ||
      fromControlUrl.user ||
      fromDatabaseUrl.user ||
      'postgres',
    password: String(password),
  };

  return config;
}

export function getControlDbConfig(database?: string): PgConnectionConfig {
  const base = resolveBaseConfig();
  return {
    ...base,
    database: database ?? base.database,
  };
}

export function getTenantAdminDbConfig(): PgConnectionConfig {
  const base = resolveBaseConfig();
  return {
    ...base,
    database: 'postgres',
  };
}

export function getTenantDbConfig(dbName: string): PgConnectionConfig {
  const base = resolveBaseConfig();
  return {
    ...base,
    database: dbName,
  };
}

export function createPlatformPool(config: PgConnectionConfig): Pool {
  if (typeof config.password !== 'string') {
    throw new Error(
      'Database password is not configured. Set CONTROL_DB_PASSWORD, DB_PASSWORD, DATABASE_URL, or CONTROL_DATABASE_URL.',
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

export function isDbConfigError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('client password must be a string') ||
    message.includes('password authentication failed') ||
    message.includes('Database password is not configured')
  );
}

export function formatDbConfigError(error: unknown): string {
  if (isDbConfigError(error)) {
    return 'Server database is not configured correctly. Set CONTROL_DB_PASSWORD, DB_PASSWORD, or DATABASE_URL on the server, then try again.';
  }
  return error instanceof Error ? error.message : 'Registration failed';
}
