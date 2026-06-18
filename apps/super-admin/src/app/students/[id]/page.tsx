'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/shared/components/layout/DashboardLayout'
import ProfileTab from '@/features/students/components/profile/ProfileTab'
import GuardiansTab from '@/features/students/components/profile/GuardiansTab'
import DocumentsTab from '@/features/students/components/profile/DocumentsTab'
import MedicalTab from '@/features/students/components/profile/MedicalTab'
import EnrollmentsTab from '@/features/students/components/profile/EnrollmentsTab'
import { Student } from '@/shared/types'
import { studentFullName, studentInitials } from '@/features/students/utils/student-profile'
import { FiArrowLeft, FiEdit2 } from 'react-icons/fi'

type ProfileTabId = 'profile' | 'guardians' | 'documents' | 'medical' | 'history'

const TABS: { id: ProfileTabId; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'guardians', label: 'Guardians' },
  { id: 'documents', label: 'Documents' },
  { id: 'medical', label: 'Medical' },
  { id: 'history', label: 'Academic History' },
]

export default function StudentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const studentId = params.id as string
  const [student, setStudent] = useState<
    (Student & { class_name?: string; section_name?: string }) | null
  >(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ProfileTabId>('profile')

  const loadStudent = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/students/${studentId}`)
      const data = await response.json()
      if (data.success) {
        setStudent(data.data)
      } else {
        setError(data.error || 'Student not found')
      }
    } catch {
      setError('Failed to load student')
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    loadStudent()
  }, [loadStudent])

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/students"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
          >
            <FiArrowLeft size={14} />
            Back to Students
          </Link>
          {student && (
            <button
              type="button"
              onClick={() => router.push(`/students?edit=${student.id}`)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <FiEdit2 size={14} />
              Edit on list
            </button>
          )}
        </div>

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-500">
            Loading student profile...
          </div>
        ) : error || !student ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-10 text-center text-red-700">
            {error || 'Student not found'}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-4 py-4 sm:px-6">
              <div className="flex flex-wrap items-center gap-4">
                {student.photo_url ? (
                  <img
                    src={student.photo_url}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white">
                    {studentInitials(student)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-semibold text-gray-900">{studentFullName(student)}</h1>
                  <p className="text-sm text-gray-600">
                    {student.admission_number}
                    {student.class_name ? ` · ${student.class_name}` : ''}
                    {student.section_name ? ` · ${student.section_name}` : ''}
                  </p>
                  {student.parent_name && (
                    <p className="text-sm text-gray-500 mt-0.5">Parent: {student.parent_name}</p>
                  )}
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    student.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {student.status.toUpperCase()}
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

            <div className="p-4 sm:p-6">
              {activeTab === 'profile' && <ProfileTab student={student} />}
              {activeTab === 'guardians' && <GuardiansTab studentId={student.id} />}
              {activeTab === 'documents' && <DocumentsTab studentId={student.id} />}
              {activeTab === 'medical' && <MedicalTab studentId={student.id} />}
              {activeTab === 'history' && <EnrollmentsTab studentId={student.id} />}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
