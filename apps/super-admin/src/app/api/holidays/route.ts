import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
export interface Holiday {
  id: number;
  date: Date;
  name: string;
  type: 'public' | 'school' | 'national' | 'festival';
  description?: string;
  created_at: Date;
}

// GET all holidays
export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let queryText = 'SELECT * FROM holidays WHERE 1=1';
    let queryParams: any[] = [];
    let paramCount = 0;

    if (year) {
      paramCount++;
      queryText += ` AND EXTRACT(YEAR FROM date) = $${paramCount}`;
      queryParams.push(year);
    }

    if (startDate && endDate) {
      paramCount++;
      queryText += ` AND date BETWEEN $${paramCount} AND $${paramCount + 1}`;
      queryParams.push(startDate, endDate);
      paramCount++;
    }

    queryText += ' ORDER BY date ASC';

    const result = await db.query<Holiday>(queryText, queryParams);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch holidays' },
      { status: 500 }
    );
  }
}

// POST create new holiday
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const { date, name, type, description } = body;

    if (!date || !name || !type) {
      return NextResponse.json(
        { success: false, error: 'Date, name, and type are required' },
        { status: 400 }
      );
    }

    const result = await db.query<Holiday>(
      `INSERT INTO holidays (date, name, type, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [date, name, type, description || null]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Holiday created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating holiday:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create holiday' },
      { status: 500 }
    );
  }
}

// PUT bulk upload holidays
export async function PUT(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const { holidays } = body;

    if (!holidays || !Array.isArray(holidays)) {
      return NextResponse.json(
        { success: false, error: 'Invalid holidays data' },
        { status: 400 }
      );
    }

    const results = [];
    for (const holiday of holidays) {
      const { date, name, type, description } = holiday;
      
      // Check if holiday already exists
      const existing = await db.query(
        'SELECT id FROM holidays WHERE date = $1',
        [date]
      );

      if (existing.rows.length === 0) {
        await db.query(
          `INSERT INTO holidays (date, name, type, description)
           VALUES ($1, $2, $3, $4)`,
          [date, name, type, description || null]
        );
        results.push({ date, status: 'created' });
      } else {
        results.push({ date, status: 'already_exists' });
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Uploaded ${results.filter(r => r.status === 'created').length} holidays`,
    });
  } catch (error) {
    console.error('Error uploading holidays:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload holidays' },
      { status: 500 }
    );
  }
}

// DELETE holiday
export async function DELETE(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Holiday ID is required' },
        { status: 400 }
      );
    }

    await db.query('DELETE FROM holidays WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      message: 'Holiday deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete holiday' },
      { status: 500 }
    );
  }
}










