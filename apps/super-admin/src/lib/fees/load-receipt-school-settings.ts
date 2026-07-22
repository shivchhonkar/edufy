import type { RequestDb } from '@/lib/request-db';
import { ensureSystemSettings } from '@/lib/ensure-system-settings';
import { mergeReportSettings } from '@/lib/report-settings';
import type { FeeReceiptSettings } from '@/features/fees/utils/fee-receipt-print';

function resolveAbsoluteAssetUrl(value: string | undefined, origin?: string): string {
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (!origin) return value;
  return `${origin}${value.startsWith('/') ? '' : '/'}${value}`;
}

export async function loadReceiptSchoolSettings(
  db: RequestDb,
  origin?: string,
): Promise<FeeReceiptSettings> {
  await ensureSystemSettings(db);

  const result = await db.query<{
    school_name?: string;
    school_address?: string;
    school_phone?: string;
    school_email?: string;
    academic_year?: string;
    report_settings?: unknown;
  }>(
    `SELECT school_name, school_address, school_phone, school_email, academic_year, report_settings
     FROM system_settings
     ORDER BY id DESC
     LIMIT 1`,
  );

  const row = result.rows[0];
  const reportSettings = mergeReportSettings(row?.report_settings);

  return {
    school_name: row?.school_name || 'School Name',
    school_address: row?.school_address || '',
    school_phone: row?.school_phone || '',
    school_email: row?.school_email || '',
    school_website: reportSettings.website || '',
    logo_url: resolveAbsoluteAssetUrl(reportSettings.logo_url, origin),
    academic_year: row?.academic_year || '',
  };
}
