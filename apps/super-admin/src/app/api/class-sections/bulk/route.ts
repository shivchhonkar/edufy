import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureClassSectionsTable } from '@/lib/ensure-class-sections';

// POST bulk assign sections to a class
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureClassSectionsTable(db);
    const body = await request.json();
    const { class_id, section_ids } = body;

    if (!class_id || !Array.isArray(section_ids)) {
      return NextResponse.json(
        { success: false, error: 'Class ID and section_ids array are required' },
        { status: 400 }
      );
    }

    await db.query('DELETE FROM class_sections WHERE class_id = $1', [class_id]);

    for (const sectionId of section_ids) {
      await db.query(
        `INSERT INTO class_sections (class_id, section_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [class_id, sectionId]
      );
    }

    return NextResponse.json({
      success: true,
      message: `${section_ids.length} section(s) assigned to class`,
    });
  } catch (error: unknown) {
    console.error('Error bulk assigning sections:', error);
    const message = error instanceof Error ? error.message : 'Failed to assign sections';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
