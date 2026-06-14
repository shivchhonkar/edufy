import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
// GET - Fetch all homework assignments with filters
export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const searchParams = request.nextUrl.searchParams;
    const classId = searchParams.get('class_id');
    const subjectId = searchParams.get('subject_id');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let queryText = `
      SELECT 
        h.*,
        c.name as class_name,
        s.name as subject_name,
        u.full_name as assigned_by_name,
        (
          SELECT COUNT(*) 
          FROM homework_submissions hs 
          WHERE hs.homework_id = h.id
        ) as total_submissions,
        (
          SELECT COUNT(*) 
          FROM homework_submissions hs 
          WHERE hs.homework_id = h.id AND hs.status = 'submitted'
        ) as submitted_count,
        (
          SELECT COUNT(*) 
          FROM homework_submissions hs 
          WHERE hs.homework_id = h.id AND hs.status = 'graded'
        ) as graded_count
      FROM homework h
      LEFT JOIN classes c ON h.class_id = c.id
      LEFT JOIN subjects s ON h.subject_id = s.id
      LEFT JOIN users u ON h.assigned_by = u.id
      WHERE 1=1
    `;

    const queryParams: any[] = [];
    let paramCount = 0;

    if (classId) {
      paramCount++;
      queryText += ` AND h.class_id = $${paramCount}`;
      queryParams.push(classId);
    }

    if (subjectId) {
      paramCount++;
      queryText += ` AND h.subject_id = $${paramCount}`;
      queryParams.push(subjectId);
    }

    if (status) {
      paramCount++;
      queryText += ` AND h.status = $${paramCount}`;
      queryParams.push(status);
    }

    if (search) {
      paramCount++;
      queryText += ` AND (
        LOWER(h.title) LIKE LOWER($${paramCount}) OR
        LOWER(h.description) LIKE LOWER($${paramCount})
      )`;
      queryParams.push(`%${search}%`);
    }

    queryText += ` ORDER BY h.due_date DESC, h.created_at DESC`;

    const result = await db.query(queryText, queryParams);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching homework:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new homework assignment
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const {
      class_id,
      subject_id,
      title,
      description,
      due_date,
      total_marks,
      assigned_by,
      attachments,
      status = 'active',
    } = body;

    // Validate required fields
    if (!class_id || !subject_id || !title || !due_date || !assigned_by) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create homework (with minimal required fields + assigned_date)
    const result = await db.query(
      `INSERT INTO homework (
        class_id, subject_id, title, description, due_date, 
        total_marks, assigned_by, assigned_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        class_id,
        subject_id,
        title,
        description,
        due_date,
        total_marks || 100,
        assigned_by,
      ]
    );

    const homeworkId = result.rows[0].id;

    // Update status if column exists
    if (status) {
      try {
        await db.query(
          `UPDATE homework SET status = $1 WHERE id = $2`,
          [status, homeworkId]
        );
      } catch (err) {
        console.log('Status column not available yet, skipping...');
      }
    }

    // Update attachments if column exists and attachments provided
    if (attachments && attachments.length > 0) {
      try {
        await db.query(
          `UPDATE homework SET attachments = $1 WHERE id = $2`,
          [JSON.stringify(attachments), homeworkId]
        );
      } catch (err) {
        console.log('Attachments column not available yet, skipping...');
      }
    }

    // Create submissions for all students in the class
    const studentsResult = await db.query(
      'SELECT id FROM students WHERE class_id = $1 AND status = $2',
      [class_id, 'active']
    );
    
    for (const student of studentsResult.rows) {
      await db.query(
        `INSERT INTO homework_submissions (
          homework_id, student_id, status
        ) VALUES ($1, $2, $3)`,
        [homeworkId, student.id, 'pending']
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Homework assigned successfully',
    });
  } catch (error: any) {
    console.error('Error creating homework:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

