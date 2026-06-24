import type { StudentIdCardSchoolInfo } from '@/features/students/components/StudentIdCard';
import {
  resolveAssetUrl,
  resolveDocumentWatermarkUrl,
  resolveSchoolLogoUrl,
  type SchoolDocumentReportSettings,
  type SchoolDocumentSettings,
} from '@/features/students/utils/school-document-utils';

const DEFAULT_BRAND_COLOR = '#2563eb';

export { resolveAssetUrl } from '@/features/students/utils/school-document-utils';

export function normalizeBrandColor(color?: string | null): string {
  const trimmed = color?.trim();
  if (trimmed && /^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed;
  return DEFAULT_BRAND_COLOR;
}

export function darkenBrandColor(hex: string, amount = 0.15): string {
  const normalized = normalizeBrandColor(hex).slice(1);
  const r = Math.max(0, Math.floor(parseInt(normalized.slice(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.floor(parseInt(normalized.slice(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.floor(parseInt(normalized.slice(4, 6), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function buildStudentIdCardSchoolInfo(
  settings: SchoolDocumentSettings,
  reportSettings?: SchoolDocumentReportSettings,
): StudentIdCardSchoolInfo {
  return {
    name: settings.school_name?.trim() || 'School',
    logoUrl: resolveSchoolLogoUrl(settings, reportSettings),
    phone: settings.school_phone?.trim() || undefined,
    address: settings.school_address?.trim() || undefined,
    academicYear: settings.academic_year
      ? `Academic Year ${settings.academic_year}`
      : undefined,
    principalName: reportSettings?.counsellor_name?.trim() || undefined,
    signatureUrl: resolveAssetUrl(reportSettings?.counsellor_signature_url),
    brandColor: normalizeBrandColor(reportSettings?.primary_color),
    showWatermark: reportSettings?.show_watermark !== false,
    stampUrl: resolveDocumentWatermarkUrl(reportSettings),
  };
}
