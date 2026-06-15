import { NextRequest, NextResponse } from 'next/server';
import { query } from '@edulakhya/database';

export async function GET() {
  try {
    const result = await query(
      'SELECT * FROM inventory_categories ORDER BY name',
      []
    );
    
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description } = body;

    const result = await query(
      'INSERT INTO inventory_categories (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


























































