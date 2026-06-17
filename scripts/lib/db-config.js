/**
 * Shared PostgreSQL config for setup scripts.
 * Mirrors apps/super-admin/src/lib/platform-db-config.ts
 */

function parsePgUrl(connectionString) {
  try {
    const url = new URL(connectionString)
    return {
      host: url.hostname || undefined,
      port: url.port ? parseInt(url.port, 10) : 5432,
      database: url.pathname?.replace(/^\//, '') || undefined,
      user: url.username ? decodeURIComponent(url.username) : undefined,
      password: url.password ? decodeURIComponent(url.password) : '',
    }
  } catch {
    return {}
  }
}

function readEnvPassword(...keys) {
  for (const key of keys) {
    const value = process.env[key]
    if (value != null && value !== '') return String(value)
  }
  return undefined
}

function resolveBaseConfig() {
  const fromControlUrl = process.env.CONTROL_DATABASE_URL
    ? parsePgUrl(process.env.CONTROL_DATABASE_URL)
    : {}
  const fromDatabaseUrl = process.env.DATABASE_URL
    ? parsePgUrl(process.env.DATABASE_URL)
    : {}

  const password =
    readEnvPassword('CONTROL_DB_PASSWORD', 'TENANT_DB_PASSWORD', 'DB_PASSWORD') ??
    fromControlUrl.password ??
    fromDatabaseUrl.password ??
    ''

  return {
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
    user:
      process.env.CONTROL_DB_USER ||
      process.env.TENANT_DB_USER ||
      process.env.DB_USER ||
      fromControlUrl.user ||
      fromDatabaseUrl.user ||
      'postgres',
    password: String(password),
  }
}

function getControlDbConfig(database) {
  const base = resolveBaseConfig()
  return {
    ...base,
    database: database ?? (process.env.CONTROL_DB_NAME || 'Shribi Edufy_control'),
  }
}

function getTenantDbConfig(dbName) {
  const base = resolveBaseConfig()
  return {
    ...base,
    database: dbName || process.env.DB_NAME || 'edu_crm',
  }
}

function validateConfig(config, label) {
  if (typeof config.password !== 'string') {
    throw new Error(`${label}: database password must be a string`)
  }
  if (!config.user) {
    throw new Error(`${label}: database user is not configured`)
  }
  if (!config.password) {
    throw new Error(
      `${label}: database password is empty. Set CONTROL_DB_PASSWORD, DB_PASSWORD, or DATABASE_URL.`,
    )
  }
}

module.exports = {
  parsePgUrl,
  getControlDbConfig,
  getTenantDbConfig,
  validateConfig,
}
