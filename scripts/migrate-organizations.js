/**
 * Apply organization layer migration to control DB and backfill 1:1 orgs for existing schools.
 *
 * Usage:
 *   node scripts/migrate-organizations.js
 *   node scripts/migrate-organizations.js --dry-run
 */
require('dotenv').config({ path: require('path').join(__dirname, '../apps/super-admin/.env.local') });
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const dryRun = process.argv.includes('--dry-run');

const config = {
  host: process.env.CONTROL_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.CONTROL_DB_PORT || process.env.DB_PORT || '5432', 10),
  user: process.env.CONTROL_DB_USER || process.env.DB_USER || 'postgres',
  password: process.env.CONTROL_DB_PASSWORD || process.env.DB_PASSWORD || 'shiv',
  database: process.env.CONTROL_DB_NAME || 'Shribi Edufy_control',
};

const migrationPath = path.join(__dirname, '../database/migrations/control/001_organizations.sql');

async function main() {
  if (!fs.existsSync(migrationPath)) {
    console.error('Migration file not found:', migrationPath);
    process.exit(1);
  }

  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  const pool = new Pool(config);

  try {
    const tenantsCheck = await pool.query(
      "SELECT to_regclass('public.tenants') AS reg",
    );
    if (!tenantsCheck.rows[0]?.reg) {
      console.error(
        'Control DB has no tenants table. Run: npm run db:control:setup',
      );
      process.exit(1);
    }

    const orgTableCheck = await pool.query(
      "SELECT to_regclass('public.organizations') AS reg",
    );
    const hasOrgLayer = !!orgTableCheck.rows[0]?.reg;

    if (!hasOrgLayer) {
      if (dryRun) {
        console.log('[dry-run] Would apply organization migration SQL');
        console.log('[dry-run] Re-run without --dry-run to apply and backfill schools.');
        return;
      }
      console.log('Applying organization migration...');
      await pool.query(migrationSql);
      console.log('Organization schema applied.');
    } else {
      console.log('Organization schema already present.');
    }

    const { rows: unlinked } = await pool.query(`
      SELECT t.id, t.slug, t.name, t.db_name
      FROM tenants t
      WHERE t.organization_id IS NULL
      ORDER BY t.id
    `);

    if (unlinked.length === 0) {
      console.log('All schools already linked to an organization.');
      return;
    }

    console.log(`Found ${unlinked.length} school(s) without organization.`);

    for (const tenant of unlinked) {
      const orgSlug = tenant.slug;
      const orgName = tenant.name;

      if (dryRun) {
        console.log(`[dry-run] Would create org "${orgSlug}" for school id=${tenant.id}`);
        continue;
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        let orgId;
        const existingOrg = await client.query(
          'SELECT id FROM organizations WHERE slug = $1',
          [orgSlug],
        );

        if (existingOrg.rows.length > 0) {
          orgId = existingOrg.rows[0].id;
          console.log(`  Reusing organization id=${orgId} slug=${orgSlug}`);
        } else {
          const orgInsert = await client.query(
            `INSERT INTO organizations (slug, name, type, is_active)
             VALUES ($1, $2, 'single', true)
             RETURNING id`,
            [orgSlug, orgName],
          );
          orgId = orgInsert.rows[0].id;
          console.log(`  Created organization id=${orgId} slug=${orgSlug}`);
        }

        await client.query(
          `UPDATE tenants
           SET organization_id = $1, is_primary = true, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [orgId, tenant.id],
        );

        await client.query('COMMIT');
        console.log(`  Linked school id=${tenant.id} (${tenant.slug}) → org id=${orgId}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    const summary = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM organizations) AS organizations,
        (SELECT COUNT(*)::int FROM tenants WHERE organization_id IS NOT NULL) AS linked_schools,
        (SELECT COUNT(*)::int FROM tenants WHERE organization_id IS NULL) AS unlinked_schools
    `);

    console.log('\nSummary:', summary.rows[0]);
    console.log(dryRun ? 'Dry run complete.' : 'Organization migration complete.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
