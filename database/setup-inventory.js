const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Read database URL from environment or use default
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:shiv@localhost:5432/edu_crm';

console.log('================================================');
console.log('Setting up Inventory Management Database Tables');
console.log('================================================');
console.log('');
console.log('Connecting to database...');

const pool = new Pool({
  connectionString: databaseUrl
});

async function setupTables() {
  const client = await pool.connect();
  
  try {
    // Read SQL file
    const sqlFile = path.join(__dirname, 'create_inventory_tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('Running SQL script: create_inventory_tables.sql');
    console.log('');
    
    // Execute SQL
    await client.query(sql);
    
    console.log('================================================');
    console.log('SUCCESS! Inventory tables created successfully');
    console.log('================================================');
    console.log('');
    console.log('Tables created:');
    console.log('  - inventory_categories');
    console.log('  - inventory_items');
    console.log('  - inventory_sales');
    console.log('  - inventory_transactions');
    console.log('');
    
    // Check categories
    const categoriesResult = await client.query('SELECT COUNT(*) as count FROM inventory_categories');
    console.log('Default categories added: ' + categoriesResult.rows[0].count);
    
    const categoriesList = await client.query('SELECT name FROM inventory_categories ORDER BY name');
    categoriesList.rows.forEach(cat => {
      console.log('  ✓ ' + cat.name);
    });
    
    console.log('');
    console.log('You can now:');
    console.log('  1. Start the inventory-admin app: cd apps/inventory-admin && npm run dev');
    console.log('  2. Upload the sample CSV with 50 items');
    console.log('  3. Start managing your inventory!');
    console.log('');
    
  } catch (error) {
    console.error('');
    console.error('================================================');
    console.error('ERROR: Failed to create inventory tables');
    console.error('================================================');
    console.error('');
    console.error('Error details:', error.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('  1. Make sure PostgreSQL is running');
    console.error('  2. Check database credentials');
    console.error('  3. Ensure you have permission to create tables');
    console.error('');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setupTables().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

























































