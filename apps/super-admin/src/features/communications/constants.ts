export const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All (parents & staff)' },
  { value: 'all_parents', label: 'All parents' },
  { value: 'class_parents', label: 'Parents in a class' },
  { value: 'section_parents', label: 'Parents in a class section' },
  { value: 'all_staff', label: 'All staff' },
] as const;

export type AudienceType = (typeof AUDIENCE_OPTIONS)[number]['value'];

export const CIRCULAR_PRIORITY_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'important', label: 'Important' },
  { value: 'urgent', label: 'Urgent' },
] as const;

export const NOTIFICATION_PRIORITY_OPTIONS = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'urgent', label: 'Urgent' },
] as const;

export function formatAudienceLabel(
  audienceType: string,
  className?: string | null,
  sectionName?: string | null
): string {
  const labels: Record<string, string> = {
    all: 'All (parents & staff)',
    all_parents: 'All parents',
    class_parents: 'Parents in a class',
    section_parents: 'Parents in a class section',
    all_staff: 'All staff',
  };
  const base = labels[audienceType] || audienceType.replace(/_/g, ' ');
  if (className && sectionName) return `${base} · ${className} ${sectionName}`;
  if (className) return `${base} · ${className}`;
  return base;
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN');
}
