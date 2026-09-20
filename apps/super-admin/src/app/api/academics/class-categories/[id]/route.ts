import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import {
  CLASS_CATEGORY_LIST_SQL,
  ensureClassCategoriesSchema,
  parseClassIds,
  replaceCategoryClasses,
} from '@/lib/ensure-class-categories-schema';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;
    await ensureClassCategoriesSchema(db);

    const result = await db.query(
      `${CLASS_CATEGORY_LIST_SQL}
       WHERE cat.id = $1
       GROUP BY cat.id`,
      [params.id],
    );
    if (!result.rows[0]) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching class category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load class category' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

    const updated = await db.query(
      `UPDATE class_categories
       SET name = $1,
           report_card_format = $2,
           is_active = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [name, reportCardFormat, body.is_active !== false, params.id],
    );
    if (!updated.rows[0]) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    }

    await replaceCategoryClasses(db, updated.rows[0].id, classIds);

    const result = await db.query(
      `${CLASS_CATEGORY_LIST_SQL}
       WHERE cat.id = $1
       GROUP BY cat.id`,
      [params.id],
    );
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: unknown) {
    const pgCode = (error as { code?: string })?.code;
    if (pgCode === '23505') {
      return NextResponse.json(
        { success: false, error: 'A category with this name already exists' },
        { status: 409 },
      );
    }
    console.error('Error updating class category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update class category' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;
    await ensureClassCategoriesSchema(db);

    const result = await db.query(
      `DELETE FROM class_categories WHERE id = $1 RETURNING id`,
      [params.id],
    );
    if (!result.rows[0]) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting class category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete class category' },
      { status: 500 },
    );
  }
}
