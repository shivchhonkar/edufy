import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureSystemSettings } from '@/lib/ensure-system-settings';
import { DEFAULT_REPORT_SETTINGS, mergeReportSettings, type ReportSettings } from '@/lib/report-settings';

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureSystemSettings(db);

    const result = await db.query<{ report_settings: unknown; school_name: string; academic_year: string }>(
      `SELECT report_settings, school_name, academic_year FROM system_settings ORDER BY id DESC LIMIT 1`
    );

    const row = result.rows[0];
    const settings = mergeReportSettings(row?.report_settings);

    return NextResponse.json({
      success: true,
      data: {
        ...settings,
        school_name: row?.school_name || '',
        academic_year: row?.academic_year || '',
      },
    });
  } catch (error) {
    console.error('Error fetching report settings:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch report settings';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureSystemSettings(db);
    const body = await request.json();

    const settings: ReportSettings = mergeReportSettings(body);

    const existing = await db.query('SELECT id FROM system_settings ORDER BY id DESC LIMIT 1');

    let result;
    if (!existing.rows.length) {
      result = await db.query(
        `INSERT INTO system_settings (school_name, report_settings, created_at, updated_at)
         VALUES ($1, $2::jsonb, NOW(), NOW())
         RETURNING report_settings, school_name, academic_year`,
        [body.school_name || 'School', JSON.stringify(settings)]
      );
    } else {
      result = await db.query(
        `UPDATE system_settings
         SET report_settings = $1::jsonb, updated_at = NOW()
         WHERE id = $2
         RETURNING report_settings, school_name, academic_year`,
        [JSON.stringify(settings), existing.rows[0].id]
      );
    }

    const row = result.rows[0];
    return NextResponse.json({
      success: true,
      data: {
        ...mergeReportSettings(row.report_settings),
        school_name: row.school_name,
        academic_year: row.academic_year,
      },
      message: 'Report settings saved',
    });
  } catch (error) {
    console.error('Error saving report settings:', error);
    const message = error instanceof Error ? error.message : 'Failed to save report settings';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
