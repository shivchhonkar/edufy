'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/shared/components/layout/DashboardLayout'
import StaffDocumentsTab from '@/features/staff/components/StaffDocumentsTab'
import StaffAttendanceHistoryTab from '@/features/staff/components/StaffAttendanceHistoryTab'
import { Staff } from '@/shared/types'
import {
  FiArrowLeft,
  FiBriefcase,
  FiCalendar,
  FiMail,
  FiMapPin,
  FiPhone,
  FiUser,
} from 'react-icons/fi'

type StaffProfileTab = 'profile' | 'attendance' | 'documents'

const TABS: { id: StaffProfileTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'attendance', label: 'Attendance History' },
  { id: 'documents', label: 'Documents' },
]

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A'
  const dateStr = typeof date === 'string' ? date : date.toISOString()
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | number | null | undefined
  icon?: typeof FiUser
}) {
  return (
    <div className="py-2">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-primary-600" />}
        <p className="text-sm text-gray-900">{value || 'N/A'}</p>
      </div>
    </div>
  )
}

export default function StaffDetailPage() {
  const params = useParams()
  const router = useRouter()
  const staffId = params.id as string
  const [staff, setStaff] = useState<
    (Staff & { department_name?: string; designation_name?: string }) | null
  >(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<StaffProfileTab>('profile')

  const loadStaff = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/staff/${staffId}`)
      const data = await response.json()
      if (data.success) {
        setStaff(data.data)
      } else {
        setError(data.error || 'Staff member not found')
      }
    } catch {
      setError('Failed to load staff profile')
    } finally {
      setLoading(false)
    }
  }, [staffId])

  useEffect(() => {
    loadStaff()
  }, [loadStaff])

  const departmentLabel =
    staff?.department_name || staff?.department || 'Not assigned'
  const designationLabel =
    staff?.designation_name || staff?.designation || 'Staff Member'

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-4">
        <Link
          href="/staff"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
        >
          <FiArrowLeft size={14} />
          Back to Staff
        </Link>

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-500">
            Loading staff profile...
          </div>
        ) : error || !staff ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-10 text-center text-red-700">
            {error || 'Staff member not found'}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-4 py-4 sm:px-6">
              <div className="flex flex-wrap items-center gap-4">
                {staff.photo_url ? (
                  <img
                    src={staff.photo_url}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white">
                    {staff.first_name.charAt(0)}
                    {staff.last_name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-semibold text-gray-900">
                    {staff.first_name} {staff.last_name}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {designationLabel} · {departmentLabel}
                  </p>
                  <p className="text-sm text-gray-500">{staff.employee_id}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    staff.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {staff.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="border-b border-gray-200 px-4 sm:px-6 overflow-x-auto">
              <nav className="flex gap-1 min-w-max">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-primary-600 text-primary-700'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {activeTab === 'attendance' && (
                <StaffAttendanceHistoryTab staffId={staff.id} />
              )}
              {activeTab === 'documents' && <StaffDocumentsTab staffId={staff.id} />}
              {activeTab === 'profile' && (
                <>
                  <div className="rounded-lg border border-gray-200">
                    <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
                      <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <FiUser className="h-4 w-4" />
                        Personal Information
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
                      <InfoRow label="First Name" value={staff.first_name} />
                      <InfoRow label="Last Name" value={staff.last_name} />
                      <InfoRow
                        label="Date of Birth"
                        value={formatDate(staff.date_of_birth)}
                        icon={FiCalendar}
                      />
                      <InfoRow label="Gender" value={staff.gender} />
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200">
                    <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
                      <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <FiPhone className="h-4 w-4" />
                        Contact
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
                      <InfoRow label="Phone" value={staff.phone} icon={FiPhone} />
                      <InfoRow label="Email" value={staff.email} icon={FiMail} />
                      <InfoRow
                        label="Emergency Contact"
                        value={staff.emergency_contact}
                        icon={FiPhone}
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200">
                    <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
                      <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <FiMapPin className="h-4 w-4" />
                        Address
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
                      <InfoRow label="Street Address" value={staff.address} />
                      <InfoRow label="City" value={staff.city} />
                      <InfoRow label="State" value={staff.state} />
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200">
                    <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
                      <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <FiBriefcase className="h-4 w-4" />
                        Employment
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
                      <InfoRow label="Designation" value={designationLabel} />
                      <InfoRow label="Department" value={departmentLabel} />
                      <InfoRow label="Qualification" value={staff.qualification} />
                      <InfoRow label="Experience (Years)" value={staff.experience_years} />
                      <InfoRow
                        label="Date of Joining"
                        value={formatDate(staff.date_of_joining)}
                        icon={FiCalendar}
                      />
                      <InfoRow
                        label="Employment Type"
                        value={staff.employment_type?.replace('_', ' ').toUpperCase()}
                      />
                      <InfoRow
                        label="Monthly Salary"
                        value={
                          staff.salary ? `₹${Number(staff.salary).toLocaleString('en-IN')}` : 'N/A'
                        }
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-gray-200 px-4 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => router.push('/staff')}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                Back to staff list
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
