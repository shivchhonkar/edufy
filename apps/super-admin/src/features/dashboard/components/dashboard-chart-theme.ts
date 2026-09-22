/** Chart colors aligned with globals.css theme tokens */
export const DASHBOARD_CHART_THEME = {
  primary: '#2380D6',
  primaryDark: '#0D3D75',
  primaryMid: '#1A73C7',
  secondary: '#4DC4F0',
  light: '#6BC0ED',
  lighter: '#A3D5F3',
  pale: '#D1EAF9',
  muted: '#64748b',
} as const;

export const DASHBOARD_CHART_PALETTE = [
  DASHBOARD_CHART_THEME.primaryDark,
  DASHBOARD_CHART_THEME.primary,
  DASHBOARD_CHART_THEME.primaryMid,
  DASHBOARD_CHART_THEME.secondary,
  DASHBOARD_CHART_THEME.light,
  DASHBOARD_CHART_THEME.lighter,
  DASHBOARD_CHART_THEME.primaryDark,
  DASHBOARD_CHART_THEME.primary,
];

export const FEE_COLLECTION_COLORS = {
  expected: DASHBOARD_CHART_THEME.primaryDark,
  received: DASHBOARD_CHART_THEME.primary,
  due: DASHBOARD_CHART_THEME.secondary,
};

export const PIPELINE_STATUS_COLORS: Record<string, string> = {
  enrolled: '#14b8a6',
  admitted: '#14b8a6',
  waitlisted: '#eab308',
  waiting: '#eab308',
  contacted: '#3b82f6',
  'on hold': '#f97316',
  hold: '#f97316',
  new: '#6366f1',
  follow: '#8b5cf6',
  rejected: '#f43f5e',
};

export function pipelineColor(name: string, fallback: string) {
  const key = name.trim().toLowerCase();
  return PIPELINE_STATUS_COLORS[key] ?? fallback;
}
