const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'edu_crm',
  user: 'postgres',
  password: 'shiv',
});

async function initializeFees() {
  console.log('🚀 Initializing Fee Management System...\n');

  try {
    // Step 1: Create fee categories if they don't exist
    console.log('Step 1: Setting up fee categories...');
    const categoryResult = await pool.query(`
      INSERT INTO fee_categories (name, description) VALUES
        ('Tuition Fee', 'Regular tuition fees for academic instruction'),
        ('Transport Fee', 'Bus or van transportation charges'),
        ('Library Fee', 'Library maintenance and book lending charges'),
        ('Laboratory Fee', 'Science lab and computer lab charges'),
        ('Sports Fee', 'Sports facilities and equipment charges'),
        ('Examination Fee', 'Exam paper and evaluation charges'),
        ('Activity Fee', 'Extra-curricular activities charges'),
        ('Late Fee', 'Penalty for late payment'),
        ('Other Charges', 'Miscellaneous charges')
      ON CONFLICT (name) DO NOTHING
      RETURNING id, name
    `);
    console.log(`✅ Created ${categoryResult.rows.length} fee categories\n`);

    // Step 2: Get current academic year
    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${currentYear + 1}`;

    // Step 3: Create sample fee structures
    console.log('Step 2: Creating sample fee structures...');
    
    // Get classes
    const classesResult = await pool.query('SELECT id, name FROM classes LIMIT 5');
    if (classesResult.rows.length === 0) {
      console.log('⚠️  No classes found. Please create classes first.');
      return;
    }

    // Get categories
    const categoriesResult = await pool.query('SELECT id, name FROM fee_categories');
    const tuitionCategory = categoriesResult.rows.find(c => c.name === 'Tuition Fee');
    const transportCategory = categoriesResult.rows.find(c => c.name === 'Transport Fee');
    const libraryCategory = categoriesResult.rows.find(c => c.name === 'Library Fee');

    const feeStructures = [];

    // Create tuition fee for each class
    for (const cls of classesResult.rows) {
      const amount = 2000 + (cls.id * 500); // Different amount per class
      await pool.query(`
        INSERT INTO fee_structures (
          class_id, category_id, fee_type, amount, frequency, 
          academic_year, description, late_fee_percentage, late_fee_days, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT DO NOTHING
      `, [
        cls.id, tuitionCategory?.id, `Tuition Fee - ${cls.name}`, 
        amount, 'monthly', academicYear, 
        `Monthly tuition fee for ${cls.name}`, 2, 7, true
      ]);
      feeStructures.push(`Tuition Fee - ${cls.name}: ₹${amount}/month`);
    }

    // Create transport fee (general)
    await pool.query(`
      INSERT INTO fee_structures (
        category_id, fee_type, amount, frequency, 
        academic_year, description, late_fee_percentage, late_fee_days, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT DO NOTHING
    `, [
      transportCategory?.id, 'Transport Fee', 
      1500, 'monthly', academicYear, 
      'Monthly bus transportation fee', 2, 7, true
    ]);
    feeStructures.push('Transport Fee: ₹1500/month');

    // Create library fee (yearly)
    await pool.query(`
      INSERT INTO fee_structures (
        category_id, fee_type, amount, frequency, 
        academic_year, description, late_fee_percentage, late_fee_days, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT DO NOTHING
    `, [
      libraryCategory?.id, 'Library Fee', 
      500, 'yearly', academicYear, 
      'Annual library maintenance and book lending fee', 2, 15, true
    ]);
    feeStructures.push('Library Fee: ₹500/year');

    console.log('✅ Created fee structures:');
    feeStructures.forEach(fs => console.log(`   - ${fs}`));
    console.log('');

    // Step 4: Generate monthly fees for all active students (current month)
    console.log('Step 3: Generating monthly fees for active students...');
    
    const currentMonth = new Date().getMonth() + 1;
    const dueDate = new Date(currentYear, currentMonth - 1, 10); // 10th of current month
    
    const studentsResult = await pool.query(`
      SELECT s.id, s.first_name, s.last_name, s.class_id, c.name as class_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.status = 'active'
      LIMIT 10
    `);

    if (studentsResult.rows.length === 0) {
      console.log('⚠️  No active students found. Please create students first.');
      return;
    }

    let studentFeesCreated = 0;

    for (const student of studentsResult.rows) {
      // Get fee structure for student's class
      const structureResult = await pool.query(`
        SELECT id, amount FROM fee_structures
        WHERE class_id = $1 AND frequency = 'monthly' AND is_active = true
        LIMIT 1
      `, [student.class_id]);

      if (structureResult.rows.length > 0) {
        const structure = structureResult.rows[0];
        
        // Create student fee record
        try {
          await pool.query(`
            INSERT INTO student_fees (
              student_id, fee_structure_id, academic_year, amount_due,
              due_date, month, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (student_id, fee_structure_id, academic_year, month) DO NOTHING
          `, [
            student.id, structure.id, academicYear, structure.amount,
            dueDate.toISOString().split('T')[0], currentMonth, 'pending'
          ]);
          studentFeesCreated++;
        } catch (err) {
          // Ignore duplicate errors
        }
      }
    }

    console.log(`✅ Generated ${studentFeesCreated} monthly fee records for students\n`);

    // Step 5: Show summary
    console.log('📊 Fee System Summary:');
    
    const statsResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT fs.id) as total_structures,
        COUNT(DISTINCT sf.id) as total_student_fees,
        COALESCE(SUM(sf.amount_due), 0) as total_due,
        COUNT(DISTINCT CASE WHEN sf.status = 'pending' THEN sf.id END) as pending_count
      FROM fee_structures fs
      LEFT JOIN student_fees sf ON fs.id = sf.fee_structure_id AND sf.academic_year = $1
    `, [academicYear]);

    const stats = statsResult.rows[0];
    console.log(`   - Fee Structures: ${stats.total_structures}`);
    console.log(`   - Student Fee Records: ${stats.total_student_fees}`);
    console.log(`   - Total Amount Due: ₹${parseFloat(stats.total_due).toFixed(2)}`);
    console.log(`   - Pending Fees: ${stats.pending_count}`);
    console.log('');

    console.log('✨ Fee Management System initialized successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Visit http://localhost:7000/fees to view the fee management dashboard');
    console.log('2. Create more fee structures as needed');
    console.log('3. Record payments for students');
    console.log('4. Monitor fee statistics and overdue payments');
    console.log('');

  } catch (error) {
    console.error('❌ Error initializing fees:', error);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// Run the initialization
initializeFees();

