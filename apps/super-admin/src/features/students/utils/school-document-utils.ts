/** Split a comma-separated address into two balanced lines for document headers. */
export function splitAddressIntoTwoLines(text?: string | null): [string, string] {
  const trimmed = text?.trim();
  if (!trimmed) return ['', ''];

  const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const mid = Math.ceil(parts.length / 2);
    return [parts.slice(0, mid).join(', '), parts.slice(mid).join(', ')];
  }

  const mid = Math.ceil(trimmed.length / 2);
  const splitAt = trimmed.lastIndexOf(' ', mid);
  if (splitAt > 8) {
    return [trimmed.slice(0, splitAt).trim(), trimmed.slice(splitAt).trim()];
  }

  return [trimmed, ''];
}

export function formatAcademicYearLabel(academicYear?: string | null): string | undefined {
  const trimmed = academicYear?.trim();
  if (!trimmed) return undefined;
  if (/^academic year/i.test(trimmed)) return trimmed;
  return `Academic Year ${trimmed}`;
}

export function resolveAssetUrl(url?: string | null): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
  }
  return trimmed;
}

export interface SchoolDocumentReportSettings {
  logo_url?: string;
  counsellor_name?: string;
  counsellor_signature_url?: string;
  primary_color?: string;
  show_watermark?: boolean;
  watermark_url?: string;
  watermark_text?: string;
}

export interface SchoolDocumentSettings {
  school_name?: string;
  school_address?: string;
  school_phone?: string;
  school_email?: string;
  academic_year?: string;
  logo_url?: string;
}

export function resolveSchoolLogoUrl(
  settings?: SchoolDocumentSettings,
  reportSettings?: SchoolDocumentReportSettings,
): string | undefined {
  return resolveAssetUrl(reportSettings?.logo_url || settings?.logo_url);
}

export function resolveDocumentWatermarkUrl(
  reportSettings?: SchoolDocumentReportSettings,
): string | undefined {
  if (reportSettings?.show_watermark === false) return undefined;
  return resolveAssetUrl(reportSettings?.watermark_url);
}

