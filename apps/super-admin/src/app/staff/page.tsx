'use client';

import { useEffect, useState } from 'react';
import { FiPlus, FiSearch, FiUpload } from 'react-icons/fi';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import AddStaffModal from '@/features/staff/components/AddStaffModal';
import ViewStaffModal from '@/features/staff/components/ViewStaffModal';
import VirtualizedStaffTable, {
  type StaffListItem,
} from '@/features/staff/components/VirtualizedStaffTable';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';
import BulkImportModal from '@/shared/components/common/BulkImportModal';
import { useDialog } from '@/shared/context/DialogContext';
import { Staff } from '@/shared/types';

const STAFF_FETCH_LIMIT = 5000;

export default function StaffPage() {
  const { alert } = useDialog();
  const [staff, setStaff] = useState<StaffListItem[]>([]);
  const [totalStaff, setTotalStaff] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);
  const [viewingStaff, setViewingStaff] = useState<Staff | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [showImport, setShowImport] = useState(false);

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

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div>
            <h1 className="text-xl text-gray-900">Staff Management</h1>
            <p className="text-sm text-gray-600 mt-0.5">Manage staff members and their details</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="border px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
            >
              <FiUpload size={15} />
              <span>Import CSV</span>
            </button>
            <button
              onClick={handleAddStaff}
              className="bg-primary-600 text-white px-3 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm font-medium"
            >
              <FiPlus size={15} />
              <span>Add Staff</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-3 sm:px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 relative min-w-0">
              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="text"
                placeholder="Search by name, employee ID, or phone..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {isSuperAdmin && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-40 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="resigned">Resigned</option>
                <option value="terminated">Terminated</option>
              </select>
            )}
            {!loading && (
              <p className="text-sm text-gray-500 sm:whitespace-nowrap">
                {staff.length}
                {totalStaff > staff.length ? ` of ${totalStaff}` : ''} staff
              </p>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : (
            <VirtualizedStaffTable
              staff={staff}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
            />
          )}

          {!loading && staff.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/60 text-sm text-gray-600 flex justify-between items-center">
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
          onEdit={handleEditFromView}
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
