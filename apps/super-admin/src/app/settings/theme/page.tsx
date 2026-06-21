'use client'

import { useCallback, useEffect, useState } from 'react'
import DashboardLayout from '@/shared/components/layout/DashboardLayout'
import SettingsNav from '@/features/settings/components/SettingsNav'
import {
  DEFAULT_THEME_SETTINGS,
  THEME_COLOR_FIELDS,
  type ThemePresetId,
  type ThemeSettings,
} from '@/lib/theme-settings'
import QuickThemePresets, { matchActivePreset } from '@/features/settings/components/QuickThemePresets'
import { useTheme } from '@/shared/ThemeContext'
import { FiCheckCircle, FiRefreshCw, FiRotateCcw, FiSave } from 'react-icons/fi'

function ColorField({
  label,
  description,
  value,
  onChange,
  showPicker = true,
}: {
  label: string
  description: string
  value: string
  onChange: (value: string) => void
  showPicker?: boolean
}) {
  const pickerValue = value.startsWith('#') ? value.slice(0, 7) : '#0D3D75'

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {showPicker && (
            <input
              type="color"
              value={pickerValue}
              onChange={(e) => onChange(e.target.value)}
              className="h-10 w-10 cursor-pointer rounded-lg border border-gray-200 bg-white p-1"
              aria-label={`${label} color picker`}
            />
          )}
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  )
}

function ThemePreview({ theme }: { theme: ThemeSettings }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm"
      style={{ backgroundColor: theme.background_color }}
    >
      <div className="flex min-h-[280px]">
        <div
          className="w-40 shrink-0 p-4"
          style={{
            backgroundColor: theme.sidebar_background,
            color: theme.sidebar_text_color,
          }}
        >
          <div className="mb-4 text-xs font-semibold uppercase tracking-wide opacity-80">Edufy</div>
          <div
            className="mb-2 rounded-lg px-3 py-2 text-sm font-medium"
            style={{
              backgroundColor: theme.sidebar_active_background,
              color: theme.sidebar_active_text,
            }}
          >
            Dashboard
          </div>
          <div className="rounded-lg px-3 py-2 text-sm opacity-80">Students</div>
          <div className="rounded-lg px-3 py-2 text-sm opacity-80">Finance</div>
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="border-b px-4 py-3"
            style={{
              backgroundColor: theme.header_background,
              borderColor: '#e5e7eb',
            }}
          >
            <p className="text-sm font-semibold" style={{ color: theme.font_color }}>
              Good Morning, Admin
            </p>
            <p className="text-xs" style={{ color: theme.muted_font_color }}>
              Theme preview
            </p>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <div
              className="rounded-xl p-4 shadow-sm"
              style={{ backgroundColor: theme.surface_color, color: theme.font_color }}
            >
              <p className="text-xs font-medium" style={{ color: theme.muted_font_color }}>
                Attendance
              </p>
              <p className="mt-1 text-2xl font-bold">92%</p>
              <div
                className="mt-3 h-2 rounded-full"
                style={{ backgroundColor: `${theme.secondary_color}33` }}
              >
                <div
                  className="h-2 rounded-full"
                  style={{ width: '92%', backgroundColor: theme.secondary_color }}
                />
              </div>
            </div>
            <div
              className="rounded-xl p-4 shadow-sm"
              style={{ backgroundColor: theme.primary_color, color: '#ffffff' }}
            >
              <p className="text-xs font-medium opacity-80">Primary Card</p>
              <p className="mt-1 text-2xl font-bold">1,248</p>
              <button
                type="button"
                className="mt-3 rounded-lg px-3 py-1.5 text-xs font-semibold"
                style={{ backgroundColor: theme.accent_color, color: '#ffffff' }}
              >
                View details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ThemeSettingsPage() {
  const { theme: savedTheme, applyTheme, refreshTheme } = useTheme()
  const [draft, setDraft] = useState<ThemeSettings>({ ...DEFAULT_THEME_SETTINGS })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [activePresetId, setActivePresetId] = useState<ThemePresetId | null>('default')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/settings/theme')
      const data = await response.json()
      if (data.success) {
        setDraft(data.data)
        setActivePresetId(matchActivePreset(data.data))
        applyTheme(data.data)
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load theme settings' })
    } finally {
      setLoading(false)
    }
  }, [applyTheme])

  useEffect(() => {
    load()
  }, [load])

  const updateField = (key: keyof ThemeSettings, value: string) => {
    const next = { ...draft, [key]: value }
    setDraft(next)
    setActivePresetId(matchActivePreset(next))
    applyTheme(next)
  }

  const handleApplyPreset = (settings: ThemeSettings, presetId: ThemePresetId) => {
    setDraft(settings)
    setActivePresetId(presetId)
    applyTheme(settings)
    setMessage(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch('/api/settings/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await response.json()
      if (data.success) {
        setDraft(data.data)
        setActivePresetId(matchActivePreset(data.data))
        applyTheme(data.data)
        await refreshTheme()
        setMessage({ type: 'success', text: 'Theme settings saved successfully' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save theme settings' })
        applyTheme(savedTheme)
        setDraft(savedTheme)
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save theme settings' })
      applyTheme(savedTheme)
      setDraft(savedTheme)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    setResetting(true)
    setMessage(null)
    try {
      const response = await fetch('/api/settings/theme', { method: 'DELETE' })
      const data = await response.json()
      if (data.success) {
        setDraft(data.data)
        setActivePresetId('default')
        applyTheme(data.data)
        await refreshTheme()
        setMessage({ type: 'success', text: 'Theme reset to Edufy default' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to reset theme' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to reset theme' })
    } finally {
      setResetting(false)
    }
  }

  const handleDiscard = () => {
    setDraft(savedTheme)
    setActivePresetId(matchActivePreset(savedTheme))
    applyTheme(savedTheme)
    setMessage(null)
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Theme Settings</h1>
          <p className="mt-1 text-sm text-gray-600">
            Customize colors for the super-admin portal. The Edufy default theme is applied on first
            load.
          </p>
        </div>

        {/* <SettingsNav /> */}

        {message && (
          <div
            className={`mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.type === 'success' && <FiCheckCircle className="shrink-0" />}
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <FiRefreshCw className="mr-2 animate-spin" />
            Loading theme settings...
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <div className="space-y-4">
              <QuickThemePresets activePresetId={activePresetId} onApply={handleApplyPreset} />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-900">Color Palette</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleDiscard}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Discard changes
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={resetting}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    <FiRotateCcw className={resetting ? 'animate-spin' : ''} />
                    Reset to default
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                  >
                    <FiSave />
                    {saving ? 'Saving...' : 'Save theme'}
                  </button>
                </div>
              </div>

              <div className="grid gap-3">
                {THEME_COLOR_FIELDS.map((field) => (
                  <ColorField
                    key={field.key}
                    label={field.label}
                    description={field.description}
                    value={draft[field.key]}
                    onChange={(value) => updateField(field.key, value)}
                    showPicker={field.key !== 'sidebar_active_background'}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Live Preview</h2>
              <ThemePreview theme={draft} />
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                Changes preview instantly across the app. Click <strong>Save theme</strong> to set
                the default for all admin users.
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
