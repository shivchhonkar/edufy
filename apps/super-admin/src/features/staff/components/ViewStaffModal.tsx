'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useEffect, useState } from 'react';
import { FiX, FiUser, FiMail, FiPhone, FiMapPin, FiBriefcase, FiCalendar } from 'react-icons/fi';
import { Staff } from '@/shared/types';
import StaffDocumentsTab from '@/features/staff/components/StaffDocumentsTab';
import StaffAttendanceHistoryTab from '@/features/staff/components/StaffAttendanceHistoryTab';
import StaffTeachingTab from '@/features/staff/components/StaffTeachingTab';
import StaffSalaryHistoryTab from '@/features/staff/components/StaffSalaryHistoryTab';
import StaffMessagesTab from '@/features/staff/components/StaffMessagesTab';
import StaffProfileOverviewHeader from '@/features/staff/components/StaffProfileOverviewHeader';

type StaffProfileTab =
  | 'profile'
  | 'teaching'
  | 'attendance'
  | 'documents'
  | 'salary'
  | 'messages';

interface ViewStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff | null;
  initialTab?: StaffProfileTab;
  onEdit?: () => void;
}

const TABS: { id: StaffProfileTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'teaching', label: 'Class & Activity' },
  { id: 'attendance', label: 'Attendance History' },
  { id: 'salary', label: 'Salary History' },
  { id: 'documents', label: 'Documents' },
  { id: 'messages', label: 'Messages' },
];

export default function ViewStaffModal({ isOpen, onClose, staff, initialTab = 'profile', onEdit }: ViewStaffModalProps) {
  const [activeTab, setActiveTab] = useState<StaffProfileTab>(initialTab);

  useEffect(() => {
    if (isOpen && staff) {
      setActiveTab(initialTab);
    }
  }, [isOpen, staff?.id, initialTab]);
  if (!staff) return null;

  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return 'N/A';
    const dateStr = typeof date === 'string' ? date : date.toISOString();
    return new Date(dateStr).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const InfoRow = ({ label, value, icon: Icon }: { label: string; value: string | number | null | undefined; icon?: any }) => (
    <div className="py-2">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <div className="flex items-center space-x-2">
        {Icon && <Icon className="w-4 h-4 text-primary-600" />}
        <p className="text-sm text-gray-900">{value || 'N/A'}</p>
      </div>
    </div>
  );

  return (
    <AppModal open={isOpen} onClose={onClose}>
      <div className={APP_MODAL_PANEL}>
        {/* Header */}
        <div className="px-4 py-2 sm:px-6 sm:py-3 bg-white border-b flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-xl text-gray-900">Staff Profile</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {staff.first_name} {staff.last_name} · {staff.employee_id}
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
              className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiX size={24} />
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-6 bg-white border-b sticky top-[57px] z-10">
          <nav className="flex gap-6 -mb-px overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <StaffProfileOverviewHeader staff={staff} />

          {activeTab === 'attendance' && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <StaffAttendanceHistoryTab staffId={staff.id} />
            </div>
          )}

          {activeTab === 'salary' && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <StaffSalaryHistoryTab staffId={staff.id} />
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <StaffMessagesTab staffId={staff.id} staffPhone={staff.phone} />
            </div>
          )}

          {activeTab === 'teaching' && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <StaffTeachingTab staffId={staff.id} />
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <StaffDocumentsTab staffId={staff.id} />
            </div>
          )}

          {activeTab === 'profile' && (
            <>
          {/* Personal Information */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                <FiUser className="mr-2 w-4 h-4" />
                Personal Information
              </h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow label="First Name" value={staff.first_name} />
                <InfoRow label="Last Name" value={staff.last_name} />
                <InfoRow label="Date of Birth" value={formatDate(staff.date_of_birth)} icon={FiCalendar} />
                <InfoRow label="Gender" value={staff.gender} />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                <FiPhone className="mr-2 w-4 h-4" />
                Contact Information
              </h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow label="Phone" value={staff.phone} icon={FiPhone} />
                <InfoRow label="Email" value={staff.email} icon={FiMail} />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                <FiMapPin className="mr-2 w-4 h-4" />
                Address Information
              </h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow label="Street Address" value={staff.address} />
                <InfoRow label="City" value={staff.city} />
                <InfoRow label="State" value={staff.state} />
              </div>
            </div>
          </div>

          {/* Employment Details */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                <FiBriefcase className="mr-2 w-4 h-4" />
                Employment Details
              </h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoRow label="Designation" value={staff.designation} />
                <InfoRow label="Last Designation" value={staff.last_designation} />
                <InfoRow label="Department" value={staff.department} />
                <InfoRow label="Qualification" value={staff.qualification} />
                <InfoRow label="Experience (Years)" value={staff.experience_years} />
                <InfoRow label="Date of Joining" value={formatDate(staff.date_of_joining)} icon={FiCalendar} />
                <InfoRow 
                  label="Employment Type" 
                  value={staff.employment_type?.replace('_', ' ').toUpperCase()} 
                />
                <InfoRow 
                  label="Monthly Salary" 
                  value={staff.salary ? `₹${staff.salary.toLocaleString()}` : 'N/A'} 
                />
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700">System Information</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow label="Employee ID" value={staff.employee_id} />
                <InfoRow label="Status" value={staff.status?.toUpperCase()} />
                <InfoRow label="Created At" value={formatDate(staff.created_at)} icon={FiCalendar} />
                <InfoRow label="Last Updated" value={formatDate(staff.updated_at)} icon={FiCalendar} />
              </div>
            </div>
          </div>

          {/* Notes Section - Show only if notes exist */}
          {staff.notes && (
            <div className="bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="px-4 py-2 bg-yellow-100 border-b border-yellow-200">
                <h3 className="text-sm font-semibold text-yellow-900">Notes / Status Change Reason</h3>
              </div>
              <div className="p-4 space-y-3">
                {staff.status_change_date && (
                  <div>
                    <p className="text-xs font-medium text-yellow-700 mb-1">Status Changed On</p>
                    <p className="text-sm text-gray-900 font-medium">{formatDate(staff.status_change_date)}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-yellow-700 mb-1">Reason</p>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{staff.notes}</p>
                </div>
              </div>
            </div>
          )}

            </>
          )}

          <div className="flex justify-end pt-3 border-t border-gray-200 sticky bottom-0 bg-white pb-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </AppModal>
  );
}

