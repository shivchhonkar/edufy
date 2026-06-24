'use client';

import { useEffect, useState } from 'react';
import {
  FiEdit,
  FiTrash2,
  FiSearch,
  FiX,
  FiPrinter,
  FiUsers,
} from 'react-icons/fi';
import { useDialog } from '@/shared/context/DialogContext';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';
import AddTransportAssignmentModal from '@/features/transport/components/AddTransportAssignmentModal';
import TransportPageHeader from '@/features/transport/components/TransportPageHeader';
import { printStudentTransportAssignments } from '@/features/transport/utils/print-student-assignments';

interface TransportAssignment {
  id: number;
  student_id: number;
  route_id: number;
  stop_id: number | null;
  transport_fee: number | string | null;
  start_date: string;
  status: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  photo_url?: string;
  class_name?: string;
  section_name?: string;
  route_name: string;
  route_number?: string;
  stop_name?: string;
}

interface RouteOption {
  id: number;
  route_name: string;
}

interface ClassOption {
  id: number;
  name: string;
}

interface SectionOption {
  id: number;
  name: string;
}

export default function TransportCurrentAssignmentsView() {
  const { alert } = useDialog();
  const [assignments, setAssignments] = useState<TransportAssignment[]>([]);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<TransportAssignment | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState<TransportAssignment | null>(null);
  const [searchAssignment, setSearchAssignment] = useState('');
  const [filterRoute, setFilterRoute] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchRoutes();
    fetchClasses();
  }, []);

  useEffect(() => {
    if (!filterClass) {
      setSections([]);
      setFilterSection('');
      return;
    }

    const loadSections = async () => {
      try {
        const response = await fetch(`/api/sections?class_id=${filterClass}`);
        const data = await response.json();
        if (data.success) setSections(data.data);
      } catch {
        setSections([]);
      }
    };
    loadSections();
    setFilterSection('');
  }, [filterClass]);

  useEffect(() => {
    fetchAssignments();
  }, [searchAssignment, filterRoute, filterClass, filterSection, filterStatus]);

  const fetchAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const params = new URLSearchParams();
      if (searchAssignment) params.set('search', searchAssignment);
      if (filterRoute) params.set('route_id', filterRoute);
      if (filterClass) params.set('class_id', filterClass);
      if (filterSection) params.set('section_id', filterSection);
      if (filterStatus) params.set('status', filterStatus);

      const query = params.toString();
      const url = query ? `/api/transport/assignments?${query}` : '/api/transport/assignments';
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setAssignments(data.data);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const fetchRoutes = async () => {
    try {
      const response = await fetch('/api/transport/routes');
      const data = await response.json();
      if (data.success) setRoutes(data.data);
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes');
      const data = await response.json();
      if (data.success) setClasses(data.data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const handleCloseAssignmentModal = () => {
    setShowAssignmentModal(false);
    setEditingAssignment(null);
  };

  const handleEditAssignment = (assignment: TransportAssignment) => {
    setEditingAssignment(assignment);
    setShowAssignmentModal(true);
  };

  const handleDeleteAssignment = async () => {
    if (!deletingAssignment) return;

    try {
      const response = await fetch(`/api/transport/assignments/${deletingAssignment.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setDeletingAssignment(null);
        fetchAssignments();
      } else {
        await alert(data.error || 'Failed to delete assignment', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      await alert('An error occurred while deleting assignment', { title: 'Error', type: 'error' });
    }
  };

  const printAssignments = async () => {
    if (assignments.length === 0) {
      await alert('No assignments to print', { title: 'Notice', type: 'warning' });
      return;
    }

    const success = printStudentTransportAssignments(assignments);
    if (!success) {
      await alert('Please allow popups to print', { title: 'Notice', type: 'warning' });
    }
  };

  const hasActiveFilters =
    searchAssignment || filterRoute || filterClass || filterSection || filterStatus;

  const clearFilters = () => {
    setSearchAssignment('');
    setFilterRoute('');
    setFilterClass('');
    setFilterSection('');
    setFilterStatus('');
  };

  return (
    <div className="space-y-6">
      <TransportPageHeader
        title="Current Assignments"
        description="View and manage all student transport route assignments"
      />

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-base font-semibold text-gray-900">Current Assignments</h3>
          <button
            onClick={printAssignments}
            disabled={assignments.length === 0}
            className="flex items-center space-x-2 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiPrinter size={16} />
            <span>Print Route-wise</span>
          </button>
        </div>

        <div className="p-4 border-b bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative lg:col-span-1">
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student name or admission number..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                value={searchAssignment}
                onChange={(e) => setSearchAssignment(e.target.value)}
              />
            </div>
            <div>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                value={filterRoute}
                onChange={(e) => setFilterRoute(e.target.value)}
              >
                <option value="">All Routes</option>
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.route_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white disabled:bg-gray-100 disabled:text-gray-400"
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                disabled={!filterClass}
              >
                <option value="">All Sections</option>
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-sm text-gray-600">Active filters:</span>
                {searchAssignment && (
                  <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                    Search: &quot;{searchAssignment}&quot;
                  </span>
                )}
                {filterRoute && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    Route: {routes.find((r) => r.id.toString() === filterRoute)?.route_name}
                  </span>
                )}
                {filterClass && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                    Class: {classes.find((c) => c.id.toString() === filterClass)?.name}
                  </span>
                )}
                {filterSection && (
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                    Section: {sections.find((s) => s.id.toString() === filterSection)?.name}
                  </span>
                )}
                {filterStatus && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    Status: {filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
                  </span>
                )}
              </div>
              <button
                onClick={clearFilters}
                className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX size={16} />
                <span>Clear All</span>
              </button>
            </div>
          )}
        </div>

        {loadingAssignments ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
          </div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FiUsers className="mx-auto h-12 w-12 text-gray-400 mb-2" />
            <p className="text-gray-500">
              {hasActiveFilters
                ? 'No assignments found matching your filters'
                : 'No student transport assignments found'}
            </p>
            {!hasActiveFilters && (
              <p className="text-xs text-gray-400 mt-1">
                Assign students from Transport → Student Assignments
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Student
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Class
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Route
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Pickup Stop
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Fee (₹/month)
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Start Date
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        {assignment.photo_url ? (
                          <img
                            src={assignment.photo_url}
                            alt={`${assignment.first_name} ${assignment.last_name}`}
                            className="h-8 w-8 rounded-full object-cover mr-2"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                            <span className="text-xs font-medium text-gray-600">
                              {assignment.first_name.charAt(0)}
                              {assignment.last_name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {assignment.first_name} {assignment.last_name}
                          </div>
                          <div className="text-xs text-gray-500">{assignment.admission_number}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {assignment.class_name || 'N/A'}
                      {assignment.section_name && ` - ${assignment.section_name}`}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{assignment.route_name}</div>
                      {assignment.route_number && (
                        <div className="text-xs text-gray-500">{assignment.route_number}</div>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {assignment.stop_name || 'Not specified'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {assignment.transport_fee ? `₹${assignment.transport_fee}` : 'Free'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {new Date(assignment.start_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          assignment.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {assignment.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleEditAssignment(assignment)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Edit"
                        >
                          <FiEdit size={18} />
                        </button>
                        <button
                          onClick={() => setDeletingAssignment(assignment)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Remove Assignment"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loadingAssignments && assignments.length > 0 && (
          <div className="px-6 py-3 border-t bg-gray-50">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">
                Total Assignments:{' '}
                <span className="font-semibold text-gray-900">{assignments.length}</span>
              </span>
              {filterRoute && (
                <span className="text-gray-600">
                  Students on {routes.find((r) => r.id.toString() === filterRoute)?.route_name}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <AddTransportAssignmentModal
        isOpen={showAssignmentModal}
        onClose={handleCloseAssignmentModal}
        onSuccess={fetchAssignments}
        editingAssignment={editingAssignment}
      />

      <ConfirmDialog
        isOpen={!!deletingAssignment}
        title="Remove Transport Assignment"
        message={`Are you sure you want to remove transport assignment for ${deletingAssignment?.first_name} ${deletingAssignment?.last_name}? This action cannot be undone.`}
        confirmText="Yes, Remove"
        cancelText="Cancel"
        onConfirm={handleDeleteAssignment}
        onCancel={() => setDeletingAssignment(null)}
        type="danger"
      />
    </div>
  );
}
