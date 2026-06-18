'use client'

import { useEffect, type ReactNode } from 'react'
import { applyThemeToDocument, DEFAULT_THEME_SETTINGS, mergeThemeSettings } from '@edulakhya/utils'

export function PortalThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    let cancelled = false

    fetch('/api/theme')
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return
        const theme = data?.success ? mergeThemeSettings(data.data) : DEFAULT_THEME_SETTINGS
        applyThemeToDocument(theme)
      })
      .catch(() => {
        if (!cancelled) applyThemeToDocument(DEFAULT_THEME_SETTINGS)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return <>{children}</>
}
