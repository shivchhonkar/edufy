import type { GatePassSchoolInfo } from '@/features/students/components/GatePassDocument';
import {
  resolveDocumentWatermarkUrl,
  resolveSchoolLogoUrl,
  type SchoolDocumentReportSettings,
  type SchoolDocumentSettings,
} from '@/features/students/utils/school-document-utils';

export function buildGatePassSchoolInfo(
  settings: SchoolDocumentSettings,
  reportSettings?: SchoolDocumentReportSettings,
): GatePassSchoolInfo {
  return {
    name: settings.school_name?.trim() || 'School',
    logoUrl: resolveSchoolLogoUrl(settings, reportSettings),
    address: settings.school_address?.trim() || undefined,
    phone: settings.school_phone?.trim() || undefined,
    email: settings.school_email?.trim() || undefined,
    academicYear: settings.academic_year?.trim() || undefined,
    showWatermark: reportSettings?.show_watermark !== false,
    watermarkUrl: resolveDocumentWatermarkUrl(reportSettings),
    watermarkText: reportSettings?.watermark_text?.trim() || undefined,
    watermarkColor: reportSettings?.primary_color?.trim() || undefined,
  };
}
