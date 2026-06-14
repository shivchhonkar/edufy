const { Pool } = require('pg');

// Database connection - adjust this to match your setup
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'edulakhya',
  password: 'your_password',
  port: 5432,
});

async function testPaymentStats() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testing Payment Stats...\n');
    
    // Check if payments exist
    const paymentsResult = await client.query(`
      SELECT COUNT(*) as count, SUM(amount_paid) as total
      FROM fee_payments
      WHERE status = 'completed'
    `);
    
    console.log('📊 Fee Payments Table:');
    console.log('  Total Payments:', paymentsResult.rows[0].count);
    console.log('  Total Amount:', paymentsResult.rows[0].total);
    console.log('');
    
    // Check stats query
    const currentYear = new Date().getFullYear().toString();
    const statsResult = await client.query(`
      SELECT COALESCE(SUM(amount_paid), 0) as total_collected
      FROM fee_payments
      WHERE status = 'completed'
      AND academic_year = $1
    `, [currentYear]);
    
    console.log('📈 Stats Query Result:');
    console.log('  Academic Year:', currentYear);
    console.log('  Total Collected:', statsResult.rows[0].total_collected);
    console.log('');
    
    // Check if payment_receipts table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'payment_receipts'
      );
    `);
    
    console.log('🗄️  Database Tables:');
    console.log('  payment_receipts table exists:', tableCheck.rows[0].exists);
    console.log('');
    
    // Show recent payments
    const recentPayments = await client.query(`
      SELECT id, student_id, amount_paid, payment_date, receipt_number, academic_year, status
      FROM fee_payments
      ORDER BY payment_date DESC
      LIMIT 5
    `);
    
    console.log('📝 Recent Payments:');
    recentPayments.rows.forEach((payment, index) => {
      console.log(`  ${index + 1}. Receipt: ${payment.receipt_number}`);
      console.log(`     Amount: ₹${payment.amount_paid}`);
      console.log(`     Date: ${payment.payment_date}`);
      console.log(`     Year: ${payment.academic_year}`);
      console.log(`     Status: ${payment.status}`);
      console.log('');
    });
    
    // Test the actual stats API query
    console.log('🧪 Testing Stats API Queries...\n');
    
    const totalCollectedQuery = await client.query(`
      SELECT COALESCE(SUM(amount_paid), 0) as total_collected
      FROM fee_payments
      WHERE status = 'completed'
      AND academic_year = $1
    `, [currentYear]);
    
    console.log('  Total Collected (API Query):', totalCollectedQuery.rows[0].total_collected);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the test
testPaymentStats()
  .then(() => {
    console.log('\n✅ Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });








