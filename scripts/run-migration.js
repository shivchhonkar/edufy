const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'edu_crm',
  user: 'postgres',
  password: 'shiv',
});

async function runMigration() {
  console.log('🚀 Running Fee Management System Migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migrations/add_enhanced_fees.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('🔧 Executing SQL statements...\n');

    // Execute the migration
    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');

    // Verify tables created
    console.log('🔍 Verifying tables...');
    
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('fee_categories', 'student_fees', 'fee_discounts')
    `);

    console.log('✅ Tables created:');
    tableCheck.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // Check for enhanced columns
    const columnCheck = await pool.query(`
      SELECT column_name, table_name
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND (
        (table_name = 'fee_structures' AND column_name IN ('category_id', 'late_fee_percentage', 'late_fee_days'))
        OR
        (table_name = 'fee_payments' AND column_name IN ('student_fee_id', 'discount_applied', 'late_fee_charged'))
      )
    `);

    console.log('\n✅ Enhanced columns added:');
    columnCheck.rows.forEach(row => {
      console.log(`   - ${row.table_name}.${row.column_name}`);
    });

    // Check function
    const functionCheck = await pool.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'calculate_late_fee'
    `);

    if (functionCheck.rows.length > 0) {
      console.log('\n✅ Function created: calculate_late_fee()');
    }

    // Check fee categories
    const categoriesCheck = await pool.query('SELECT COUNT(*) as count FROM fee_categories');
    console.log(`\n✅ Fee categories: ${categoriesCheck.rows[0].count} categories created`);

    console.log('\n🎉 Fee Management System is ready to use!');
    console.log('\nNext steps:');
    console.log('1. Run: node scripts/init-fees.js (to create sample data)');
    console.log('2. Start your app: npm run dev');
    console.log('3. Visit: http://localhost:3000/fees\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nError details:', error);
    
    if (error.message.includes('already exists')) {
      console.log('\n⚠️  Some objects already exist. This might be okay if you ran the migration before.');
      console.log('To verify, check if these tables exist: fee_categories, student_fees, fee_discounts');
    }
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration();

