import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    console.log('Setting up exam system tables...');

    // First, ensure subjects table has required columns
    try {
      await db.query(`
        ALTER TABLE subjects 
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      console.log('✓ Updated subjects table');
    } catch (error) {
      console.log('Note: subjects table update skipped (may already exist)');
    }

    // Create exams table
    await db.query(`
      CREATE TABLE IF NOT EXISTS exams (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        exam_type VARCHAR(50) NOT NULL,
        exam_date DATE NOT NULL,
        total_marks INTEGER NOT NULL,
        passing_marks INTEGER NOT NULL,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created exams table');

    // Add subject_id column if it doesn't exist (for existing tables)
    try {
      await db.query(`
        ALTER TABLE exams 
        ADD COLUMN IF NOT EXISTS subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE
      `);
      console.log('✓ Added subject_id column to exams table');
    } catch (error) {
      console.log('Note: subject_id column already exists');
    }

    // Create exam_results table
    await db.query(`
      CREATE TABLE IF NOT EXISTS exam_results (
        id SERIAL PRIMARY KEY,
        exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        marks_obtained DECIMAL(5,2) NOT NULL,
        grade VARCHAR(2),
        remarks TEXT,
        is_absent BOOLEAN DEFAULT FALSE,
        uploaded_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(exam_id, student_id)
      )
    `);
    console.log('✓ Created exam_results table');

    // Create indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_exams_class ON exams(class_id)
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_exams_subject ON exams(subject_id)
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_exams_date ON exams(exam_date)
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_exam_results_exam ON exam_results(exam_id)
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_exam_results_student ON exam_results(student_id)
    `);
    console.log('✓ Created indexes');

    // Create grade calculation function
    await db.query(`
      CREATE OR REPLACE FUNCTION calculate_grade(marks_obtained DECIMAL, total_marks INTEGER)
      RETURNS VARCHAR(2) AS $$
      DECLARE
        percentage DECIMAL;
      BEGIN
        IF total_marks = 0 THEN
          RETURN 'N/A';
        END IF;
        
        percentage := (marks_obtained / total_marks) * 100;
        
        IF percentage >= 90 THEN RETURN 'A+';
        ELSIF percentage >= 80 THEN RETURN 'A';
        ELSIF percentage >= 70 THEN RETURN 'B+';
        ELSIF percentage >= 60 THEN RETURN 'B';
        ELSIF percentage >= 50 THEN RETURN 'C';
        ELSIF percentage >= 40 THEN RETURN 'D';
        ELSE RETURN 'F';
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✓ Created calculate_grade function');

    // Verify tables
    const examsResult = await db.query("SELECT COUNT(*) FROM exams");
    const resultsResult = await db.query("SELECT COUNT(*) FROM exam_results");

    return NextResponse.json({
      success: true,
      message: 'Exam system setup completed successfully!',
      data: {
        exams_count: examsResult.rows[0].count,
        results_count: resultsResult.rows[0].count,
      },
    });
  } catch (error: any) {
    console.error('Error setting up exam system:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        details: 'Failed to setup exam system. Check if the database is accessible and tables exist.'
      },
      { status: 500 }
    );
  }
}

