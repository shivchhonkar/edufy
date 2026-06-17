'use client'

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { PortalPermissionMap } from '@/lib/portal-access'
import { getClientUser } from '@/lib/client-auth'

type StaffAccessState = {
  loaded: boolean
  is_admin: boolean
  portal_access_enabled: boolean
  effective_permissions: PortalPermissionMap
}

const defaultState: StaffAccessState = {
  loaded: false,
  is_admin: false,
  portal_access_enabled: false,
  effective_permissions: {},
}

const StaffAccessContext = createContext<StaffAccessState>(defaultState)

export function StaffAccessProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StaffAccessState>(defaultState)

  useEffect(() => {
    const user = getClientUser()
    const role = String(user?.role || '')

    if (['super_admin', 'admin', 'transport_manager'].includes(role)) {
      setState({
        loaded: true,
        is_admin: true,
        portal_access_enabled: true,
        effective_permissions: {},
      })
      return
    }

    fetch('/api/access/staff-portal/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setState({
            loaded: true,
            is_admin: !!data.data.is_admin,
            portal_access_enabled: data.data.portal_access_enabled !== false,
            effective_permissions: data.data.effective_permissions || {},
          })
        } else {
          setState({ ...defaultState, loaded: true })
        }
      })
      .catch(() => setState({ ...defaultState, loaded: true }))
  }, [])

  return (
    <StaffAccessContext.Provider value={state}>{children}</StaffAccessContext.Provider>
  )
}

export function useStaffAccess() {
  return useContext(StaffAccessContext)
}
