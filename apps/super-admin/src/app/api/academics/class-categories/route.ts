import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import {
  CLASS_CATEGORY_LIST_SQL,
  ensureClassCategoriesSchema,
  parseClassIds,
  replaceCategoryClasses,
} from '@/lib/ensure-class-categories-schema';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;
    await ensureClassCategoriesSchema(db);

    const result = await db.query(
      `${CLASS_CATEGORY_LIST_SQL}
       GROUP BY cat.id
       ORDER BY cat.name ASC`,
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching class categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load class categories' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;
    await ensureClassCategoriesSchema(db);

    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Category name is required' }, { status: 400 });
    }

    const reportCardFormat = Number.isFinite(Number(body.report_card_format))
      ? parseInt(String(body.report_card_format), 10)
      : 0;
    const classIds = parseClassIds(body.class_ids);

    const inserted = await db.query(
      `INSERT INTO class_categories (name, report_card_format, is_active)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, reportCardFormat, body.is_active !== false],
    );
    const category = inserted.rows[0];
    await replaceCategoryClasses(db, category.id, classIds);

    const result = await db.query(
      `${CLASS_CATEGORY_LIST_SQL}
       WHERE cat.id = $1
       GROUP BY cat.id`,
      [category.id],
    );
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error: unknown) {
    const pgCode = (error as { code?: string })?.code;
    if (pgCode === '23505') {
      return NextResponse.json(
        { success: false, error: 'A category with this name already exists' },
        { status: 409 },
      );
    }
    console.error('Error creating class category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create class category' },
      { status: 500 },
    );
  }
}
