/**
 * Script to remove duplicate fee structures
 * Run with: node scripts/remove-duplicate-fees.js
 * 
 * This will keep the NEWEST entry for each fee_type + class_id + academic_year combination
 * and remove older duplicates
 */

const { Pool } = require('pg');
const readline = require('readline');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'edulakhya',
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function findDuplicates() {
  const result = await pool.query(`
    WITH duplicates AS (
      SELECT 
        fs.id,
        fs.fee_type,
        fs.class_id,
        fs.academic_year,
        fs.amount,
        fs.description,
        fs.is_active,
        fs.created_at,
        c.name as class_name,
        ROW_NUMBER() OVER (
          PARTITION BY fs.fee_type, COALESCE(fs.class_id, 0), fs.academic_year 
          ORDER BY fs.created_at DESC
        ) as row_num
      FROM fee_structures fs
      LEFT JOIN classes c ON fs.class_id = c.id
    )
    SELECT * FROM duplicates
    WHERE row_num > 1
    ORDER BY fee_type, class_name, created_at DESC
  `);

  return result.rows;
}

async function removeDuplicateFees() {
  try {
    console.log('🔍 Searching for duplicate fee structures...\n');

    const duplicates = await findDuplicates();

    if (duplicates.length === 0) {
      console.log('✅ No duplicate fee structures found!\n');
      return;
    }

    console.log(`⚠️  Found ${duplicates.length} duplicate fee structure(s):\n`);
    console.log('─'.repeat(80));

    // Group duplicates by fee type
    const grouped = {};
    duplicates.forEach(fee => {
      const key = `${fee.fee_type} - ${fee.class_name || 'All Classes'} - ${fee.academic_year}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(fee);
    });

    Object.keys(grouped).forEach(key => {
      console.log(`\n📌 ${key}:`);
      grouped[key].forEach(fee => {
        console.log(`   🗑️  Will DELETE: ID ${fee.id} (₹${fee.amount}, ${fee.is_active ? 'Active' : 'Inactive'}, Created: ${new Date(fee.created_at).toLocaleString()})`);
      });
    });

    console.log('\n' + '─'.repeat(80));
    console.log('\n💡 Note: The NEWEST entry for each fee type will be KEPT.');
    console.log('   Only OLDER duplicates will be deleted.\n');

    const answer = await question('❓ Do you want to proceed with deletion? (yes/no): ');

    if (answer.toLowerCase() !== 'yes') {
      console.log('\n❌ Operation cancelled. No changes made.\n');
      return;
    }

    console.log('\n🗑️  Deleting duplicates...');

    // Delete duplicates
    const ids = duplicates.map(d => d.id);
    const deleteResult = await pool.query(
      'DELETE FROM fee_structures WHERE id = ANY($1) RETURNING id, fee_type',
      [ids]
    );

    console.log(`\n✅ Successfully deleted ${deleteResult.rowCount} duplicate fee structure(s)!\n`);

    // Show what was deleted
    deleteResult.rows.forEach(row => {
      console.log(`   ✓ Deleted: ${row.fee_type} (ID: ${row.id})`);
    });

    console.log('\n📋 Tip: Run "node scripts/check-duplicate-fees.js" to verify.');

  } catch (error) {
    console.error('\n❌ Error removing duplicate fees:', error);
  } finally {
    await pool.end();
    rl.close();
  }
}

removeDuplicateFees();





