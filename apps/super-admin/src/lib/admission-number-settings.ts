import type { RequestDb } from '@/lib/request-db';
import { ensureSystemSettings } from '@/lib/ensure-system-settings';
import {
  mergeReportSettings,
  type ReportSettings,
} from '@/lib/report-settings';
import {
  type AdmissionNumberFormatSettings,
  DEFAULT_ADMISSION_NUMBER_SETTINGS,
  generateAdmissionNumber,
  formatAdmissionNumber,
} from '@edulakhya/utils';

export function reportSettingsToAdmissionFormat(
  report: unknown,
): AdmissionNumberFormatSettings {
  const merged = mergeReportSettings(report);
  return admissionFormatFromReportSettings(merged);
}

export function admissionFormatFromReportSettings(
  settings: ReportSettings,
): AdmissionNumberFormatSettings {
  return {
    use_prefix: settings.admission_use_prefix ?? DEFAULT_ADMISSION_NUMBER_SETTINGS.use_prefix,
    prefix: settings.admission_prefix ?? DEFAULT_ADMISSION_NUMBER_SETTINGS.prefix,
    include_year:
      settings.admission_include_year ?? DEFAULT_ADMISSION_NUMBER_SETTINGS.include_year,
    digit_length:
      settings.admission_digit_length ?? DEFAULT_ADMISSION_NUMBER_SETTINGS.digit_length,
  };
}

export async function getAdmissionNumberSettings(
  db: RequestDb,
): Promise<AdmissionNumberFormatSettings> {
  await ensureSystemSettings(db);
  const result = await db.query<{ report_settings: unknown }>(
    'SELECT report_settings FROM system_settings ORDER BY id DESC LIMIT 1',
  );
  return reportSettingsToAdmissionFormat(result.rows[0]?.report_settings);
}

export function generateAdmissionNumberForSchool(
  settings: AdmissionNumberFormatSettings,
  year?: number,
): string {
  return generateAdmissionNumber({ ...settings, year });
}

export function formatAdmissionNumberForSchool(
  admissionNumber: string | null | undefined,
  settings: AdmissionNumberFormatSettings,
): string {
  return formatAdmissionNumber(admissionNumber, settings);
}

export { formatAdmissionNumber, generateAdmissionNumber };
