import type { InquirySource, InquiryStatus } from '@/lib/admission-inquiry-api';

export const STATUS_LABELS: Record<InquiryStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  visit_scheduled: 'Visit Scheduled',
  interested: 'Interested',
  registered: 'Registered',
  enrolled: 'Enrolled',
  lost: 'Lost',
  on_hold: 'On Hold',
};

export const STATUS_COLORS: Record<InquiryStatus, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-purple-100 text-purple-800',
  visit_scheduled: 'bg-orange-100 text-orange-800',
  interested: 'bg-amber-100 text-amber-800',
  registered: 'bg-teal-100 text-teal-800',
  enrolled: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
  on_hold: 'bg-gray-100 text-gray-700',
};

export const PIPELINE_STATUSES: InquiryStatus[] = [
  'new',
  'contacted',
  'visit_scheduled',
  'interested',
  'registered',
];

export const TERMINAL_STATUSES: InquiryStatus[] = ['enrolled', 'lost', 'on_hold'];

/** Card surface + border tint for inquiry tiles */
export const STATUS_CARD_STYLES: Record<InquiryStatus, string> = {
  new: 'bg-blue-50 border-blue-200 hover:bg-blue-100/80',
  contacted: 'bg-purple-50 border-purple-200 hover:bg-purple-100/80',
  visit_scheduled: 'bg-orange-50 border-orange-200 hover:bg-orange-100/80',
  interested: 'bg-amber-50 border-amber-200 hover:bg-amber-100/80',
  registered: 'bg-teal-50 border-teal-200 hover:bg-teal-100/80',
  enrolled: 'bg-green-50 border-green-300 hover:bg-green-100/80',
  lost: 'bg-red-50 border-red-200 hover:bg-red-100/80',
  on_hold: 'bg-slate-100 border-slate-300 hover:bg-slate-200/80',
};

/** Column background for terminal status groups */
export const TERMINAL_COLUMN_STYLES: Record<
  (typeof TERMINAL_STATUSES)[number],
  string
> = {
  enrolled: 'bg-green-50/60 ring-1 ring-green-200',
  lost: 'bg-red-50/60 ring-1 ring-red-200',
  on_hold: 'bg-slate-50 ring-1 ring-slate-200',
};

export const SOURCE_LABELS: Record<InquirySource, string> = {
  walk_in: 'Walk-in',
  phone: 'Phone',
  website: 'Website',
  referral: 'Referral',
  social_media: 'Social Media',
  other: 'Other',
};

export function inquiryStudentName(inquiry: {
  student_first_name: string;
  student_last_name?: string | null;
}): string {
  return [inquiry.student_first_name, inquiry.student_last_name].filter(Boolean).join(' ');
}

/** Class shown on pipeline cards — enrolled students use their actual student record class */
export function inquiryClassDisplay(inquiry: {
  status: InquiryStatus;
  interested_class_name?: string | null;
  enrolled_class_name?: string | null;
}): { prefix: string; name: string | null } {
  if (inquiry.status === 'enrolled') {
    return {
      prefix: 'Enrolled in',
      name: inquiry.enrolled_class_name || inquiry.interested_class_name || null,
    };
  }
  return {
    prefix: 'Class interest',
    name: inquiry.interested_class_name || null,
  };
}
