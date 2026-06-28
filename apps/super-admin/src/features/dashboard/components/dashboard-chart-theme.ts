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

export const FEE_REVENUE_BAR_COLORS = {
  due: DASHBOARD_CHART_THEME.primaryDark,
  received: DASHBOARD_CHART_THEME.primary,
  discount: DASHBOARD_CHART_THEME.secondary,
};
