export interface ThemeSettings {
  primary_color: string
  secondary_color: string
  accent_color: string
  background_color: string
  surface_color: string
  font_color: string
  muted_font_color: string
  sidebar_background: string
  sidebar_text_color: string
  sidebar_active_background: string
  sidebar_active_text: string
  header_background: string
}

/** Default Edufy dashboard theme — dark blue sidebar, teal accent, light workspace. */
export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  primary_color: '#0D3D75',
  secondary_color: '#4DC4F0',
  accent_color: '#2380D6',
  background_color: '#f4f7f9',
  surface_color: '#ffffff',
  font_color: '#111827',
  muted_font_color: '#6b7280',
  sidebar_background: '#0D3D75',
  sidebar_text_color: '#ffffff',
  sidebar_active_background: 'rgba(77, 196, 240, 0.18)',
  sidebar_active_text: '#4DC4F0',
  header_background: '#ffffff',
}

export type ThemePresetId = 'default' | 'grey' | 'light' | 'dark' | 'black-white' | 'classic'

export interface ThemePreset {
  id: ThemePresetId
  name: string
  description: string
  swatches: [string, string, string]
  settings: ThemeSettings
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Edufy brand — navy sidebar with teal accents.',
    swatches: ['#0D3D75', '#4DC4F0', '#f4f7f9'],
    settings: { ...DEFAULT_THEME_SETTINGS },
  },
  {
    id: 'grey',
    name: 'Grey',
    description: 'Neutral slate tones for a corporate, understated look.',
    swatches: ['#1F2937', '#6B7280', '#F3F4F6'],
    settings: {
      primary_color: '#374151',
      secondary_color: '#9CA3AF',
      accent_color: '#4B5563',
      background_color: '#F3F4F6',
      surface_color: '#FFFFFF',
      font_color: '#111827',
      muted_font_color: '#6B7280',
      sidebar_background: '#1F2937',
      sidebar_text_color: '#F9FAFB',
      sidebar_active_background: 'rgba(255, 255, 255, 0.1)',
      sidebar_active_text: '#E5E7EB',
      header_background: '#FFFFFF',
    },
  },
  {
    id: 'light',
    name: 'Light',
    description: 'Bright, airy workspace with soft blue highlights.',
    swatches: ['#FFFFFF', '#3B82F6', '#F8FAFC'],
    settings: {
      primary_color: '#1E40AF',
      secondary_color: '#93C5FD',
      accent_color: '#3B82F6',
      background_color: '#F8FAFC',
      surface_color: '#FFFFFF',
      font_color: '#0F172A',
      muted_font_color: '#64748B',
      sidebar_background: '#FFFFFF',
      sidebar_text_color: '#334155',
      sidebar_active_background: 'rgba(59, 130, 246, 0.12)',
      sidebar_active_text: '#2563EB',
      header_background: '#FFFFFF',
    },
  },
  {
    id: 'dark',
    name: 'Dark',
    description: 'Modern dark mode with cyan accents for low-light use.',
    swatches: ['#020617', '#38BDF8', '#0F172A'],
    settings: {
      primary_color: '#0F172A',
      secondary_color: '#38BDF8',
      accent_color: '#0EA5E9',
      background_color: '#0F172A',
      surface_color: '#1E293B',
      font_color: '#F1F5F9',
      muted_font_color: '#94A3B8',
      sidebar_background: '#020617',
      sidebar_text_color: '#E2E8F0',
      sidebar_active_background: 'rgba(56, 189, 248, 0.15)',
      sidebar_active_text: '#38BDF8',
      header_background: '#1E293B',
    },
  },
  {
    id: 'black-white',
    name: 'Black & White',
    description: 'Minimal monochrome — sharp contrast, zero distraction.',
    swatches: ['#000000', '#525252', '#FFFFFF'],
    settings: {
      primary_color: '#000000',
      secondary_color: '#525252',
      accent_color: '#171717',
      background_color: '#FFFFFF',
      surface_color: '#FAFAFA',
      font_color: '#0A0A0A',
      muted_font_color: '#737373',
      sidebar_background: '#000000',
      sidebar_text_color: '#FFFFFF',
      sidebar_active_background: 'rgba(255, 255, 255, 0.12)',
      sidebar_active_text: '#FFFFFF',
      header_background: '#FFFFFF',
    },
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional navy and gold — timeless school aesthetic.',
    swatches: ['#1E3A5F', '#C9A227', '#F5F0E8'],
    settings: {
      primary_color: '#1E3A5F',
      secondary_color: '#C9A227',
      accent_color: '#1E40AF',
      background_color: '#F5F0E8',
      surface_color: '#FFFBF5',
      font_color: '#1C1917',
      muted_font_color: '#78716C',
      sidebar_background: '#1E3A5F',
      sidebar_text_color: '#FAFAF9',
      sidebar_active_background: 'rgba(201, 162, 39, 0.2)',
      sidebar_active_text: '#F5D565',
      header_background: '#FFFBF5',
    },
  },
]

export function getThemePreset(id: ThemePresetId): ThemePreset | undefined {
  return THEME_PRESETS.find((preset) => preset.id === id)
}

export const THEME_COLOR_FIELDS: {
  key: keyof ThemeSettings
  label: string
  description: string
}[] = [
  {
    key: 'primary_color',
    label: 'Primary Color',
    description: 'Main brand color for buttons, links, and highlights.',
  },
  {
    key: 'secondary_color',
    label: 'Secondary Color',
    description: 'Accent color for charts, icons, and active navigation.',
  },
  {
    key: 'accent_color',
    label: 'Accent Color',
    description: 'Used for primary actions and interactive elements.',
  },
  {
    key: 'background_color',
    label: 'Page Background',
    description: 'Main workspace background behind cards and panels.',
  },
  {
    key: 'surface_color',
    label: 'Surface / Card Color',
    description: 'Background for cards, modals, and content panels.',
  },
  {
    key: 'font_color',
    label: 'Font Color',
    description: 'Primary text color on light backgrounds.',
  },
  {
    key: 'muted_font_color',
    label: 'Muted Font Color',
    description: 'Secondary labels, captions, and helper text.',
  },
  {
    key: 'sidebar_background',
    label: 'Sidebar Background',
    description: 'Navigation sidebar background color.',
  },
  {
    key: 'sidebar_text_color',
    label: 'Sidebar Text',
    description: 'Default text and icons in the sidebar.',
  },
  {
    key: 'sidebar_active_background',
    label: 'Sidebar Active Background',
    description: 'Background for the currently selected menu item.',
  },
  {
    key: 'sidebar_active_text',
    label: 'Sidebar Active Text',
    description: 'Text color for the active menu item.',
  },
  {
    key: 'header_background',
    label: 'Header Background',
    description: 'Top header bar background color.',
  },
]

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value)
}

function isRgbaColor(value: unknown): value is string {
  return typeof value === 'string' && /^rgba?\(.+\)$/.test(value.trim())
}

function isValidColor(value: unknown): value is string {
  return isHexColor(value) || isRgbaColor(value)
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace('#', '')
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized.slice(0, 6)

  if (!/^[0-9A-Fa-f]{6}$/.test(full)) return null

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('')}`
}

function mixHex(base: string, target: string, weight: number): string {
  const a = hexToRgb(base)
  const b = hexToRgb(target)
  if (!a || !b) return base
  const w = Math.max(0, Math.min(1, weight))
  return rgbToHex(
    a.r + (b.r - a.r) * w,
    a.g + (b.g - a.g) * w,
    a.b + (b.b - a.b) * w,
  )
}

function buildPrimaryScale(base: string): Record<string, string> {
  const white = '#ffffff'
  const black = '#000000'
  return {
    50: mixHex(base, white, 0.92),
    100: mixHex(base, white, 0.84),
    200: mixHex(base, white, 0.68),
    300: mixHex(base, white, 0.52),
    400: mixHex(base, white, 0.28),
    500: mixHex(base, white, 0.12),
    600: base,
    700: mixHex(base, black, 0.12),
    800: mixHex(base, black, 0.28),
    900: mixHex(base, black, 0.44),
  }
}

export function mergeThemeSettings(raw: unknown): ThemeSettings {
  const input = raw && typeof raw === 'object' ? (raw as Partial<ThemeSettings>) : {}
  const merged = { ...DEFAULT_THEME_SETTINGS }

  for (const key of Object.keys(DEFAULT_THEME_SETTINGS) as (keyof ThemeSettings)[]) {
    const value = input[key]
    if (key === 'sidebar_active_background') {
      if (isValidColor(value)) merged[key] = value
      continue
    }
    if (isHexColor(value)) merged[key] = value
  }

  return merged
}

export function applyThemeToDocument(theme: ThemeSettings): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  const primaryScale = buildPrimaryScale(theme.accent_color)

  for (const [shade, color] of Object.entries(primaryScale)) {
    root.style.setProperty(`--theme-primary-${shade}`, color)
  }

  root.style.setProperty('--theme-secondary', theme.secondary_color)
  root.style.setProperty('--theme-accent', theme.accent_color)
  root.style.setProperty('--theme-brand-dark', theme.primary_color)
  root.style.setProperty('--theme-bg', theme.background_color)
  root.style.setProperty('--theme-surface', theme.surface_color)
  root.style.setProperty('--theme-font', theme.font_color)
  root.style.setProperty('--theme-muted-font', theme.muted_font_color)
  root.style.setProperty('--theme-sidebar-bg', theme.sidebar_background)
  root.style.setProperty('--theme-sidebar-text', theme.sidebar_text_color)
  root.style.setProperty('--theme-sidebar-active-bg', theme.sidebar_active_background)
  root.style.setProperty('--theme-sidebar-active-text', theme.sidebar_active_text)
  root.style.setProperty('--theme-header-bg', theme.header_background)
}
