import { getTenantFromRequest } from '@edulakhya/tenant'
import { queryForTenant } from '@edulakhya/database'
import { resolveSchoolAssetUrl } from '@edulakhya/utils'
import { DEFAULT_FAVICON } from '@/lib/site-seo'

export type SchoolBranding = {
  school_name: string
  logo_url: string
  favicon_url: string
}

export type SchoolPrintSettings = {
  school_name: string
  school_address: string
  school_phone: string
  school_email: string
  academic_year: string
  logo_url: string
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

export async function fetchSchoolPrintSettings(host: string | null): Promise<SchoolPrintSettings> {
  try {
    const resolved = await getTenantFromRequest(host)
    if (!resolved) {
      return {
        school_name: 'School',
        school_address: '',
        school_phone: '',
        school_email: '',
        academic_year: '',
        logo_url: '',
      }
    }

    const result = await queryForTenant(
      resolved.dbConfig,
      `SELECT school_name, school_address, school_phone, school_email, academic_year, report_settings
       FROM system_settings
       ORDER BY id DESC
       LIMIT 1`,
    )

    const row = result.rows[0] as
      | {
          school_name?: string
          school_address?: string
          school_phone?: string
          school_email?: string
          academic_year?: string
          report_settings?: unknown
        }
      | undefined

    const rawLogo = parseLogoUrl(row?.report_settings)
    const logo_url = resolveSchoolAssetUrl(rawLogo, host)
    const school_name =
      row?.school_name?.trim() || resolved.context.tenant.name?.trim() || 'School'

    return {
      school_name,
      school_address: row?.school_address?.trim() || '',
      school_phone: row?.school_phone?.trim() || '',
      school_email: row?.school_email?.trim() || '',
      academic_year: row?.academic_year?.trim() || '',
      logo_url,
    }
  } catch (error) {
    console.error('fetchSchoolPrintSettings error:', error)
    return {
      school_name: 'School',
      school_address: '',
      school_phone: '',
      school_email: '',
      academic_year: '',
      logo_url: '',
    }
  }
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

    const rawLogo = parseLogoUrl(row?.report_settings)
    const logo_url = resolveSchoolAssetUrl(rawLogo, host)
    const school_name =
      row?.school_name?.trim() || resolved.context.tenant.name?.trim() || 'School'

    return {
      school_name,
      logo_url,
      favicon_url: logo_url || resolveSchoolAssetUrl(DEFAULT_FAVICON, host),
    }
  } catch (error) {
    console.error('fetchSchoolBranding error:', error)
    return { school_name: 'School', logo_url: '', favicon_url: DEFAULT_FAVICON }
  }
}
