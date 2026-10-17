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
import StaffTableSkeleton from '@/features/staff/components/StaffTableSkeleton';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';
import BulkImportModal from '@/shared/components/common/BulkImportModal';
import { useDialog } from '@/shared/context/DialogContext';
import { moduleTabBarClass, moduleTabClass } from '@/shared/components/common/ModuleTabs';
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

function todayInputDate() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatClock(value?: string | null) {
  if (!value) return '—';
  return String(value).slice(0, 5);
}

interface PresentStaffRow {
  id: number;
  staff_id: number;
  first_name: string;
  last_name?: string | null;
  employee_id?: string | null;
  department?: string | null;
  designation?: string | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
}

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
  const [pageTab, setPageTab] = useState<'directory' | 'present'>('directory');
  const [presentStaff, setPresentStaff] = useState<PresentStaffRow[]>([]);
  const [presentLoading, setPresentLoading] = useState(false);

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
    if (pageTab !== 'present') return;
    let ignore = false;
    const loadPresent = async () => {
      setPresentLoading(true);
      try {
        const today = todayInputDate();
        const params = new URLSearchParams({
          start_date: today,
          end_date: today,
          status: 'present',
        });
        const response = await fetch(`/api/attendance?${params}`);
        const data = await response.json();
        if (!ignore && data.success) setPresentStaff(data.data || []);
      } catch (error) {
        console.error('Error fetching staff present today:', error);
        if (!ignore) setPresentStaff([]);
      } finally {
        if (!ignore) setPresentLoading(false);
      }
    };
    void loadPresent();
    return () => {
      ignore = true;
    };
  }, [pageTab]);

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

  const visiblePresent = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return presentStaff;
    return presentStaff.filter((row) => {
      const name = `${row.first_name || ''} ${row.last_name || ''}`.toLowerCase();
      return (
        name.includes(query) ||
        (row.employee_id || '').toLowerCase().includes(query) ||
        (row.department || '').toLowerCase().includes(query) ||
        (row.designation || '').toLowerCase().includes(query)
      );
    });
  }, [presentStaff, search]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('active');
  };

  return (
    <DashboardLayout>
      <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col gap-3">
        <div className="shrink-0 space-y-2">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <h1 className="text-lg font-medium text-gray-900">Staff Management</h1>
                <p className="mt-0.5 text-xs text-gray-500">
                  {pageTab === 'present'
                    ? presentLoading
                      ? 'Loading today’s attendance…'
                      : `${visiblePresent.length} present today`
                    : loading
                      ? 'Loading staff…'
                      : `${totalStaff} total${staff.length < totalStaff ? ` · ${staff.length} loaded` : ''}`}
                </p>
              </div>
              <div className={moduleTabBarClass}>
                <button type="button" onClick={() => setPageTab('directory')} className={moduleTabClass(pageTab === 'directory')}>
                  Directory
                </button>
                <button type="button" onClick={() => setPageTab('present')} className={moduleTabClass(pageTab === 'present')}>
                  Present today
                </button>
              </div>
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
          {pageTab === 'present' ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="shrink-0 border-b border-gray-100 px-4 py-2.5">
                <div className="relative max-w-sm">
                  <FiSearch className="absolute left-2.5 top-2 text-gray-400" size={14} />
                  <input
                    type="search"
                    placeholder="Search present staff"
                    className="w-full rounded-md border border-gray-200 py-1.5 pl-8 pr-3 text-xs text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {presentLoading ? (
                <StaffTableSkeleton fillHeight />
              ) : visiblePresent.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <p className="text-sm font-medium text-gray-700">No staff marked present today</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Attendance marked as present for today will appear here.
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 border-b border-gray-200 bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-2.5">Staff</th>
                      <th className="px-4 py-2.5">Department</th>
                      <th className="px-4 py-2.5">Designation</th>
                      <th className="px-4 py-2.5">Check in</th>
                      <th className="px-4 py-2.5">Check out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePresent.map((row) => (
                      <tr key={row.id} className="border-t border-gray-100">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-gray-900">
                            {row.first_name} {row.last_name || ''}
                          </p>
                          <p className="text-xs text-gray-500">{row.employee_id || '—'}</p>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">{row.department || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-600">{row.designation || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-600">{formatClock(row.check_in_time)}</td>
                        <td className="px-4 py-2.5 text-gray-600">{formatClock(row.check_out_time)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            </div>
          ) : (
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
          )}

          {pageTab === 'directory' && !loading && staff.length > 0 && (
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
