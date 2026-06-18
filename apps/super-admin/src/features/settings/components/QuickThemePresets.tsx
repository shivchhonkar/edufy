'use client'

import { FiCheck } from 'react-icons/fi'
import { THEME_PRESETS, type ThemePresetId, type ThemeSettings } from '@/lib/theme-settings'

interface QuickThemePresetsProps {
  activePresetId: ThemePresetId | null
  onApply: (settings: ThemeSettings, presetId: ThemePresetId) => void
}

export default function QuickThemePresets({ activePresetId, onApply }: QuickThemePresetsProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Quick Themes</h2>
        <p className="mt-1 text-sm text-gray-500">
          Apply a professional preset in one click. Save afterward to make it the default.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {THEME_PRESETS.map((preset) => {
          const isActive = activePresetId === preset.id

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApply(preset.settings, preset.id)}
              className={`group relative overflow-hidden rounded-xl border p-4 text-left transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                isActive
                  ? 'border-primary-500 bg-primary-50/40 ring-1 ring-primary-500'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
              aria-pressed={isActive}
            >
              <div className="mb-3 flex h-10 overflow-hidden rounded-lg border border-gray-200 shadow-inner">
                {preset.swatches.map((color, index) => (
                  <span
                    key={`${preset.id}-${index}`}
                    className="h-full flex-1"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{preset.name}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{preset.description}</p>
                </div>
                {isActive && (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white">
                    <FiCheck size={14} />
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function matchActivePreset(theme: ThemeSettings): ThemePresetId | null {
  for (const preset of THEME_PRESETS) {
    const keys = Object.keys(preset.settings) as (keyof ThemeSettings)[]
    const matches = keys.every(
      (key) => preset.settings[key].toLowerCase() === theme[key].toLowerCase(),
    )
    if (matches) return preset.id
  }
  return null
}
