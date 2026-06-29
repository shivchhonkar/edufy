import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_THEME_SETTINGS, mergeThemeSettings } from '@edulakhya/utils'
import { getRequestDbOrError } from '@/lib/request-db'

const THEME_COLUMN_SQL = `
  ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS theme_settings JSONB DEFAULT '{}'::jsonb;
`

export async function GET(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request)
    if (dbResult instanceof NextResponse) return dbResult
    const { db } = dbResult

    await db.query(THEME_COLUMN_SQL).catch(() => {})

    const result = await db.query<{ theme_settings: unknown }>(
      `SELECT theme_settings FROM system_settings ORDER BY id DESC LIMIT 1`,
    )

    return NextResponse.json({
      success: true,
      data: mergeThemeSettings(result.rows[0]?.theme_settings),
    })
  } catch (error) {
    console.error('Theme fetch error:', error)
    return NextResponse.json({
      success: true,
      data: DEFAULT_THEME_SETTINGS,
    })
  }
}
