'use client'

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/shared/components/layout/DashboardLayout'
import SettingsNav from '@/features/settings/components/SettingsNav'
import StudentPortalPasswordsPanel from '@/features/settings/components/StudentPortalPasswordsPanel'
import PortalModuleToggles from '@/features/settings/components/PortalModuleToggles'
import { PARENT_PORTAL_MODULES, type PortalPermissionMap } from '@/lib/portal-access'
import { useDialog } from '@/shared/context/DialogContext'
import { FiRefreshCw, FiSave, FiSearch, FiShield, FiUsers } from 'react-icons/fi'

interface ClassOption {
  id: number
  name: string
}

interface PortalStudent {
  id: number
  first_name: string
  last_name: string
  admission_number: string
  parent_phone?: string
  class_name?: string
  section_name?: string
  portal_access_enabled: boolean
  effective_permissions: PortalPermissionMap
  has_portal_password: boolean
}

interface AdminUser {
  id: number
  name: string
  email: string
  role: string
  status: string
}

export default function UserAccessPage() {
  const { alert } = useDialog()
  const [section, setSection] = useState<'portal' | 'admins'>('portal')
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [defaults, setDefaults] = useState<PortalPermissionMap>({})
  const [students, setStudents] = useState<PortalStudent[]>([])
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(false)
  const [savingDefaults, setSavingDefaults] = useState(false)
  const [classId, setClassId] = useState('')
  const [search, setSearch] = useState('')
  const [accessStatus, setAccessStatus] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [editStudent, setEditStudent] = useState<PortalStudent | null>(null)
  const [editPermissions, setEditPermissions] = useState<PortalPermissionMap>({})
  const [editEnabled, setEditEnabled] = useState(true)

  useEffect(() => {
    fetch('/api/classes')
      .then((r) => r.json())
      .then((d) => d.success && setClasses(d.data))
  }, [])

  const fetchPortalData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (classId) params.set('class_id', classId)
    if (search.trim()) params.set('search', search.trim())
    if (accessStatus) params.set('access_status', accessStatus)
    const res = await fetch(`/api/access/parent-portal?${params}`)
    const data = await res.json()
    if (data.success) {
      setDefaults(data.data.defaults)
      setStudents(data.data.students)
    }
    setLoading(false)
  }, [classId, search, accessStatus])

  const fetchAdmins = useCallback(async () => {
    const res = await fetch('/api/access/admin-users')
    const data = await res.json()
    if (data.success) setAdmins(data.data)
  }, [])

  useEffect(() => {
    if (section === 'portal') fetchPortalData()
    else fetchAdmins()
  }, [section, fetchPortalData, fetchAdmins])

  const saveDefaults = async () => {
    setSavingDefaults(true)
    const res = await fetch('/api/access/parent-portal', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaults }),
    })
    const data = await res.json()
    setSavingDefaults(false)
    if (data.success) await alert('Default access saved for all students and parents', { type: 'success' })
    else await alert(data.error || 'Failed to save', { type: 'error' })
  }

  const openEdit = (student: PortalStudent) => {
    setEditStudent(student)
    setEditPermissions({ ...student.effective_permissions })
    setEditEnabled(student.portal_access_enabled !== false)
  }

  const saveStudentAccess = async () => {
    if (!editStudent) return
    const res = await fetch(`/api/access/parent-portal/${editStudent.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portal_access_enabled: editEnabled,
        portal_permissions: editPermissions,
      }),
    })
    const data = await res.json()
    if (data.success) {
      setEditStudent(null)
      await fetchPortalData()
      await alert('Student access updated', { type: 'success' })
    } else {
      await alert(data.error || 'Failed to update', { type: 'error' })
    }
  }

  const toggleAdminStatus = async (user: AdminUser) => {
    const res = await fetch(`/api/users/${user.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: user.status === 'active' ? 'inactive' : 'active' }),
    })
    const data = await res.json()
    if (data.success) fetchAdmins()
    else await alert(data.error || 'Failed to update status', { type: 'error' })
  }

  const bulkToggleAccess = async (enabled: boolean) => {
    const res = await fetch('/api/access/parent-portal/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_id: classId || undefined,
        student_ids: classId ? undefined : selectedIds,
        portal_access_enabled: enabled,
      }),
    })
    const data = await res.json()
    if (data.success) {
      await fetchPortalData()
      await alert(data.message, { type: 'success' })
    } else {
      await alert(data.error || 'Bulk update failed', { type: 'error' })
    }
  }

  const studentName = (s: PortalStudent) => `${s.first_name} ${s.last_name}`.trim()

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* <SettingsNav /> */}
        <div>
          <h1 className="text-xl text-gray-900 flex items-center gap-2">
            <FiShield className="text-primary-600" />
            Parent Portal
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Parent and student portal permissions, passwords, and administrator overview.
          </p>
        </div>

        <div className="flex gap-2 border-b pb-2">
          <button
            type="button"
            onClick={() => setSection('portal')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              section === 'portal' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Parent & Student Portal
          </button>
          <button
            type="button"
            onClick={() => setSection('admins')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              section === 'admins' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <FiUsers size={14} />
            School Administrators
          </button>
        </div>

        {section === 'portal' && (
          <div className="space-y-6">
            <div className="bg-white border rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Default portal modules</h2>
                  <p className="text-sm text-gray-500">
                    Applies to all students and parents unless overridden per student.
                  </p>
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
              <PortalModuleToggles
                modules={PARENT_PORTAL_MODULES}
                value={defaults}
                onChange={setDefaults}
              />
            </div>

            <StudentPortalPasswordsPanel />

            <div className="bg-white border rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap gap-2 items-end justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Per-student access</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!classId && selectedIds.length === 0}
                    onClick={() => bulkToggleAccess(true)}
                    className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50"
                  >
                    Enable selected
                  </button>
                  <button
                    type="button"
                    disabled={!classId && selectedIds.length === 0}
                    onClick={() => bulkToggleAccess(false)}
                    className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-sm disabled:opacity-50"
                  >
                    Disable selected
                  </button>
                  <button type="button" onClick={fetchPortalData} className="px-3 py-1.5 border rounded-lg text-sm">
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
                    placeholder="Search student..."
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="">All classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
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
                <table className="w-full text-sm min-w-[800px]">
                  <thead className="bg-gray-50 border-b sticky top-0 z-10 shrink-0">
                    <tr>
                      <th className="px-3 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={students.length > 0 && selectedIds.length === students.length}
                          onChange={() =>
                            setSelectedIds(
                              selectedIds.length === students.length ? [] : students.map((s) => s.id),
                            )
                          }
                        />
                      </th>
                      <th className="text-left px-3 py-3">Student</th>
                      <th className="text-left px-3 py-3">Class</th>
                      <th className="text-left px-3 py-3">Portal</th>
                      <th className="text-left px-3 py-3">Password</th>
                      <th className="text-right px-3 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-10 text-center text-gray-400">
                          Loading...
                        </td>
                      </tr>
                    ) : students.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-10 text-center text-gray-400">
                          No students found
                        </td>
                      </tr>
                    ) : (
                      students.map((student) => (
                        <tr key={student.id} className="border-b hover:bg-gray-50 sticky top-0 z-10 shrink-0">
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(student.id)}
                              onChange={() =>
                                setSelectedIds((prev) =>
                                  prev.includes(student.id)
                                    ? prev.filter((id) => id !== student.id)
                                    : [...prev, student.id],
                                )
                              }
                            />
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-medium">{studentName(student)}</p>
                            <p className="text-xs text-gray-500">{student.admission_number}</p>
                          </td>
                          <td className="px-3 py-3 text-gray-600">
                            {student.class_name || '—'}
                            {student.section_name ? ` - ${student.section_name}` : ''}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs ${
                                student.portal_access_enabled !== false
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {student.portal_access_enabled !== false ? 'Enabled' : 'Disabled'}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs ${
                                student.has_portal_password
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {student.has_portal_password ? 'Set' : 'Not set'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => openEdit(student)}
                              className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                            >
                              Manage Access
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {section === 'admins' && (
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="p-5 border-b flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">School administrators</h2>
                <p className="text-sm text-gray-500">Control who can access the admin dashboard.</p>
              </div>
              <Link href="/settings?tab=users" className="text-sm text-primary-600 hover:underline">
                Full user management (roles, passwords) →
              </Link>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b sticky top-0 z-10 shrink-0">
                <tr>
                  <th className="text-left px-5 py-3">Name</th>
                  <th className="text-left px-5 py-3">Email</th>
                  <th className="text-left px-5 py-3">Role</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-right px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-gray-400">
                      No administrators found
                    </td>
                  </tr>
                ) : (
                  admins.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50 sticky top-0 z-10 shrink-0">
                      <td className="px-5 py-3 font-medium">{user.name}</td>
                      <td className="px-5 py-3 text-gray-600">{user.email}</td>
                      <td className="px-5 py-3 capitalize">{user.role.replace('_', ' ')}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            user.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => toggleAdminStatus(user)}
                          className="px-3 py-1 text-xs border rounded hover:bg-gray-50"
                        >
                          {user.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {editStudent && (
          <AppModal open={!!editStudent} onClose={() => setEditStudent(null)}>
            <div className={`${APP_MODAL_PANEL} p-6 space-y-4`}>
              <h3 className="text-lg font-semibold">Manage access — {studentName(editStudent)}</h3>
              <p className="text-sm text-gray-500">
                Parents logging in with this student&apos;s phone see the same modules.
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editEnabled}
                  onChange={(e) => setEditEnabled(e.target.checked)}
                />
                Portal access enabled
              </label>
              <PortalModuleToggles
                modules={PARENT_PORTAL_MODULES}
                value={editPermissions}
                onChange={setEditPermissions}
                disabled={!editEnabled}
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setEditStudent(null)} className="px-4 py-2 border rounded-lg text-sm">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveStudentAccess}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm"
                >
                  Save
                </button>
              </div>
            </div>
          </AppModal>
        )}
      </div>
    </DashboardLayout>
  )
}
