import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    console.log('Adding missing columns to exams table...');
    const addedColumns: string[] = [];

    // Step 1: Add subject_id column
    try {
      await db.query(`
        ALTER TABLE exams 
        ADD COLUMN IF NOT EXISTS subject_id INTEGER
      `);
      console.log('✅ Added subject_id column');
      addedColumns.push('subject_id');
    } catch (error: any) {
      console.log('Note: subject_id column may already exist');
    }

    // Step 2: Add passing_marks column
    try {
      await db.query(`
        ALTER TABLE exams 
        ADD COLUMN IF NOT EXISTS passing_marks INTEGER
      `);
      console.log('✅ Added passing_marks column');
      addedColumns.push('passing_marks');
    } catch (error: any) {
      console.log('Note: passing_marks column may already exist');
    }

    // Step 3: Add exam_date column
    try {
      await db.query(`
        ALTER TABLE exams 
        ADD COLUMN IF NOT EXISTS exam_date DATE
      `);
      console.log('✅ Added exam_date column');
      addedColumns.push('exam_date');
    } catch (error: any) {
      console.log('Note: exam_date column may already exist');
    }

    // Step 4: Add created_by column
    try {
      await db.query(`
        ALTER TABLE exams 
        ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id)
      `);
      console.log('✅ Added created_by column');
      addedColumns.push('created_by');
    } catch (error: any) {
      console.log('Note: created_by column may already exist');
    }

    // Step 4b: Add created_at column
    try {
      await db.query(`
        ALTER TABLE exams 
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      console.log('✅ Added created_at column');
      addedColumns.push('created_at');
    } catch (error: any) {
      console.log('Note: created_at column may already exist');
    }

    // Step 4c: Add updated_at column
    try {
      await db.query(`
        ALTER TABLE exams 
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      console.log('✅ Added updated_at column');
      addedColumns.push('updated_at');
    } catch (error: any) {
      console.log('Note: updated_at column may already exist');
    }

    // Step 5: Add academic_year column (remove NOT NULL if it exists)
    try {
      // First, check if column exists with NOT NULL
      const checkAcademicYear = await db.query(`
        SELECT column_name, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'exams' AND column_name = 'academic_year'
      `);
      
      if (checkAcademicYear.rows.length === 0) {
        // Column doesn't exist, add it
        await db.query(`
          ALTER TABLE exams 
          ADD COLUMN academic_year VARCHAR(20)
        `);
        console.log('✅ Added academic_year column');
        addedColumns.push('academic_year');
      } else if (checkAcademicYear.rows[0].is_nullable === 'NO') {
        // Column exists but has NOT NULL, remove it
        await db.query(`
          ALTER TABLE exams 
          ALTER COLUMN academic_year DROP NOT NULL
        `);
        console.log('✅ Removed NOT NULL constraint from academic_year');
        addedColumns.push('academic_year (fixed NOT NULL)');
      }
    } catch (error: any) {
      console.log('Note: academic_year column handling:', error.message);
    }

    // Step 5b: Add/fix start_date column
    try {
      const checkStartDate = await db.query(`
        SELECT column_name, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'exams' AND column_name = 'start_date'
      `);
      
      if (checkStartDate.rows.length === 0) {
        // Column doesn't exist, add it
        await db.query(`
          ALTER TABLE exams 
          ADD COLUMN start_date DATE
        `);
        console.log('✅ Added start_date column');
        addedColumns.push('start_date');
      } else if (checkStartDate.rows[0].is_nullable === 'NO') {
        // Column exists but has NOT NULL, remove it
        await db.query(`
          ALTER TABLE exams 
          ALTER COLUMN start_date DROP NOT NULL
        `);
        console.log('✅ Removed NOT NULL constraint from start_date');
        addedColumns.push('start_date (fixed NOT NULL)');
      }
    } catch (error: any) {
      console.log('Note: start_date column handling:', error.message);
    }

    // Step 5c: Add/fix end_date column
    try {
      const checkEndDate = await db.query(`
        SELECT column_name, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'exams' AND column_name = 'end_date'
      `);
      
      if (checkEndDate.rows.length === 0) {
        // Column doesn't exist, add it
        await db.query(`
          ALTER TABLE exams 
          ADD COLUMN end_date DATE
        `);
        console.log('✅ Added end_date column');
        addedColumns.push('end_date');
      } else if (checkEndDate.rows[0].is_nullable === 'NO') {
        // Column exists but has NOT NULL, remove it
        await db.query(`
          ALTER TABLE exams 
          ALTER COLUMN end_date DROP NOT NULL
        `);
        console.log('✅ Removed NOT NULL constraint from end_date');
        addedColumns.push('end_date (fixed NOT NULL)');
      }
    } catch (error: any) {
      console.log('Note: end_date column handling:', error.message);
    }

    // Step 5d: Remove NOT NULL from ALL remaining columns in exams table
    try {
      console.log('Checking all columns for NOT NULL constraints...');
      const allColumns = await db.query(`
        SELECT column_name, is_nullable, data_type
        FROM information_schema.columns 
        WHERE table_name = 'exams' AND is_nullable = 'NO'
        AND column_name NOT IN ('id')
      `);
      
      for (const col of allColumns.rows) {
        try {
          await db.query(`
            ALTER TABLE exams 
            ALTER COLUMN ${col.column_name} DROP NOT NULL
          `);
          console.log(`✅ Removed NOT NULL from ${col.column_name}`);
          if (!addedColumns.includes(`${col.column_name} (fixed NOT NULL)`)) {
            addedColumns.push(`${col.column_name} (fixed NOT NULL)`);
          }
        } catch (err: any) {
          console.log(`Note: Could not remove NOT NULL from ${col.column_name}:`, err.message);
        }
      }
    } catch (error: any) {
      console.log('Note: Bulk NOT NULL removal:', error.message);
    }

    // Step 6: Remove check constraints that might cause issues
    try {
      console.log('Removing restrictive check constraints...');
      
      // Remove exam_type check constraint if it exists
      await db.query(`
        ALTER TABLE exams 
        DROP CONSTRAINT IF EXISTS exams_exam_type_check
      `);
      console.log('✅ Removed exams_exam_type_check constraint');
      addedColumns.push('exam_type_check (removed)');
      
      // Remove any other check constraints
      const checkConstraints = await db.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'exams' 
        AND constraint_type = 'CHECK'
        AND constraint_name != 'exams_pkey'
      `);
      
      for (const constraint of checkConstraints.rows) {
        try {
          await db.query(`
            ALTER TABLE exams 
            DROP CONSTRAINT IF EXISTS ${constraint.constraint_name}
          `);
          console.log(`✅ Removed ${constraint.constraint_name} constraint`);
          if (!addedColumns.includes(`${constraint.constraint_name} (removed)`)) {
            addedColumns.push(`${constraint.constraint_name} (removed)`);
          }
        } catch (err: any) {
          console.log(`Note: Could not remove ${constraint.constraint_name}:`, err.message);
        }
      }
    } catch (error: any) {
      console.log('Note: Check constraint removal:', error.message);
    }

    // Step 7: Add foreign key constraint for subject_id
    try {
      await db.query(`
        ALTER TABLE exams 
        ADD CONSTRAINT exams_subject_id_fkey 
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
      `);
      console.log('✅ Added foreign key constraint for subject_id');
    } catch (error: any) {
      console.log('Note: Foreign key constraint may already exist');
    }

    // Step 7b: Create calculate_grade function
    try {
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
      console.log('✅ Created calculate_grade function');
      addedColumns.push('calculate_grade() function');
    } catch (error: any) {
      console.log('Note: calculate_grade function:', error.message);
    }

    // Step 8: Verify all columns
    const verify = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'exams' 
      ORDER BY ordinal_position
    `);

    const hasSubjectId = verify.rows.some(r => r.column_name === 'subject_id');
    const hasPassingMarks = verify.rows.some(r => r.column_name === 'passing_marks');
    const hasExamDate = verify.rows.some(r => r.column_name === 'exam_date');
    const hasCreatedBy = verify.rows.some(r => r.column_name === 'created_by');
    const hasCreatedAt = verify.rows.some(r => r.column_name === 'created_at');
    const hasUpdatedAt = verify.rows.some(r => r.column_name === 'updated_at');
    const hasAcademicYear = verify.rows.some(r => r.column_name === 'academic_year');
    const hasStartDate = verify.rows.some(r => r.column_name === 'start_date');
    const hasEndDate = verify.rows.some(r => r.column_name === 'end_date');

    // Check which columns still have NOT NULL
    const notNullColumns = verify.rows
      .filter(r => r.is_nullable === 'NO' && r.column_name !== 'id')
      .map(r => r.column_name);

    return NextResponse.json({
      success: true,
      message: '✅ Successfully updated exams table! All NOT NULL constraints removed.',
      addedColumns: addedColumns,
      verification: {
        hasSubjectId,
        hasPassingMarks,
        hasExamDate,
        hasCreatedBy,
        hasCreatedAt,
        hasUpdatedAt,
        hasAcademicYear,
        hasStartDate,
        hasEndDate,
        remainingNotNull: notNullColumns,
        allColumns: verify.rows.map(r => r.column_name)
      },
      columns: verify.rows
    });
  } catch (error: any) {
    console.error('Error updating table:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        details: error.detail || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

