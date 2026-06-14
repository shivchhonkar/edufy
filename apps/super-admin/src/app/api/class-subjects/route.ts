import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureClassSubjectsSchema } from '@/lib/ensure-class-subjects-schema';
import { classNameOrderSql } from '@/lib/class-sort';

// GET - Fetch all class-subject assignments
export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureClassSubjectsSchema(db);
    const searchParams = request.nextUrl.searchParams;
    const classId = searchParams.get('class_id');

    let query = `
      SELECT 
        cs.*,
        c.name as class_name,
        s.name as subject_name,
        s.code as subject_code,
        u.full_name as teacher_name
      FROM class_subjects cs
      JOIN classes c ON cs.class_id = c.id
      JOIN subjects s ON cs.subject_id = s.id
      LEFT JOIN users u ON cs.teacher_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];
    
    if (classId) {
      params.push(classId);
      query += ` AND cs.class_id = $${params.length}`;
    }

    query += ` ORDER BY ${classNameOrderSql('c.name')}, s.name`;

    const result = await db.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching class subjects:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Assign subject to class
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureClassSubjectsSchema(db);
    const body = await request.json();
    const { class_id, subject_id, teacher_id } = body;

    if (!class_id || !subject_id) {
      return NextResponse.json(
        { success: false, error: 'Class ID and Subject ID are required' },
        { status: 400 }
      );
    }

    const result = await db.query(
      `INSERT INTO class_subjects (class_id, subject_id, teacher_id) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (class_id, subject_id) 
       DO UPDATE SET teacher_id = $3, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [class_id, subject_id, teacher_id || null]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Subject assigned to class successfully',
    });
  } catch (error: any) {
    console.error('Error assigning subject to class:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Remove subject from class
export async function DELETE(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Assignment ID is required' },
        { status: 400 }
      );
    }

    await db.query('DELETE FROM class_subjects WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      message: 'Subject removed from class successfully',
    });
  } catch (error: any) {
    console.error('Error removing subject from class:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


























































