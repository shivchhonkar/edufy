/**
 * Create a new school (tenant) database and optionally register in control DB.
 * Usage:
 *   node scripts/create-school-db.js --slug schoola --name "School A"
 *   node scripts/create-school-db.js --slug schoolb --name "School B" --db-name edulakhya_school_b
 *
 * Requires: PostgreSQL client (psql) and env CONTROL_DB_* for control DB, or .env.
 * The new DB is created with the same schema as apps (database/schema.sql).
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const slug = args.find((a) => a.startsWith('--slug='))?.split('=')[1] || args[args.indexOf('--slug') + 1];
const name = args.find((a) => a.startsWith('--name='))?.split('=')[1] || args[args.indexOf('--name') + 1];
const dbName = args.find((a) => a.startsWith('--db-name='))?.split('=')[1] || args[args.indexOf('--db-name') + 1];

if (!slug || !name) {
  console.error('Usage: node scripts/create-school-db.js --slug <slug> --name "School Name" [--db-name <dbname>]');
  process.exit(1);
}

const finalDbName = dbName || `edulakhya_${slug.replace(/-/g, '_')}`;
const root = path.resolve(__dirname, '..');
const schemaPath = path.join(root, 'database', 'schema.sql');
const controlSchemaPath = path.join(root, 'database', 'control_schema.sql');

if (!fs.existsSync(schemaPath)) {
  console.error('Schema not found:', schemaPath);
  process.exit(1);
}

require('dotenv').config({ path: path.join(root, '.env') });

const pgHost = process.env.TENANT_DB_HOST || process.env.DB_HOST || 'localhost';
const pgPort = process.env.TENANT_DB_PORT || process.env.DB_PORT || '5432';
const pgUser = process.env.TENANT_DB_USER || process.env.DB_USER || process.env.PGUSER || 'postgres';
const pgPassword = process.env.TENANT_DB_PASSWORD || process.env.DB_PASSWORD || process.env.PGPASSWORD;
const env = { ...process.env };
if (pgPassword) env.PGPASSWORD = pgPassword;

console.log('Creating database:', finalDbName);
try {
  execSync(`createdb -h ${pgHost} -p ${pgPort} -U ${pgUser} "${finalDbName}"`, { stdio: 'inherit', env });
} catch (e) {
  if (e.status === 1 && (e.stderr || e.stdout || '').toString().includes('already exists')) {
    console.log('Database already exists, applying schema...');
  } else {
    throw e;
  }
}

console.log('Applying schema:', schemaPath);
execSync(`psql -h ${pgHost} -p ${pgPort} -U ${pgUser} -d "${finalDbName}" -f "${schemaPath}"`, {
  stdio: 'inherit',
  env,
});

console.log('Done. School DB:', finalDbName);
console.log('');
console.log('Next: Register tenant in control DB and add branding.');
console.log('  INSERT INTO tenants (slug, name, db_name) VALUES (\'' + slug + '\', \'' + name.replace(/'/g, "''") + '\', \'' + finalDbName + '\');');
console.log('  INSERT INTO tenant_branding (tenant_id, subdomain) SELECT id, \'' + slug + '\' FROM tenants WHERE slug = \'' + slug + '\';');
process.exit(0);
