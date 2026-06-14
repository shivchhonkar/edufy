const { Pool } = require('pg');

// Try to load dotenv if available, but don't fail if it's not
try {
  require('dotenv').config();
} catch (e) {
  console.log('Note: dotenv not available, using environment variables directly');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migratePaymentReceipts() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting payment receipts migration...');
    
    // Create the payment_receipts table
    console.log('📋 Creating payment_receipts table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_receipts (
        id SERIAL PRIMARY KEY,
        payment_id INTEGER NOT NULL REFERENCES fee_payments(id) ON DELETE CASCADE,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        receipt_number VARCHAR(50) NOT NULL UNIQUE,
        payment_date DATE NOT NULL,
        academic_year VARCHAR(10) NOT NULL,
        
        -- Payment breakdown details
        selected_months JSONB NOT NULL,
        tuition_fees_per_month DECIMAL(10,2) DEFAULT 0,
        transport_fees_per_month DECIMAL(10,2) DEFAULT 0,
        other_fees_per_month DECIMAL(10,2) DEFAULT 0,
        
        -- Payment totals
        total_tuition_paid DECIMAL(10,2) DEFAULT 0,
        total_transport_paid DECIMAL(10,2) DEFAULT 0,
        total_other_paid DECIMAL(10,2) DEFAULT 0,
        total_amount_paid DECIMAL(10,2) NOT NULL,
        
        -- Payment method and details
        payment_method VARCHAR(50) NOT NULL,
        transaction_id VARCHAR(100),
        late_fee_charged DECIMAL(10,2) DEFAULT 0,
        discount_applied DECIMAL(10,2) DEFAULT 0,
        
        -- Receipt metadata
        receipt_type VARCHAR(20) DEFAULT 'original',
        is_bulk_payment BOOLEAN DEFAULT FALSE,
        months_count INTEGER DEFAULT 1,
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    console.log('🔍 Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_receipts_student_id ON payment_receipts(student_id);
      CREATE INDEX IF NOT EXISTS idx_payment_receipts_payment_id ON payment_receipts(payment_id);
      CREATE INDEX IF NOT EXISTS idx_payment_receipts_receipt_number ON payment_receipts(receipt_number);
      CREATE INDEX IF NOT EXISTS idx_payment_receipts_payment_date ON payment_receipts(payment_date);
      CREATE INDEX IF NOT EXISTS idx_payment_receipts_academic_year ON payment_receipts(academic_year);
    `);

    // Create trigger function
    console.log('⚡ Creating trigger function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_payment_receipts_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create trigger
    console.log('🔧 Creating trigger...');
    await client.query(`
      DROP TRIGGER IF EXISTS update_payment_receipts_updated_at ON payment_receipts;
      CREATE TRIGGER update_payment_receipts_updated_at
          BEFORE UPDATE ON payment_receipts
          FOR EACH ROW
          EXECUTE FUNCTION update_payment_receipts_updated_at();
    `);

    // Add comments
    console.log('📝 Adding table comments...');
    await client.query(`
      COMMENT ON TABLE payment_receipts IS 'Stores detailed payment receipt information for easy regeneration';
      COMMENT ON COLUMN payment_receipts.selected_months IS 'JSON array of months paid for (e.g., ["April", "May", "June"])';
      COMMENT ON COLUMN payment_receipts.tuition_fees_per_month IS 'Tuition fee amount per month';
      COMMENT ON COLUMN payment_receipts.transport_fees_per_month IS 'Transport fee amount per month';
      COMMENT ON COLUMN payment_receipts.other_fees_per_month IS 'Other fees amount per month';
      COMMENT ON COLUMN payment_receipts.receipt_type IS 'Type of receipt: original, complete, tuition-only';
      COMMENT ON COLUMN payment_receipts.is_bulk_payment IS 'Whether this is a bulk payment covering multiple months';
    `);

    // Migrate existing payment data
    console.log('🔄 Migrating existing payment data...');
    const existingPayments = await client.query(`
      SELECT fp.*, s.id as student_id
      FROM fee_payments fp
      JOIN students s ON fp.student_id = s.id
      WHERE fp.status = 'completed'
      ORDER BY fp.payment_date ASC
    `);

    let migratedCount = 0;
    for (const payment of existingPayments.rows) {
      try {
        // Parse existing remarks to get breakdown if available
        let selectedMonths = [];
        let tuitionPerMonth = 0;
        let transportPerMonth = 0;
        let otherPerMonth = 0;
        let totalTuitionPaid = 0;
        let totalTransportPaid = 0;
        let totalOtherPaid = 0;

        try {
          const remarksData = JSON.parse(payment.remarks || '{}');
          if (remarksData.breakdown && Array.isArray(remarksData.breakdown)) {
            // Extract months from breakdown
            selectedMonths = remarksData.breakdown.map(item => {
              if (item.month) {
                const monthNumber = parseInt(item.month);
                return new Date(2024, monthNumber - 1).toLocaleString('default', { month: 'long' });
              }
              return 'Unknown';
            });

            // Calculate totals by fee type
            remarksData.breakdown.forEach(item => {
              const amount = parseFloat(item.amount || 0);
              if (item.fee_type && item.fee_type.toLowerCase().includes('tuition')) {
                totalTuitionPaid += amount;
                tuitionPerMonth = amount;
              } else if (item.fee_type && item.fee_type.toLowerCase().includes('transport')) {
                totalTransportPaid += amount;
                transportPerMonth = amount;
              } else {
                totalOtherPaid += amount;
                otherPerMonth = amount;
              }
            });
          } else {
            // Single payment fallback
            const monthNumber = payment.month || new Date(payment.payment_date).getMonth() + 1;
            selectedMonths = [new Date(2024, monthNumber - 1).toLocaleString('default', { month: 'long' })];
            
            const amount = parseFloat(payment.amount_paid) - parseFloat(payment.late_fee_charged || 0);
            totalTuitionPaid = amount; // Assume tuition for single payments
            tuitionPerMonth = amount;
          }
        } catch (error) {
          // Fallback for payments without proper breakdown
          const monthNumber = payment.month || new Date(payment.payment_date).getMonth() + 1;
          selectedMonths = [new Date(2024, monthNumber - 1).toLocaleString('default', { month: 'long' })];
          
          const amount = parseFloat(payment.amount_paid) - parseFloat(payment.late_fee_charged || 0);
          totalTuitionPaid = amount;
          tuitionPerMonth = amount;
        }

        // Insert payment receipt record
        await client.query(`
          INSERT INTO payment_receipts (
            payment_id, student_id, receipt_number, payment_date, academic_year,
            selected_months, tuition_fees_per_month, transport_fees_per_month, other_fees_per_month,
            total_tuition_paid, total_transport_paid, total_other_paid, total_amount_paid,
            payment_method, transaction_id, late_fee_charged, discount_applied,
            receipt_type, is_bulk_payment, months_count
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          ON CONFLICT (receipt_number) DO NOTHING
        `, [
          payment.id,
          payment.student_id,
          payment.receipt_number,
          payment.payment_date,
          payment.academic_year,
          JSON.stringify(selectedMonths),
          tuitionPerMonth,
          transportPerMonth,
          otherPerMonth,
          totalTuitionPaid,
          totalTransportPaid,
          totalOtherPaid,
          payment.amount_paid,
          payment.payment_method,
          payment.transaction_id,
          payment.late_fee_charged || 0,
          payment.discount_applied || 0,
          'original',
          selectedMonths.length > 1,
          selectedMonths.length
        ]);

        migratedCount++;
      } catch (error) {
        console.error(`❌ Error migrating payment ${payment.id}:`, error.message);
      }
    }

    console.log(`✅ Migration completed successfully!`);
    console.log(`📊 Migrated ${migratedCount} payment records`);
    console.log(`📋 Created payment_receipts table with proper indexes and triggers`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  migratePaymentReceipts()
    .then(() => {
      console.log('🎉 Payment receipts migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migratePaymentReceipts };
