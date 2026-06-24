'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { Student } from '@/shared/types';
import { studentFullName, studentInitials } from '@/features/students/utils/student-profile';
import ProfileTab from '@/features/students/components/profile/ProfileTab';
import GuardiansTab from '@/features/students/components/profile/GuardiansTab';
import DocumentsTab from '@/features/students/components/profile/DocumentsTab';
import MedicalTab from '@/features/students/components/profile/MedicalTab';
import EnrollmentsTab from '@/features/students/components/profile/EnrollmentsTab';
import FeesTab from '@/features/students/components/profile/FeesTab';
import AttendanceTab from '@/features/students/components/profile/AttendanceTab';
import SiblingsTab from '@/features/students/components/profile/SiblingsTab';
import MessagesTab from '@/features/students/components/profile/MessagesTab';

interface ViewStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: (Student & { class_name?: string; section_name?: string }) | null;
  onEdit?: () => void;
  onViewSibling?: (student: Student & { class_name?: string; section_name?: string }) => void;
}

type ProfileTabId =
  | 'profile'
  | 'guardians'
  | 'siblings'
  | 'documents'
  | 'medical'
  | 'history'
  | 'fees'
  | 'attendance'
  | 'messages';

const TABS: { id: ProfileTabId; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'guardians', label: 'Guardians' },
  { id: 'siblings', label: 'Siblings' },
  { id: 'documents', label: 'Documents' },
  { id: 'medical', label: 'Medical' },
  { id: 'history', label: 'Academic History' },
  { id: 'fees', label: 'Fees' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'messages', label: 'Messages' },
];

export default function ViewStudentModal({
  isOpen,
  onClose,
  student,
  onEdit,
  onViewSibling,
}: ViewStudentModalProps) {
  const [activeTab, setActiveTab] = useState<ProfileTabId>('profile');
  const [studentData, setStudentData] = useState<
    (Student & { class_name?: string; section_name?: string }) | null
  >(student);

  useEffect(() => {
    setStudentData(student);
  }, [student]);

  const refreshStudent = async (studentId: number) => {
    try {
      const res = await fetch(`/api/students/${studentId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setStudentData(data.data);
      }
    } catch {
      // Keep existing data on refresh failure
    }
  };

  useEffect(() => {
    if (isOpen && student?.id) {
      setActiveTab('profile');
      refreshStudent(student.id);
    }
  }, [isOpen, student?.id]);

  const handleViewSibling = (
    sibling: Student & { class_name?: string; section_name?: string },
  ) => {
    setStudentData(sibling);
    setActiveTab('profile');
    onViewSibling?.(sibling);
  };

  if (!student || !studentData) return null;

  return (
    <AppModal open={isOpen} onClose={onClose}>
      <div className={APP_MODAL_PANEL}>
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 bg-white border-b flex justify-between items-center flex-shrink-0 sticky top-0 z-10 shrink-0">
          <div>
            <h2 className="text-xl text-gray-900">Student Profile</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {studentFullName(studentData)} · {studentData.admission_number}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100"
              >
                Edit Profile
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg"
            >
              <FiX size={24} />
            </button>
          </div>
        </div>

        {/* Summary strip */}
        <div className="px-4 sm:px-6 py-3 bg-white border-b flex items-center gap-4 flex-shrink-0 sticky top-0 z-10 shrink-0">
          {studentData.photo_url ? (
            <img
              src={studentData.photo_url}
              alt=""
              className="h-14 w-14 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="h-14 w-14 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold">
              {studentInitials(studentData)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900 truncate">{studentFullName(studentData)}</p>
            <p className="text-sm text-gray-600">
              {studentData.class_name || 'No class'}
              {studentData.section_name ? ` · ${studentData.section_name}` : ''}
            </p>
          </div>
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-full ${
              studentData.status === 'active'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {studentData.status.toUpperCase()}
          </span>
        </div>

        {/* Tabs */}
        <div className="px-4 sm:px-6 bg-white border-b flex-shrink-0 overflow-x-auto sticky top-0 z-10 shrink-0">
          <nav className="flex gap-1 min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === 'profile' && <ProfileTab student={studentData} />}
          {activeTab === 'guardians' && <GuardiansTab studentId={studentData.id} />}
          {activeTab === 'siblings' && (
            <SiblingsTab studentId={studentData.id} onViewSibling={handleViewSibling} />
          )}
          {activeTab === 'documents' && <DocumentsTab studentId={studentData.id} />}
          {activeTab === 'medical' && (
            <MedicalTab
              studentId={studentData.id}
              onSaved={() => refreshStudent(studentData.id)}
            />
          )}
          {activeTab === 'history' && <EnrollmentsTab studentId={studentData.id} />}
          {activeTab === 'fees' && <FeesTab studentId={studentData.id} />}
          {activeTab === 'attendance' && <AttendanceTab studentId={studentData.id} />}
          {activeTab === 'messages' && <MessagesTab studentId={studentData.id} />}
        </div>

        <div className="px-4 py-3 bg-white border-t flex justify-end flex-shrink-0 sticky bottom-0 z-10 shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700"
          >
            Close
          </button>
        </div>
      </div>
      </AppModal>
  );
}
