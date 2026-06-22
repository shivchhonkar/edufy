export type ReportTemplate = 'cbse' | 'simple' | 'school_branded';

export type ReportHeaderStyle = 'cbse_board' | 'school_branded' | 'minimal';

export interface ReportSettings {
  template: ReportTemplate;
  header_style: ReportHeaderStyle;
  school_code: string;
  affiliation_number: string;
  board_name: string;
  header_hindi: string;
  header_english: string;
  header_subtitle: string;
  logo_url: string;
  counsellor_name: string;
  counsellor_title: string;
  counsellor_signature_url: string;
  show_qr_code: boolean;
  show_grading_scale: boolean;
  show_watermark: boolean;
  show_signature: boolean;
  primary_color: string;
  footer_note: string;
  website: string;
  city: string;
  state: string;
  pincode: string;
}

export const DEFAULT_REPORT_SETTINGS: ReportSettings = {
  template: 'cbse',
  header_style: 'cbse_board',
  school_code: '',
  affiliation_number: '',
  board_name: 'CBSE',
  header_hindi: 'केन्द्रीय माध्यमिक शिक्षा बोर्ड',
  header_english: 'Central Board of Secondary Education',
  header_subtitle: '(An Autonomous Organisation Under the Ministry of Education, Govt. of India)',
  logo_url: '',
  counsellor_name: 'Dr. Joseph Emmanuel',
  counsellor_title: 'Controller of Examinations',
  counsellor_signature_url: '',
  show_qr_code: true,
  show_grading_scale: true,
  show_watermark: true,
  show_signature: true,
  primary_color: '#1e40af',
  footer_note: '',
  website: '',
  city: '',
  state: '',
  pincode: '',
};

export const REPORT_TEMPLATE_OPTIONS: { id: ReportTemplate; label: string; description: string }[] = [
  {
    id: 'cbse',
    label: 'CBSE Official Style',
    description: 'Blue border, board header, grading scale, and formal marks table.',
  },
  {
    id: 'school_branded',
    label: 'School Branded',
    description: 'School logo and name as header with CBSE-style marks layout.',
  },
  {
    id: 'simple',
    label: 'Simple Report Card',
    description: 'Clean minimal layout without board branding.',
  },
];

export const REPORT_HEADER_OPTIONS: { id: ReportHeaderStyle; label: string; description: string }[] = [
  {
    id: 'cbse_board',
    label: 'CBSE Board Header',
    description: 'Hindi + English board title with logo and affiliation details.',
  },
  {
    id: 'school_branded',
    label: 'School Header',
    description: 'School logo, name, and address only.',
  },
  {
    id: 'minimal',
    label: 'Minimal Header',
    description: 'Single-line title with exam name.',
  },
];

export function mergeReportSettings(raw: unknown): ReportSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_REPORT_SETTINGS };
  const input = raw as Partial<ReportSettings>;
  return {
    ...DEFAULT_REPORT_SETTINGS,
    ...input,
  };
}

/** Join street + city + state + pincode for documents and system_settings.school_address. */
export function buildFullSchoolAddress(parts: {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
}): string {
  return [parts.street, parts.city, parts.state, parts.pincode]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
}

/** Split combined DB address back into street-only for setup form fields. */
export function extractStreetFromSchoolAddress(
  combined: string,
  city: string,
  state: string,
  pincode: string,
): string {
  const trimmed = combined.trim();
  if (!trimmed) return '';

  const tailParts = [city, state, pincode].map((part) => part.trim()).filter(Boolean);
  if (tailParts.length === 0) return trimmed;

  for (let i = tailParts.length; i >= 1; i -= 1) {
    const suffix = tailParts.slice(-i).join(', ');
    if (trimmed.endsWith(suffix)) {
      const street = trimmed.slice(0, -suffix.length).replace(/,\s*$/, '').trim();
      if (street) return street;
    }
  }

  return trimmed;
}

export const REPORT_SETTINGS_MIGRATION_SQL = `
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS report_settings JSONB DEFAULT '{}'::jsonb;
`;
