export function dashboardStatCardClass(interactive?: boolean) {
  return [
    'dashboard-stat-card rounded-xl p-3.5 flex flex-col h-full min-h-0',
    interactive ? 'dashboard-stat-card-clickable cursor-pointer' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export const dashboardStatTitleClass =
  'text-[11px] font-semibold uppercase tracking-wide text-[var(--theme-primary-800)]';

export const dashboardStatHeadingClass =
  'text-sm font-medium text-[var(--theme-primary-800)]';

export const dashboardStatValueClass =
  'text-[var(--theme-brand-dark)] leading-tight';

export const dashboardStatDividerClass = 'border-t border-[var(--theme-primary-100)]';

export const dashboardStatMutedClass = 'text-[var(--theme-muted-font)]';
