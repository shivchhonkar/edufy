import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const result = await db.query(
      'SELECT * FROM exam_terms ORDER BY start_date DESC NULLS LAST, name ASC'
    ).catch(() => ({ rows: [] }));

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Exam terms error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch exam terms' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const { name, academic_year, start_date, end_date } = await request.json();

    if (!name || !academic_year) {
      return NextResponse.json(
        { success: false, error: 'Name and academic year are required' },
        { status: 400 }
      );
    }

    const result = await db.query(
      `INSERT INTO exam_terms (name, academic_year, start_date, end_date)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, academic_year, start_date || null, end_date || null]
    );

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Create exam term error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create exam term' }, { status: 500 });
  }
}
