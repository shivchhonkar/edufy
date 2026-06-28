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
  new: 'bg-primary-100 text-primary-800',
  contacted: 'bg-primary-100 text-primary-700',
  visit_scheduled: 'bg-primary-50 text-primary-700',
  interested: 'bg-primary-50 text-primary-600',
  registered: 'bg-primary-100 text-primary-600',
  enrolled: 'bg-primary-100 text-primary-700',
  lost: 'bg-primary-50 text-primary-900',
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

export const STATUS_COLUMN_META: Record<
  InquiryStatus,
  { subtitle: string; statHint: string; borderClass: string; iconBg: string; iconColor: string }
> = {
  new: {
    subtitle: 'Not yet contacted',
    statHint: 'Needs contact',
    borderClass: 'border-t-primary-800',
    iconBg: 'bg-primary-100',
    iconColor: 'text-primary-800',
  },
  contacted: {
    subtitle: 'In progress',
    statHint: 'In progress',
    borderClass: 'border-t-primary-700',
    iconBg: 'bg-primary-100',
    iconColor: 'text-primary-700',
  },
  visit_scheduled: {
    subtitle: 'Visit planned',
    statHint: 'Visit planned',
    borderClass: 'border-t-primary-600',
    iconBg: 'bg-primary-50',
    iconColor: 'text-primary-600',
  },
  interested: {
    subtitle: 'High potential',
    statHint: 'High potential',
    borderClass: 'border-t-primary-400',
    iconBg: 'bg-primary-50',
    iconColor: 'text-primary-500',
  },
  registered: {
    subtitle: 'Ready to enroll',
    statHint: 'Ready to enroll',
    borderClass: 'border-t-primary-300',
    iconBg: 'bg-primary-50',
    iconColor: 'text-primary-600',
  },
  enrolled: {
    subtitle: 'Successfully enrolled',
    statHint: 'Enrolled',
    borderClass: 'border-t-primary-600',
    iconBg: 'bg-primary-100',
    iconColor: 'text-primary-700',
  },
  lost: {
    subtitle: 'Did not enroll',
    statHint: 'Lost leads',
    borderClass: 'border-t-primary-900',
    iconBg: 'bg-primary-50',
    iconColor: 'text-primary-800',
  },
  on_hold: {
    subtitle: 'Paused follow-up',
    statHint: 'On hold',
    borderClass: 'border-t-primary-200',
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
  },
};

export interface InquiryCardTag {
  label: string;
  className: string;
}

export function formatInquiryRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatInquiryDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function getInquiryCardTags(inquiry: {
  status: InquiryStatus;
  priority: string;
  converted_student_id?: number | null;
}): InquiryCardTag[] {
  const tags: InquiryCardTag[] = [];

  if (inquiry.priority === 'high' || inquiry.status === 'interested') {
    tags.push({
      label: inquiry.status === 'interested' ? 'High Potential' : 'High Priority',
      className: 'bg-primary-50 text-primary-700 ring-1 ring-primary-200',
    });
  }

  if (inquiry.status === 'registered' && !inquiry.converted_student_id) {
    tags.push({
      label: 'Ready to Enroll',
      className: 'bg-primary-100 text-primary-800 ring-1 ring-primary-300',
    });
  }

  if (inquiry.status === 'enrolled') {
    tags.push({
      label: 'Enrolled',
      className: 'bg-primary-50 text-primary-700 ring-1 ring-primary-200',
    });
  }

  if (inquiry.status === 'lost') {
    tags.push({
      label: 'Lost',
      className: 'bg-primary-50 text-primary-900 ring-1 ring-primary-300',
    });
  }

  return tags;
}

export function formatInquiryNumber(inquiryNumber: string): string {
  return inquiryNumber.startsWith('#') ? inquiryNumber : `#${inquiryNumber}`;
}

/** Card surface + border tint for inquiry tiles */
export const STATUS_CARD_STYLES: Record<InquiryStatus, string> = {
  new: 'bg-primary-50 border-primary-200 hover:bg-primary-100/80',
  contacted: 'bg-primary-50 border-primary-200 hover:bg-primary-100/80',
  visit_scheduled: 'bg-primary-50 border-primary-200 hover:bg-primary-100/80',
  interested: 'bg-primary-50 border-primary-300 hover:bg-primary-100/80',
  registered: 'bg-primary-50 border-primary-300 hover:bg-primary-100/80',
  enrolled: 'bg-primary-50 border-primary-300 hover:bg-primary-100/80',
  lost: 'bg-primary-50 border-primary-300 hover:bg-primary-100/80',
  on_hold: 'bg-gray-50 border-gray-200 hover:bg-gray-100/80',
};

/** Column background for terminal status groups */
export const TERMINAL_COLUMN_STYLES: Record<
  (typeof TERMINAL_STATUSES)[number],
  string
> = {
  enrolled: 'bg-primary-50/60 ring-1 ring-primary-200',
  lost: 'bg-primary-50/60 ring-1 ring-primary-300',
  on_hold: 'bg-gray-50 ring-1 ring-gray-200',
};

export const SOURCE_LABELS: Record<InquirySource, string> = {
  walk_in: 'Walk-in',
  phone: 'Phone',
  website: 'Website',
  referral: 'Referral',
  social_media: 'Social Media',
  other: 'Other',
};

export const PARENT_RELATION_LABELS: Record<'father' | 'mother', string> = {
  father: 'Father',
  mother: 'Mother',
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
