'use client';

import { useEffect, useMemo, useState } from 'react';
import { FiChevronDown, FiChevronUp, FiFilter, FiPlus, FiSearch, FiUpload, FiX } from 'react-icons/fi';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import AddStaffModal from '@/features/staff/components/AddStaffModal';
import ViewStaffModal from '@/features/staff/components/ViewStaffModal';
import StaffIdCardModal from '@/features/staff/components/StaffIdCardModal';
import VirtualizedStaffTable, {
  type StaffListItem,
} from '@/features/staff/components/VirtualizedStaffTable';
import StaffTableSkeleton, { StaffTotalSkeleton } from '@/features/staff/components/StaffTableSkeleton';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';
import BulkImportModal from '@/shared/components/common/BulkImportModal';
import { useDialog } from '@/shared/context/DialogContext';
import { useSettings } from '@/shared/SettingsContext';
import { Staff } from '@/shared/types';
import {
  resolveAssetUrl,
  resolveDocumentWatermarkUrl,
  resolveSchoolLogoUrl,
} from '@/features/students/utils/school-document-utils';

type StaffViewTab =
  | 'profile'
  | 'teaching'
  | 'attendance'
  | 'documents'
  | 'salary'
  | 'messages';

const STAFF_FETCH_LIMIT = 5000;

export default function StaffPage() {
  const { alert } = useDialog();
  const { settings } = useSettings();
  const [staff, setStaff] = useState<StaffListItem[]>([]);
  const [totalStaff, setTotalStaff] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);
  const [viewingStaff, setViewingStaff] = useState<Staff | null>(null);
  const [viewingStaffTab, setViewingStaffTab] = useState<StaffViewTab>('profile');
  const [idCardStaff, setIdCardStaff] = useState<StaffListItem | null>(null);
  const [reportSettings, setReportSettings] = useState<{
    counsellor_name?: string;
    counsellor_signature_url?: string;
    website?: string;
    logo_url?: string;
    show_watermark?: boolean;
    watermark_url?: string;
  }>({});
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  useEffect(() => {
    // Check if user is super admin
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setIsSuperAdmin(user.role === 'super_admin');
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [search, statusFilter, isSuperAdmin]);

  useEffect(() => {
    fetch('/api/settings/reports')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setReportSettings(d.data);
      })
      .catch(console.error);
  }, []);

  const staffIdCardSchoolInfo = useMemo(
    () => ({
      name: settings.school_name || 'School',
      logoUrl: resolveSchoolLogoUrl(settings, reportSettings),
      phone: settings.school_phone || undefined,
      address: settings.school_address || undefined,
      website: reportSettings.website || undefined,
      academicYear: settings.academic_year
        ? `Academic Year ${settings.academic_year}`
        : undefined,
      principalName: reportSettings.counsellor_name || undefined,
      signatureUrl: resolveAssetUrl(reportSettings.counsellor_signature_url),
      showWatermark: reportSettings.show_watermark !== false,
      stampUrl: resolveDocumentWatermarkUrl(reportSettings),
    }),
    [settings, reportSettings],
  );

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        limit: String(STAFF_FETCH_LIMIT),
        page: '1',
      });

      if (isSuperAdmin) {
        if (statusFilter !== 'all') params.set('status', statusFilter);
      } else {
        params.set('status', 'active');
      }

      const response = await fetch(`/api/staff?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setStaff(data.data);
        setTotalStaff(data.pagination?.total ?? data.data.length);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (member: Staff) => {
    setViewingStaffTab('profile');
    setViewingStaff(member);
  };

  const handleGenerateId = (member: StaffListItem) => {
    setIdCardStaff(member);
  };

  const handleViewAttendance = (member: StaffListItem) => {
    setViewingStaffTab('attendance');
    setViewingStaff(member);
  };

  const handleViewActivity = (member: StaffListItem) => {
    setViewingStaffTab('teaching');
    setViewingStaff(member);
  };

  const handleEdit = (member: Staff) => {
    setEditingStaff(member);
    setShowModal(true);
  };

  const handleEditFromView = () => {
    if (!viewingStaff) return;
    const member = viewingStaff;
    setViewingStaff(null);
    setEditingStaff(member);
    setShowModal(true);
  };

  const handleAddStaff = () => {
    setEditingStaff(null);
    setShowModal(true);
  };

  const handleDeleteClick = (member: Staff) => {
    setDeletingStaff(member);
  };

  const handleConfirmDelete = async () => {
    if (!deletingStaff) return;

    try {
      const response = await fetch(`/api/staff/${deletingStaff.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setDeletingStaff(null);
        fetchStaff(); // Refresh the list
      } else {
        await alert(data.error || 'Failed to delete staff member', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting staff:', error);
      await alert('An error occurred while deleting staff member', { title: 'Error', type: 'error' });
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingStaff(null);
  };

  const hasActiveFilters = Boolean(
    search || (isSuperAdmin && statusFilter !== 'active'),
  );
  const activeFilterCount = [
    search,
    isSuperAdmin && statusFilter !== 'active' ? statusFilter : '',
  ].filter(Boolean).length;

  const statusFilterLabel =
    statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('active');
  };

  return (
    <DashboardLayout>
      <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col gap-3">
        <div className="shrink-0 space-y-2">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-baseline gap-2">
              <h1 className="text-lg font-medium text-gray-900">Staff Management</h1>
              {loading ? (
                <StaffTotalSkeleton />
              ) : (
                <span className="text-xs text-gray-500">
                  {totalStaff} total
                  {staff.length < totalStaff ? ` · ${staff.length} loaded` : ''}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFiltersExpanded((prev) => !prev)}
                aria-expanded={filtersExpanded}
                className={`border px-2.5 py-1.5 rounded-md flex items-center gap-1.5 text-xs transition-colors ${
                  filtersExpanded || hasActiveFilters
                    ? 'border-primary-300 bg-primary-50 text-primary-700'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <FiFilter size={15} />
                <span>Filters</span>
                {hasActiveFilters && (
                  <span className="text-xs bg-primary-600 text-white px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                    {activeFilterCount}
                  </span>
                )}
                {filtersExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="border px-2.5 py-1.5 rounded-md hover:bg-gray-50 flex items-center gap-1.5 text-xs"
              >
                <FiUpload size={14} />
                <span>Import CSV</span>
              </button>
              <button
                onClick={handleAddStaff}
                className="bg-primary-600 text-white px-2.5 py-1.5 rounded-md hover:bg-primary-700 flex items-center gap-1.5 text-xs font-medium"
              >
                <FiPlus size={14} />
                <span>Add Staff</span>
              </button>
            </div>
          </div>

          {filtersExpanded && (
            <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className={`relative ${isSuperAdmin ? 'md:col-span-2' : 'md:col-span-3'}`}>
                  <FiSearch className="absolute left-2.5 top-2 text-gray-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search by name, employee ID, or phone..."
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 text-xs text-gray-900 bg-white"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                {isSuperAdmin && (
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 text-xs text-gray-900 bg-white"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="resigned">Resigned</option>
                    <option value="terminated">Terminated</option>
                  </select>
                )}
              </div>
              {hasActiveFilters && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center flex-wrap gap-2">
                    {search && (
                      <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs">
                        Search: &quot;{search}&quot;
                      </span>
                    )}
                    {isSuperAdmin && statusFilter !== 'active' && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                        Status: {statusFilterLabel}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                  >
                    <FiX size={14} />
                    Clear all
                  </button>
                </div>
              )}
            </div>
          )}

          {!filtersExpanded && hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-gray-500">Filtered:</span>
              {search && (
                <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full">
                  &quot;{search}&quot;
                </span>
              )}
              {isSuperAdmin && statusFilter !== 'active' && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                  {statusFilterLabel}
                </span>
              )}
              <button
                type="button"
                onClick={clearFilters}
                className="text-gray-500 hover:text-gray-800 underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="min-h-0 flex-1">
            {loading ? (
              <StaffTableSkeleton fillHeight />
            ) : (
              <VirtualizedStaffTable
                fillHeight
                staff={staff}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onGenerateId={handleGenerateId}
                onViewAttendance={handleViewAttendance}
                onViewActivity={handleViewActivity}
              />
            )}
          </div>

          {!loading && staff.length > 0 && (
            <div className="shrink-0 px-4 py-2.5 border-t border-gray-100 bg-gray-50/60 text-sm text-gray-600 flex justify-between items-center">
              <span>
                Showing {staff.length} staff member{staff.length !== 1 ? 's' : ''}
                {totalStaff > staff.length ? ` of ${totalStaff}` : ''}
              </span>
              <span>
                Total{' '}
                {statusFilter === 'all'
                  ? ''
                  : `${statusFilter.charAt(0).toUpperCase()}${statusFilter.slice(1)} `}
                Staff: <span className="font-semibold text-gray-900">{totalStaff}</span>
              </span>
            </div>
          )}
        </div>

        {/* Add/Edit Staff Modal */}
        <AddStaffModal
          isOpen={showModal}
          onClose={handleCloseModal}
          onSuccess={fetchStaff}
          editingStaff={editingStaff}
        />

        {/* View Staff Modal */}
        <ViewStaffModal
          isOpen={!!viewingStaff}
          onClose={() => setViewingStaff(null)}
          staff={viewingStaff}
          initialTab={viewingStaffTab}
          onEdit={handleEditFromView}
        />

        <StaffIdCardModal
          isOpen={!!idCardStaff}
          onClose={() => setIdCardStaff(null)}
          staff={idCardStaff}
          school={staffIdCardSchoolInfo}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={!!deletingStaff}
          title="Delete Staff Member"
          message={`Are you sure you want to delete ${deletingStaff?.first_name} ${deletingStaff?.last_name}? This action cannot be undone.`}
          confirmText="Yes, Delete"
          cancelText="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingStaff(null)}
          type="danger"
        />

        <BulkImportModal
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          onSuccess={fetchStaff}
          title="Bulk Import Staff"
          templateType="staff"
          importUrl="/api/import/staff"
        />
      </div>
    </DashboardLayout>
  );
}
