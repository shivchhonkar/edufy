'use client'

import type { PortalPermissionMap } from '@/lib/portal-access'

interface Module {
  key: string
  label: string
}

interface Props {
  modules: readonly Module[]
  value: PortalPermissionMap
  onChange: (next: PortalPermissionMap) => void
  disabled?: boolean
  compact?: boolean
}

export default function PortalModuleToggles({
  modules,
  value,
  onChange,
  disabled,
  compact,
}: Props) {
  return (
    <div className={`flex flex-wrap gap-2 ${compact ? '' : 'gap-3'}`}>
      {modules.map((module) => {
        const checked = value[module.key] !== false
        return (
          <label
            key={module.key}
            className={`inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm ${
              checked ? 'border-primary-200 bg-primary-50 text-primary-800' : 'border-gray-200 text-gray-600'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, [module.key]: e.target.checked })}
              className="rounded border-gray-300 text-primary-600"
            />
            {module.label}
          </label>
        )
      })}
    </div>
  )
}
