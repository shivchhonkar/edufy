'use client'

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useState } from 'react'
import { FiEye, FiEyeOff, FiKey, FiLock, FiRefreshCw, FiSearch } from 'react-icons/fi'
import { useDialog } from '@/shared/context/DialogContext'

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
  has_portal_password: boolean
  portal_password_set_at?: string
}

export default function StudentPortalPasswordsPanel() {
  const { alert, confirm } = useDialog()
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [students, setStudents] = useState<PortalStudent[]>([])
  const [loading, setLoading] = useState(false)
  const [classId, setClassId] = useState('')
  const [search, setSearch] = useState('')
  const [portalStatus, setPortalStatus] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordTarget, setPasswordTarget] = useState<PortalStudent | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)

  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkPassword, setBulkPassword] = useState('')
  const [useAdmissionAsPassword, setUseAdmissionAsPassword] = useState(true)

  useEffect(() => {
    fetch('/api/classes')
      .then((r) => r.json())
      .then((d) => d.success && setClasses(d.data))
      .catch(() => {})
  }, [])

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (classId) params.set('class_id', classId)
    if (search.trim()) params.set('search', search.trim())
    if (portalStatus) params.set('portal_status', portalStatus)
    const res = await fetch(`/api/students/portal-access?${params.toString()}`)
    const data = await res.json()
    if (data.success) {
      setStudents(data.data)
      setSelectedIds((prev) => prev.filter((id) => data.data.some((s: PortalStudent) => s.id === id)))
    }
    setLoading(false)
  }, [classId, search, portalStatus])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  const openSetPassword = (student: PortalStudent) => {
    setPasswordTarget(student)
    setPassword('')
    setShowPassword(false)
    setShowPasswordModal(true)
  }

  const savePassword = async () => {
    if (!passwordTarget || password.length < 6) {
      await alert('Password must be at least 6 characters', { title: 'Validation', type: 'warning' })
      return
    }
    setSaving(true)
    const res = await fetch(`/api/students/${passwordTarget.id}/portal-password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const data = await res.json()
    setSaving(false)
    if (data.success) {
      setShowPasswordModal(false)
      setPasswordTarget(null)
      await fetchStudents()
      await alert('Portal password saved', { title: 'Success', type: 'success' })
    } else {
      await alert(data.error || 'Failed to save password', { title: 'Error', type: 'error' })
    }
  }

  const clearPassword = async (student: PortalStudent) => {
    const ok = await confirm(`Remove portal password for ${student.first_name} ${student.last_name}?`, {
      title: 'Remove Password',
      type: 'danger',
      confirmText: 'Remove',
    })
    if (!ok) return
    const res = await fetch(`/api/students/${student.id}/portal-password`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) await fetchStudents()
    else await alert(data.error || 'Failed to remove password', { title: 'Error', type: 'error' })
  }

  const applyBulk = async () => {
    if (!useAdmissionAsPassword && bulkPassword.length < 6) {
      await alert('Password must be at least 6 characters', { title: 'Validation', type: 'warning' })
      return
    }
    setSaving(true)
    const res = await fetch('/api/students/portal-passwords/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_id: classId || undefined,
        student_ids: classId ? undefined : selectedIds,
        password: bulkPassword,
        use_admission_as_password: useAdmissionAsPassword,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (data.success) {
      setShowBulkModal(false)
      setBulkPassword('')
      await fetchStudents()
      await alert(data.message, { title: 'Success', type: 'success' })
    } else {
      await alert(data.error || 'Bulk update failed', { title: 'Error', type: 'error' })
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === students.length) setSelectedIds([])
    else setSelectedIds(students.map((s) => s.id))
  }

  const studentName = (s: PortalStudent) => `${s.first_name} ${s.last_name}`.trim()

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FiLock className="text-primary-600" />
            Parent Portal Passwords
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Set passwords so students can sign in to the Parent Portal using admission number or parent phone.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            disabled={!classId && selectedIds.length === 0}
            className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50 flex items-center gap-2"
          >
            <FiKey size={14} />
            Bulk Set Passwords
          </button>
          <button
            type="button"
            onClick={fetchStudents}
            className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2"
          >
            <FiRefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, admission no, phone..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm bg-white min-w-[140px]"
        >
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={portalStatus}
          onChange={(e) => setPortalStatus(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm bg-white min-w-[140px]"
        >
          <option value="">All students</option>
          <option value="set">Password set</option>
          <option value="not_set">Password not set</option>
        </select>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-gray-50 border-b sticky top-0 z-10 shrink-0">
            <tr>
              <th className="px-3 py-3 w-10">
                <input
                  type="checkbox"
                  checked={students.length > 0 && selectedIds.length === students.length}
                  onChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </th>
              <th className="text-left px-3 py-3">Student</th>
              <th className="text-left px-3 py-3">Admission No.</th>
              <th className="text-left px-3 py-3">Class</th>
              <th className="text-left px-3 py-3">Parent Phone</th>
              <th className="text-left px-3 py-3">Portal Access</th>
              <th className="text-right px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-gray-400">
                  Loading students...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-gray-400">
                  No students found
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.id} className="border-b last:border-b-0 hover:bg-gray-50 sticky top-0 z-10 shrink-0">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(student.id)}
                      onChange={() => toggleSelect(student.id)}
                      aria-label={`Select ${studentName(student)}`}
                    />
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-900">{studentName(student)}</td>
                  <td className="px-3 py-3 text-gray-600">{student.admission_number}</td>
                  <td className="px-3 py-3 text-gray-600">
                    {student.class_name || '—'}
                    {student.section_name ? ` - ${student.section_name}` : ''}
                  </td>
                  <td className="px-3 py-3 text-gray-600">{student.parent_phone || '—'}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        student.has_portal_password
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {student.has_portal_password ? 'Password set' : 'Not set'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openSetPassword(student)}
                        className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                      >
                        {student.has_portal_password ? 'Reset' : 'Set'} Password
                      </button>
                      {student.has_portal_password && (
                        <button
                          type="button"
                          onClick={() => clearPassword(student)}
                          className="px-2 py-1 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50"
                        >
                          Remove
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

      {showPasswordModal && passwordTarget && (
        <AppModal
          open={showPasswordModal}
          onClose={() => {
            setShowPasswordModal(false)
            setPasswordTarget(null)
          }}
        >
          <div className={`${APP_MODAL_PANEL} p-6 space-y-4`}>
            <h4 className="text-lg font-semibold text-gray-900">Set Portal Password</h4>
            <p className="text-sm text-gray-600">
              {studentName(passwordTarget)} · {passwordTarget.admission_number}
            </p>
            <p className="text-xs text-gray-500">
              Student can log in with admission number or parent phone ({passwordTarget.parent_phone || 'no phone on file'}).
            </p>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full border rounded-lg px-3 py-2 pr-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400"
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={savePassword}
                disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Password'}
              </button>
            </div>
          </div>
        </AppModal>
      )}

      {showBulkModal && (
        <AppModal open={showBulkModal} onClose={() => setShowBulkModal(false)}>
          <div className={`${APP_MODAL_PANEL} p-6 space-y-4`}>
            <h4 className="text-lg font-semibold text-gray-900">Bulk Set Portal Passwords</h4>
            <p className="text-sm text-gray-600">
              {classId
                ? `Apply to all active students in the selected class.`
                : `Apply to ${selectedIds.length} selected student(s).`}
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useAdmissionAsPassword}
                onChange={(e) => setUseAdmissionAsPassword(e.target.checked)}
              />
              Use admission number as password for each student
            </label>
            {!useAdmissionAsPassword && (
              <input
                type="password"
                value={bulkPassword}
                onChange={(e) => setBulkPassword(e.target.value)}
                placeholder="Same password for all selected students"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyBulk}
                disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {saving ? 'Applying...' : 'Apply'}
              </button>
            </div>
          </div>
        </AppModal>
      )}
    </div>
  )
}
