import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureFeeSchema } from '@/lib/ensure-fee-schema';
// GET fee categories
export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureFeeSchema(db);
    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get('is_active');

    let queryText = 'SELECT * FROM fee_categories WHERE 1=1';
    let queryParams: any[] = [];

    if (isActive) {
      queryText += ' AND is_active = $1';
      queryParams.push(isActive === 'true');
    }

    queryText += ' ORDER BY name';

    const result = await db.query(queryText, queryParams);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching fee categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch fee categories' },
      { status: 500 }
    );
  }
}

// POST create fee category
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Category name is required' },
        { status: 400 }
      );
    }

    const result = await db.query(
      `INSERT INTO fee_categories (name, description, is_active)
       VALUES ($1, $2, true)
       RETURNING *`,
      [name, description]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Fee category created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating fee category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create fee category' },
      { status: 500 }
    );
  }
}

