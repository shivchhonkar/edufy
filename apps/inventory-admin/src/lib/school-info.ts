import { getTenantFromRequest } from '@edulakhya/tenant'
import { queryForTenant } from '@edulakhya/database'
import { DEFAULT_FAVICON } from '@/lib/site-seo'

export type SchoolBranding = {
  school_name: string
  logo_url: string
  favicon_url: string
}

function parseLogoUrl(reportSettings: unknown): string {
  if (!reportSettings) return ''
  let parsed = reportSettings
  if (typeof reportSettings === 'string') {
    try {
      parsed = JSON.parse(reportSettings)
    } catch {
      return ''
    }
  }
  if (parsed && typeof parsed === 'object' && 'logo_url' in parsed) {
    return String((parsed as { logo_url?: string }).logo_url || '').trim()
  }
  return ''
}

export async function fetchSchoolBranding(host: string | null): Promise<SchoolBranding> {
  try {
    const resolved = await getTenantFromRequest(host)
    if (!resolved) {
      return { school_name: 'School', logo_url: '', favicon_url: DEFAULT_FAVICON }
    }

    const result = await queryForTenant(
      resolved.dbConfig,
      `SELECT school_name, report_settings FROM system_settings ORDER BY id DESC LIMIT 1`,
    )

    const row = result.rows[0] as
      | { school_name?: string; report_settings?: unknown }
      | undefined

    const logo_url = parseLogoUrl(row?.report_settings)
    const school_name =
      row?.school_name?.trim() || resolved.context.tenant.name?.trim() || 'School'

    return {
      school_name,
      logo_url,
      favicon_url: logo_url || DEFAULT_FAVICON,
    }
  } catch (error) {
    console.error('fetchSchoolBranding error:', error)
    return { school_name: 'School', logo_url: '', favicon_url: DEFAULT_FAVICON }
  }
}
