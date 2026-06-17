'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/shared/components/layout/DashboardLayout'
import SettingsNav from '@/features/settings/components/SettingsNav'
import PortalModuleToggles from '@/features/settings/components/PortalModuleToggles'
import {
  STAFF_ESS_MODULES,
  STAFF_EXTERNAL_PORTALS,
  buildStaffPortalUrl,
  staffPortalSummary,
  type PortalPermissionMap,
} from '@/lib/portal-access'
import { useDialog } from '@/shared/context/DialogContext'
import { FiEye, FiEyeOff, FiKey, FiRefreshCw, FiSave, FiSearch, FiUserCheck } from 'react-icons/fi'

interface Department {
  id: number
  name: string
}

interface StaffRow {
  id: number
  first_name: string
  last_name: string
  employee_id: string
  email?: string
  login_email?: string
  has_login_password?: boolean
  department_name?: string
  designation_name?: string
  portal_access_enabled: boolean
  effective_permissions: PortalPermissionMap
}

export default function StaffAccessPage() {
  const { alert, confirm } = useDialog()
  const [defaults, setDefaults] = useState<PortalPermissionMap>({})
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)
  const [savingDefaults, setSavingDefaults] = useState(false)
  const [departmentId, setDepartmentId] = useState('')
  const [search, setSearch] = useState('')
  const [accessStatus, setAccessStatus] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [editStaff, setEditStaff] = useState<StaffRow | null>(null)
  const [editPermissions, setEditPermissions] = useState<PortalPermissionMap>({})
  const [editEnabled, setEditEnabled] = useState(true)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    fetch('/api/departments?active_only=true')
      .then((r) => r.json())
      .then((d) => d.success && setDepartments(d.data))
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (departmentId) params.set('department_id', departmentId)
    if (search.trim()) params.set('search', search.trim())
    if (accessStatus) params.set('access_status', accessStatus)
    const res = await fetch(`/api/access/staff-portal?${params}`)
    const data = await res.json()
    if (data.success) {
      setDefaults(data.data.defaults)
      setStaff(data.data.staff)
    }
    setLoading(false)
  }, [departmentId, search, accessStatus])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const saveDefaults = async () => {
    setSavingDefaults(true)
    const res = await fetch('/api/access/staff-portal', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaults }),
    })
    const data = await res.json()
    setSavingDefaults(false)
    if (data.success) await alert('Default ESS access saved for all staff', { type: 'success' })
    else await alert(data.error || 'Failed to save', { type: 'error' })
  }

  const openEdit = (row: StaffRow) => {
    setEditStaff(row)
    setEditPermissions({ ...row.effective_permissions })
    setEditEnabled(row.portal_access_enabled !== false)
    setLoginEmail(row.login_email || row.email || '')
    setLoginPassword('')
    setShowLoginPassword(false)
  }

  const saveStaffPassword = async () => {
    if (!editStaff) return
    if (!loginEmail.trim()) {
      await alert('Login email is required', { type: 'warning' })
      return
    }
    if (loginPassword.length < 6) {
      await alert('Password must be at least 6 characters', { type: 'warning' })
      return
    }
    setSavingPassword(true)
    const res = await fetch(`/api/access/staff-portal/${editStaff.id}/login-password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
    })
    const data = await res.json()
    setSavingPassword(false)
    if (data.success) {
      setLoginPassword('')
      await fetchData()
      setEditStaff((prev) =>
        prev
          ? {
              ...prev,
              login_email: data.data.login_email,
              has_login_password: true,
              email: data.data.login_email,
            }
          : prev,
      )
      await alert('Login password saved. Staff can sign in to enabled portals.', { type: 'success' })
    } else {
      await alert(data.error || 'Failed to save password', { type: 'error' })
    }
  }

  const disableStaffLogin = async (row: StaffRow) => {
    const ok = await confirm(
      `Disable portal login for ${staffName(row)}? They will not be able to sign in until a new password is set.`,
      { title: 'Disable Login', type: 'danger', confirmText: 'Disable' },
    )
    if (!ok) return
    const res = await fetch(`/api/access/staff-portal/${row.id}/login-password`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      await fetchData()
      if (editStaff?.id === row.id) {
        setEditStaff({ ...row, has_login_password: false })
      }
      await alert('Portal login disabled', { type: 'success' })
    } else {
      await alert(data.error || 'Failed to disable login', { type: 'error' })
    }
  }

  const saveStaffAccess = async () => {
    if (!editStaff) return
    const res = await fetch(`/api/access/staff-portal/${editStaff.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portal_access_enabled: editEnabled,
        portal_permissions: editPermissions,
      }),
    })
    const data = await res.json()
    if (data.success) {
      setEditStaff(null)
      await fetchData()
      await alert('Staff access updated', { type: 'success' })
    } else {
      await alert(data.error || 'Failed to update', { type: 'error' })
    }
  }

  const bulkToggle = async (enabled: boolean) => {
    const res = await fetch('/api/access/staff-portal/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        department_id: departmentId || undefined,
        staff_ids: departmentId ? undefined : selectedIds,
        portal_access_enabled: enabled,
      }),
    })
    const data = await res.json()
    if (data.success) {
      await fetchData()
      await alert(data.message, { type: 'success' })
    } else {
      await alert(data.error || 'Bulk update failed', { type: 'error' })
    }
  }

  const staffName = (s: StaffRow) => `${s.first_name} ${s.last_name}`.trim()

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <SettingsNav />
        <div>
          <h1 className="text-xl text-gray-900 flex items-center gap-2">
            <FiUserCheck className="text-primary-600" />
            Staff Access
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage portal access, set login passwords, and control Transport, Fees, and Inventory portals.
          </p>
        </div>

        <div className="bg-white border rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Default access</h2>
              <p className="text-sm text-gray-500">Applies to all staff unless overridden individually.</p>
            </div>
            <button
              type="button"
              onClick={saveDefaults}
              disabled={savingDefaults}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50"
            >
              <FiSave size={14} />
              {savingDefaults ? 'Saving...' : 'Save Defaults'}
            </button>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Employee Self Service (in admin app)</h3>
            <PortalModuleToggles
              modules={STAFF_ESS_MODULES}
              value={defaults}
              onChange={setDefaults}
            />
            <p className="text-xs text-gray-500 mt-2">
              Staff use{' '}
              <Link href="/ess" className="text-primary-600 hover:underline">
                Employee Self Service
              </Link>{' '}
              in this admin app.
            </p>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">External staff portals</h3>
            <PortalModuleToggles
              modules={STAFF_EXTERNAL_PORTALS}
              value={defaults}
              onChange={setDefaults}
            />
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
              {STAFF_EXTERNAL_PORTALS.map((portal) => (
                <a
                  key={portal.key}
                  href={buildStaffPortalUrl(portal)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs border rounded-lg px-3 py-2 hover:bg-gray-50 text-primary-700"
                >
                  <span className="font-medium">{portal.label}</span>
                  <span className="block text-gray-500 truncate">{buildStaffPortalUrl(portal)}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap gap-2 items-end justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Per-staff access</h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!departmentId && selectedIds.length === 0}
                onClick={() => bulkToggle(true)}
                className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50"
              >
                Enable selected
              </button>
              <button
                type="button"
                disabled={!departmentId && selectedIds.length === 0}
                onClick={() => bulkToggle(false)}
                className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-sm disabled:opacity-50"
              >
                Disable selected
              </button>
              <button type="button" onClick={fetchData} className="px-3 py-1.5 border rounded-lg text-sm">
                <FiRefreshCw className="inline mr-1" size={14} />
                Refresh
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search staff..."
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              value={accessStatus}
              onChange={(e) => setAccessStatus(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">All access</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>

          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={staff.length > 0 && selectedIds.length === staff.length}
                      onChange={() =>
                        setSelectedIds(
                          selectedIds.length === staff.length ? [] : staff.map((s) => s.id),
                        )
                      }
                    />
                  </th>
                  <th className="text-left px-3 py-3">Staff</th>
                  <th className="text-left px-3 py-3">Department</th>
                  <th className="text-left px-3 py-3">Login</th>
                  <th className="text-left px-3 py-3">ESS</th>
                  <th className="text-left px-3 py-3">Portals</th>
                  <th className="text-right px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-gray-400">
                      Loading...
                    </td>
                  </tr>
                ) : staff.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-gray-400">
                      No staff found
                    </td>
                  </tr>
                ) : (
                  staff.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.id)}
                          onChange={() =>
                            setSelectedIds((prev) =>
                              prev.includes(row.id)
                                ? prev.filter((id) => id !== row.id)
                                : [...prev, row.id],
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium">{staffName(row)}</p>
                        <p className="text-xs text-gray-500">{row.employee_id}</p>
                      </td>
                      <td className="px-3 py-3 text-gray-600">
                        {row.department_name || '—'}
                        {row.designation_name ? ` · ${row.designation_name}` : ''}
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-xs text-gray-600 truncate max-w-[160px]">
                          {row.login_email || row.email || 'No email'}
                        </p>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${
                            row.has_login_password
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {row.has_login_password ? 'Password set' : 'Not set'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            row.portal_access_enabled !== false
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {row.portal_access_enabled !== false ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 max-w-[200px]">
                        {row.portal_access_enabled !== false
                          ? staffPortalSummary(row.effective_permissions)
                          : '—'}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                          >
                            Manage
                          </button>
                          {row.has_login_password && (
                            <button
                              type="button"
                              onClick={() => disableStaffLogin(row)}
                              className="px-2 py-1 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50"
                            >
                              Disable login
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {editStaff && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold">Manage access — {staffName(editStaff)}</h3>

              <div className="rounded-lg border bg-gray-50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                  <FiKey className="text-primary-600" />
                  Portal login
                </div>
                <p className="text-xs text-gray-500">
                  Staff use this email and password to sign in to Transport, Fees, and Inventory portals.
                </p>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Login email</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="staff@school.com"
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {editStaff.has_login_password ? 'New password' : 'Password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full px-3 py-2 pr-10 border rounded-lg text-sm bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-2.5 text-gray-400"
                    >
                      {showLoginPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={saveStaffPassword}
                    disabled={savingPassword}
                    className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50"
                  >
                    {savingPassword ? 'Saving...' : editStaff.has_login_password ? 'Update Password' : 'Set Password'}
                  </button>
                  {editStaff.has_login_password && (
                    <button
                      type="button"
                      onClick={() => disableStaffLogin(editStaff)}
                      className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-sm"
                    >
                      Disable login
                    </button>
                  )}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editEnabled}
                  onChange={(e) => setEditEnabled(e.target.checked)}
                />
                Staff access enabled
              </label>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">ESS modules</h4>
                <PortalModuleToggles
                  modules={STAFF_ESS_MODULES}
                  value={editPermissions}
                  onChange={setEditPermissions}
                  disabled={!editEnabled}
                />
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">External portals</h4>
                <PortalModuleToggles
                  modules={STAFF_EXTERNAL_PORTALS}
                  value={editPermissions}
                  onChange={setEditPermissions}
                  disabled={!editEnabled}
                />
                {editEnabled && (
                  <ul className="mt-2 space-y-1 text-xs text-gray-500">
                    {STAFF_EXTERNAL_PORTALS.filter(
                      (p) => editPermissions[p.key] !== false,
                    ).map((portal) => (
                      <li key={portal.key}>
                        {portal.label}:{' '}
                        <a
                          href={buildStaffPortalUrl(portal)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:underline"
                        >
                          {buildStaffPortalUrl(portal)}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setEditStaff(null)} className="px-4 py-2 border rounded-lg text-sm">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveStaffAccess}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
