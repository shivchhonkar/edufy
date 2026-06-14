const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'edulakhya',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database seeding...');
    
    await client.query('BEGIN');

    // Create admin user
    const hashedPassword = await bcrypt.hash('password123', 10);
    await client.query(
      `INSERT INTO users (email, password_hash, role, full_name, phone, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO NOTHING`,
      ['admin@school.com', hashedPassword, 'super_admin', 'Administrator', '9876543210', true]
    );
    console.log('✓ Admin user created');

    // Create classes
    const academicYear = '2024-2025';
    const classes = ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 
                     'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'];
    
    for (const className of classes) {
      await client.query(
        `INSERT INTO classes (name, academic_year, description)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [className, academicYear, `${className} for academic year ${academicYear}`]
      );
    }
    console.log('✓ Classes created');

    // Create subjects
    const subjects = [
      ['Mathematics', 'MATH'],
      ['Science', 'SCI'],
      ['English', 'ENG'],
      ['Social Studies', 'SST'],
      ['Hindi', 'HIN'],
      ['Computer Science', 'CS'],
      ['Physical Education', 'PE'],
    ];

    for (const [name, code] of subjects) {
      await client.query(
        `INSERT INTO subjects (name, code)
         VALUES ($1, $2)
         ON CONFLICT (code) DO NOTHING`,
        [name, code]
      );
    }
    console.log('✓ Subjects created');

    // Create inventory categories
    const categories = [
      ['Uniforms', 'School uniforms and dress items'],
      ['Books', 'Textbooks and reference materials'],
      ['Stationery', 'Pens, pencils, notebooks, etc.'],
      ['Sports Equipment', 'Sports and PE equipment'],
      ['Furniture', 'Desks, chairs, and classroom furniture'],
      ['Electronics', 'Computers, projectors, and other electronics'],
    ];

    for (const [name, description] of categories) {
      await client.query(
        `INSERT INTO inventory_categories (name, description)
         VALUES ($1, $2)`,
        [name, description]
      );
    }
    console.log('✓ Inventory categories created');

    await client.query('COMMIT');
    console.log('\n✅ Database seeding completed successfully!');
    console.log('\nDefault admin credentials:');
    console.log('Email: admin@school.com');
    console.log('Password: password123');
    console.log('\n⚠️  Please change these credentials in production!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase().catch(console.error);










