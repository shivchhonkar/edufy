import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
// GET - Fetch all subjects
export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const result = await db.query(
      'SELECT * FROM subjects ORDER BY name',
      []
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching subjects:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new subject
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const { name, code, description } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Subject name is required' },
        { status: 400 }
      );
    }

    const result = await db.query(
      'INSERT INTO subjects (name, code, description) VALUES ($1, $2, $3) RETURNING *',
      [name, code, description]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Subject created successfully',
    });
  } catch (error: any) {
    console.error('Error creating subject:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


























































