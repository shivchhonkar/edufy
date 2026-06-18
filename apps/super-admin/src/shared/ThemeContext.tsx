'use client'

import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  DEFAULT_THEME_SETTINGS,
  applyThemeToDocument,
  mergeThemeSettings,
  type ThemeSettings,
} from '@/lib/theme-settings'

interface ThemeContextType {
  theme: ThemeSettings
  loading: boolean
  refreshTheme: () => Promise<void>
  applyTheme: (next: ThemeSettings) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: DEFAULT_THEME_SETTINGS,
  loading: true,
  refreshTheme: async () => {},
  applyTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME_SETTINGS)
  const [loading, setLoading] = useState(true)

  const applyTheme = useCallback((next: ThemeSettings) => {
    const merged = mergeThemeSettings(next)
    setTheme(merged)
    applyThemeToDocument(merged)
  }, [])

  const fetchTheme = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/theme')
      const data = await response.json()
      if (data.success) {
        applyTheme(data.data)
      } else {
        applyTheme(DEFAULT_THEME_SETTINGS)
      }
    } catch (error) {
      console.error('Error fetching theme settings:', error)
      applyTheme(DEFAULT_THEME_SETTINGS)
    } finally {
      setLoading(false)
    }
  }, [applyTheme])

  useEffect(() => {
    fetchTheme()
  }, [fetchTheme])

  const refreshTheme = useCallback(async () => {
    setLoading(true)
    await fetchTheme()
  }, [fetchTheme])

  return (
    <ThemeContext.Provider value={{ theme, loading, refreshTheme, applyTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
