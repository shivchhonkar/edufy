import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';

export async function POST(request: NextRequest) {
  const { db } = await getRequestDb(request);
  try {
    console.log('Starting class_subjects table setup...');

    // Step 0: Ensure subjects table has timestamp columns
    try {
      await db.query(`
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'subjects' AND column_name = 'created_at'
            ) THEN
                ALTER TABLE subjects ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'subjects' AND column_name = 'updated_at'
            ) THEN
                ALTER TABLE subjects ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
            END IF;
        END $$;
      `);
      console.log('✅ subjects table columns verified');
    } catch (err) {
      console.log('Note: Could not add timestamp columns to subjects table (may already exist)');
    }

    // Step 1: Create class_subjects table
    await db.query(`
      CREATE TABLE IF NOT EXISTS class_subjects (
        id SERIAL PRIMARY KEY,
        class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(class_id, subject_id)
      )
    `);
    console.log('✅ class_subjects table created');

    // Step 2: Create indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_class_subjects_class ON class_subjects(class_id)
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_class_subjects_subject ON class_subjects(subject_id)
    `);
    console.log('✅ Indexes created');

    // Step 3: Insert default subjects
    const subjectsInserted = await db.query(`
      INSERT INTO subjects (name, code, description) VALUES
      ('Mathematics', 'MATH', 'Mathematics'),
      ('English', 'ENG', 'English Language'),
      ('Science', 'SCI', 'General Science'),
      ('Computer Science', 'CS', 'Computer Science'),
      ('Social Studies', 'SS', 'Social Studies'),
      ('Hindi', 'HINDI', 'Hindi Language'),
      ('Physical Education', 'PE', 'Physical Education'),
      ('Art', 'ART', 'Art and Craft')
      ON CONFLICT DO NOTHING
      RETURNING id
    `);
    console.log(`✅ ${subjectsInserted.rowCount} subjects created`);

    // Step 4: Assign all subjects to all classes
    const assignmentsResult = await db.query(`
      INSERT INTO class_subjects (class_id, subject_id)
      SELECT c.id, s.id
      FROM classes c
      CROSS JOIN subjects s
      WHERE NOT EXISTS (
        SELECT 1 FROM class_subjects cs 
        WHERE cs.class_id = c.id AND cs.subject_id = s.id
      )
      RETURNING id
    `);
    console.log(`✅ ${assignmentsResult.rowCount} class-subject assignments created`);

    // Step 5: Get summary
    const summary = await db.query(`
      SELECT 
        COUNT(DISTINCT class_id) as total_classes,
        COUNT(DISTINCT subject_id) as total_subjects,
        COUNT(*) as total_assignments
      FROM class_subjects
    `);

    const subjectsCount = await db.query('SELECT COUNT(*) FROM subjects');
    const classesCount = await db.query('SELECT COUNT(*) FROM classes');

    return NextResponse.json({
      success: true,
      message: 'Setup completed successfully!',
      data: {
        subjects_in_db: parseInt(subjectsCount.rows[0].count),
        classes_in_db: parseInt(classesCount.rows[0].count),
        subjects_inserted: subjectsInserted.rowCount,
        assignments_created: assignmentsResult.rowCount,
        summary: summary.rows[0]
      }
    });
  } catch (error: any) {
    console.error('Error setting up class_subjects:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.stack
    }, { status: 500 });
  }
}

// GET endpoint to check status
export async function GET(request: NextRequest) {
  const { db } = await getRequestDb(request);
  try {
    // Check if table exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'class_subjects'
      )
    `);

    const tableExists = tableCheck.rows[0].exists;

    if (!tableExists) {
      return NextResponse.json({
        success: false,
        message: 'class_subjects table does not exist',
        action: 'Please run POST request to /api/setup-subjects to create it'
      });
    }

    // Get current stats
    const stats = await db.query(`
      SELECT 
        COUNT(DISTINCT class_id) as total_classes,
        COUNT(DISTINCT subject_id) as total_subjects,
        COUNT(*) as total_assignments
      FROM class_subjects
    `);

    const subjects = await db.query('SELECT COUNT(*) FROM subjects');
    const classes = await db.query('SELECT COUNT(*) FROM classes');

    return NextResponse.json({
      success: true,
      message: 'class_subjects table exists',
      data: {
        table_exists: true,
        subjects_count: parseInt(subjects.rows[0].count),
        classes_count: parseInt(classes.rows[0].count),
        assignments: stats.rows[0]
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

