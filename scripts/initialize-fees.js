/**
 * Initialize Fees System Script
 * 
 * This script sets up the fee system for the first time:
 * 1. Creates default fee categories
 * 2. Creates fee structures for each class
 * 3. Assigns fees to all existing students
 * 
 * Run this script once when setting up the system for the first time.
 * 
 * Usage: node scripts/initialize-fees.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/edulakhya'
});

async function initializeFeesSystem() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting fee system initialization...');
    
    await client.query('BEGIN');
    
    const currentYear = new Date().getFullYear().toString();
    const currentMonth = new Date().getMonth() + 1;
    
    // Step 1: Create default fee categories if they don't exist
    console.log('📋 Creating fee categories...');
    
    const categoriesResult = await client.query('SELECT COUNT(*) as count FROM fee_categories');
    const categoriesCount = parseInt(categoriesResult.rows[0].count);
    
    if (categoriesCount === 0) {
      await client.query(`
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
      `);
      console.log('✅ Created 9 default fee categories');
    } else {
      console.log(`ℹ️  Fee categories already exist (${categoriesCount} found)`);
    }
    
    // Step 2: Create fee structures for each class
    console.log('💰 Creating fee structures...');
    
    const feeStructuresResult = await client.query('SELECT COUNT(*) as count FROM fee_structures WHERE academic_year = $1', [currentYear]);
    const feeStructuresCount = parseInt(feeStructuresResult.rows[0].count);
    
    if (feeStructuresCount === 0) {
      const categories = await client.query('SELECT * FROM fee_categories WHERE is_active = true');
      const classes = await client.query('SELECT * FROM classes ORDER BY id');
      
      let structuresCreated = 0;
      
      for (const classItem of classes.rows) {
        for (const category of categories.rows) {
          // Skip transport fee for now
          if (category.name === 'Transport Fee') continue;
          
          let amount = 0;
          let frequency = 'monthly';
          
          // Set default amounts based on category and class level
          switch (category.name) {
            case 'Tuition Fee':
              // Class-based tuition fees
              const classNum = parseInt(classItem.name.match(/\d+/)?.[0] || '1');
              if (classNum <= 3) amount = 3000;
              else if (classNum <= 6) amount = 3500;
              else if (classNum <= 9) amount = 4000;
              else amount = 4500;
              break;
            case 'Library Fee':
              amount = 200;
              frequency = 'yearly';
              break;
            case 'Laboratory Fee':
              amount = 500;
              frequency = 'yearly';
              break;
            case 'Sports Fee':
              amount = 300;
              frequency = 'yearly';
              break;
            case 'Examination Fee':
              amount = 100;
              frequency = 'yearly';
              break;
            case 'Activity Fee':
              amount = 150;
              frequency = 'monthly';
              break;
            default:
              amount = 100;
              frequency = 'monthly';
          }
          
          await client.query(
            `INSERT INTO fee_structures (
              class_id, fee_type, amount, frequency, academic_year, 
              category_id, description, is_active, late_fee_percentage, late_fee_days
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              classItem.id,
              category.name,
              amount,
              frequency,
              currentYear,
              category.id,
              `Default ${category.name} for ${classItem.name}`,
              true,
              5, // 5% late fee
              7  // 7 days grace period
            ]
          );
          structuresCreated++;
        }
      }
      
      console.log(`✅ Created ${structuresCreated} fee structures for ${classes.rows.length} classes`);
    } else {
      console.log(`ℹ️  Fee structures already exist for ${currentYear} (${feeStructuresCount} found)`);
    }
    
    // Step 3: Assign fees to all active students
    console.log('👥 Assigning fees to students...');
    
    const studentsResult = await client.query(`
      SELECT s.id, s.class_id, s.first_name, s.last_name
      FROM students s
      WHERE s.status = 'active'
      ORDER BY s.first_name, s.last_name
    `);
    
    const students = studentsResult.rows;
    console.log(`Found ${students.length} active students`);
    
    // Assign fees for current month and next 2 months
    const months = [currentMonth, currentMonth + 1, currentMonth + 2].filter(m => m <= 12);
    let totalFeesAssigned = 0;
    
    for (const student of students) {
      // Get fee structures for this student's class (monthly fees only for initialization)
      const feeStructuresResult = await client.query(
        `SELECT * FROM fee_structures 
         WHERE (class_id = $1 OR class_id IS NULL)
         AND frequency = 'monthly'
         AND is_active = true
         AND academic_year = $2`,
        [student.class_id, currentYear]
      );
      
      for (const month of months) {
        for (const feeStructure of feeStructuresResult.rows) {
          // Calculate due date (10th of the month)
          const year = new Date().getFullYear();
          const dueDate = new Date(year, month - 1, 10);
          
          // Insert fee record (ignore if already exists)
          const result = await client.query(
            `INSERT INTO student_fees (
              student_id, fee_structure_id, academic_year, amount_due,
              due_date, month, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (student_id, fee_structure_id, academic_year, month) 
            DO NOTHING
            RETURNING id`,
            [
              student.id,
              feeStructure.id,
              currentYear,
              feeStructure.amount,
              dueDate.toISOString().split('T')[0],
              month,
              'pending'
            ]
          );
          
          if (result.rows.length > 0) {
            totalFeesAssigned++;
          }
        }
      }
    }
    
    await client.query('COMMIT');
    
    console.log('🎉 Fee system initialization completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Students processed: ${students.length}`);
    console.log(`   - Fee records created: ${totalFeesAssigned}`);
    console.log(`   - Months covered: ${months.join(', ')}`);
    console.log(`   - Academic year: ${currentYear}`);
    console.log('');
    console.log('✅ All students now have fee records with ₹0.00 paid initially');
    console.log('📈 Payment statistics will now show accurate pending amounts');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error initializing fee system:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the initialization
if (require.main === module) {
  initializeFeesSystem().catch(console.error);
}

module.exports = { initializeFeesSystem };







