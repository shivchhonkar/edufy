'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import AddStaffModal from '@/features/staff/components/AddStaffModal';
import ViewStaffModal from '@/features/staff/components/ViewStaffModal';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';
import { Staff } from '@/shared/types';
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiEye, FiUpload } from 'react-icons/fi';
import BulkImportModal from '@/shared/components/common/BulkImportModal';
import { useDialog } from '@/shared/context/DialogContext';

export default function StaffPage() {
  const { alert } = useDialog();
  const [staff, setStaff] = useState<Staff[]>([]);
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
    try {
      // For super admin with 'all' filter, don't send status param
      // For regular admin, always use 'active'
      let statusParam = '';
      if (isSuperAdmin) {
        statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
      } else {
        statusParam = '&status=active';
      }
      
      const response = await fetch(`/api/staff?search=${search}&limit=50${statusParam}`);
      const data = await response.json();
      if (data.success) {
        setStaff(data.data);
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl text-gray-900">Staff Management</h1>
            <p className="text-gray-600 mt-1">Manage staff members and their details</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="border px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center space-x-2 text-sm"
            >
              <FiUpload />
              <span>Import CSV</span>
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center space-x-2"
            >
              <FiPlus />
              <span>Add Staff</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <FiSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search staff by name, employee ID, or phone..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {isSuperAdmin && (
                <div className="w-full md:w-48">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="resigned">Resigned</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                      Employee ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                      Designation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {staff.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        No staff members found. Click &quot;Add Staff&quot; to get started.
                      </td>
                    </tr>
                  ) : (
                    staff.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {member.employee_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {member.photo_url ? (
                              <img
                                src={member.photo_url}
                                alt={`${member.first_name} ${member.last_name}`}
                                className="h-10 w-10 rounded-full object-cover mr-3"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                                <span className="text-sm font-medium text-gray-600">
                                  {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                                </span>
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {member.first_name} {member.last_name}
                              </div>
                              <div className="text-sm text-gray-500">{member.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.designation || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.department || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.phone}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            member.status === 'active' 
                              ? 'bg-green-100 text-green-800'
                              : member.status === 'inactive'
                              ? 'bg-yellow-100 text-yellow-800'
                              : member.status === 'resigned'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {member.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-3">
                            <button 
                              onClick={() => handleView(member)}
                              className="text-primary-600 hover:text-primary-900 p-1"
                              title="View Details"
                            >
                              <FiEye size={18} />
                            </button>
                            <button 
                              onClick={() => handleEdit(member)}
                              className="text-blue-600 hover:text-blue-900 p-1"
                              title="Edit"
                            >
                              <FiEdit size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteClick(member)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Delete"
                            >
                              <FiTrash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Total Count */}
        {!loading && (
          <div className="flex justify-end items-center mt-2 px-2">
            <div className="text-sm text-gray-600">
              Total {statusFilter === 'all' ? '' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) + ' '}Staff: <span className="font-semibold text-gray-900">{staff.length}</span>
            </div>
          </div>
        )}

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
