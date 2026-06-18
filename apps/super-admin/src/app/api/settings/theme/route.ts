import { NextRequest, NextResponse } from 'next/server'
import { getRequestDb } from '@/lib/request-db'
import { ensureSystemSettings } from '@/lib/ensure-system-settings'
import {
  DEFAULT_THEME_SETTINGS,
  mergeThemeSettings,
  type ThemeSettings,
} from '@/lib/theme-settings'

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request)
    await ensureSystemSettings(db)

    const result = await db.query<{ theme_settings: unknown }>(
      `SELECT theme_settings FROM system_settings ORDER BY id DESC LIMIT 1`,
    )

    const settings = mergeThemeSettings(result.rows[0]?.theme_settings)

    return NextResponse.json({
      success: true,
      data: settings,
    })
  } catch (error) {
    console.error('Error fetching theme settings:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch theme settings'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request)
    await ensureSystemSettings(db)
    const body = await request.json()

    const settings: ThemeSettings = mergeThemeSettings(body)

    const existing = await db.query('SELECT id FROM system_settings ORDER BY id DESC LIMIT 1')

    let result
    if (!existing.rows.length) {
      result = await db.query(
        `INSERT INTO system_settings (school_name, theme_settings, created_at, updated_at)
         VALUES ($1, $2::jsonb, NOW(), NOW())
         RETURNING theme_settings`,
        ['Shribi Edufy School', JSON.stringify(settings)],
      )
    } else {
      result = await db.query(
        `UPDATE system_settings
         SET theme_settings = $1::jsonb, updated_at = NOW()
         WHERE id = $2
         RETURNING theme_settings`,
        [JSON.stringify(settings), existing.rows[0].id],
      )
    }

    return NextResponse.json({
      success: true,
      data: mergeThemeSettings(result.rows[0]?.theme_settings),
      message: 'Theme settings saved',
    })
  } catch (error) {
    console.error('Error saving theme settings:', error)
    const message = error instanceof Error ? error.message : 'Failed to save theme settings'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request)
    await ensureSystemSettings(db)

    const existing = await db.query('SELECT id FROM system_settings ORDER BY id DESC LIMIT 1')

    if (!existing.rows.length) {
      return NextResponse.json({
        success: true,
        data: DEFAULT_THEME_SETTINGS,
        message: 'Theme reset to default',
      })
    }

    const result = await db.query(
      `UPDATE system_settings
       SET theme_settings = $1::jsonb, updated_at = NOW()
       WHERE id = $2
       RETURNING theme_settings`,
      [JSON.stringify(DEFAULT_THEME_SETTINGS), existing.rows[0].id],
    )

    return NextResponse.json({
      success: true,
      data: mergeThemeSettings(result.rows[0]?.theme_settings),
      message: 'Theme reset to default',
    })
  } catch (error) {
    console.error('Error resetting theme settings:', error)
    const message = error instanceof Error ? error.message : 'Failed to reset theme settings'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
