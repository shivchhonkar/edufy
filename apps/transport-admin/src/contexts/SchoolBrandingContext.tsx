'use client'

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { DEFAULT_FAVICON, TRANSPORT_PORTAL_LABEL } from '@/lib/site-seo'

export type SchoolBranding = {
  school_name: string
  logo_url: string
  favicon_url: string
}

const defaultBranding: SchoolBranding = {
  school_name: 'School',
  logo_url: '',
  favicon_url: DEFAULT_FAVICON,
}

const SchoolBrandingContext = createContext<{
  branding: SchoolBranding
  loading: boolean
}>({
  branding: defaultBranding,
  loading: true,
})

export function SchoolBrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<SchoolBranding>(defaultBranding)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/school-info')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setBranding(data.data)
          document.title = `${data.data.school_name} — ${TRANSPORT_PORTAL_LABEL}`
          const favicon = data.data.favicon_url || DEFAULT_FAVICON
          let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null
          if (!link) {
            link = document.createElement('link')
            link.rel = 'icon'
            document.head.appendChild(link)
          }
          link.href = favicon
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <SchoolBrandingContext.Provider value={{ branding, loading }}>
      {children}
    </SchoolBrandingContext.Provider>
  )
}

export function useSchoolBranding() {
  return useContext(SchoolBrandingContext)
}
