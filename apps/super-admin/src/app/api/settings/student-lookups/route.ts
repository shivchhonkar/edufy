import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureSystemSettings } from '@/lib/ensure-system-settings';
import {
  mergeStudentLookupSettings,
  type StudentLookupSettings,
} from '@/lib/student-lookup-settings';

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureSystemSettings(db);

    const result = await db.query<{ student_lookup_settings: unknown }>(
      `SELECT student_lookup_settings FROM system_settings ORDER BY id DESC LIMIT 1`
    );

    return NextResponse.json({
      success: true,
      data: mergeStudentLookupSettings(result.rows[0]?.student_lookup_settings),
    });
  } catch (error) {
    console.error('Error fetching student lookup settings:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch student master data';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureSystemSettings(db);
    const body = await request.json();

    const settings: StudentLookupSettings = mergeStudentLookupSettings(body);

    const existing = await db.query('SELECT id FROM system_settings ORDER BY id DESC LIMIT 1');

    let result;
    if (!existing.rows.length) {
      result = await db.query(
        `INSERT INTO system_settings (school_name, student_lookup_settings, created_at, updated_at)
         VALUES ($1, $2::jsonb, NOW(), NOW())
         RETURNING student_lookup_settings`,
        ['Shribi Edufy School', JSON.stringify(settings)]
      );
    } else {
      result = await db.query(
        `UPDATE system_settings
         SET student_lookup_settings = $1::jsonb, updated_at = NOW()
         WHERE id = $2
         RETURNING student_lookup_settings`,
        [JSON.stringify(settings), existing.rows[0].id]
      );
    }

    return NextResponse.json({
      success: true,
      data: mergeStudentLookupSettings(result.rows[0]?.student_lookup_settings),
      message: 'Student master data saved',
    });
  } catch (error) {
    console.error('Error saving student lookup settings:', error);
    const message = error instanceof Error ? error.message : 'Failed to save student master data';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
