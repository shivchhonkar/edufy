'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import AddStudentModal from '@/features/students/components/AddStudentModal';
import ViewStudentModal from '@/features/students/components/ViewStudentModal';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';
import { useDialog } from '@/shared/context/DialogContext';
import { Student } from '@/shared/types';
import Link from 'next/link';
import {
  FiPlus,
  FiSearch,
  FiX,
  FiUpload,
  FiEdit,
  FiChevronDown,
  FiChevronUp,
  FiFilter,
  FiTrash2,
} from 'react-icons/fi';
import BulkImportModal from '@/shared/components/common/BulkImportModal';
import VirtualizedStudentsTable from '@/features/students/components/VirtualizedStudentsTable';

const STUDENTS_FETCH_LIMIT = 50000;
const UNASSIGNED_CLASS_FILTER = 'unassigned';

interface Class {
  id: number;
  name: string;
  academic_year: string;
}

interface Section {
  id: number;
  class_id: number;
  name: string;
}

function StudentsPageContent() {
  const { alert, confirm } = useDialog();
  const searchParams = useSearchParams();
  const pageHint = searchParams.get('hint');
  const [students, setStudents] = useState<Student[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [deletingUnassigned, setDeletingUnassigned] = useState(false);
  const [hasUnassignedStudents, setHasUnassignedStudents] = useState(false);

  useEffect(() => {
    fetchClasses();
    fetchUnassignedCount();
  }, []);

  useEffect(() => {
    if (!hasUnassignedStudents && classFilter === UNASSIGNED_CLASS_FILTER) {
      setClassFilter('');
    }
  }, [hasUnassignedStudents, classFilter]);

  useEffect(() => {
    const query = searchParams.get('search')?.trim();
    if (query) {
      setSearch(query);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchStudents();
  }, [search, classFilter, sectionFilter]);

  useEffect(() => {
    if (classFilter && classFilter !== UNASSIGNED_CLASS_FILTER) {
      fetchSections(classFilter);
    } else {
      setSections([]);
      setSectionFilter('');
    }
  }, [classFilter]);

  const fetchUnassignedCount = async () => {
    try {
      const response = await fetch('/api/students/unassigned');
      const data = await response.json();
      if (data.success) {
        setHasUnassignedStudents((data.data?.count ?? 0) > 0);
      }
    } catch (error) {
      console.error('Error fetching unassigned student count:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes');
      const data = await response.json();
      if (data.success) {
        setClasses(data.data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchSections = async (classId: string) => {
    try {
      const response = await fetch(`/api/sections?class_id=${classId}`);
      const data = await response.json();
      if (data.success) {
        setSections(data.data);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        limit: String(STUDENTS_FETCH_LIMIT),
        page: '1',
      });
      if (classFilter) params.set('class_id', classFilter);
      if (sectionFilter && classFilter !== UNASSIGNED_CLASS_FILTER) {
        params.set('section_id', sectionFilter);
      }

      const response = await fetch(`/api/students?${params}`);
      const data = await response.json();
      if (data.success) {
        setStudents(data.data);
        setTotalStudents(data.pagination?.total ?? data.data.length);
      }
      fetchUnassignedCount();
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (student: Student) => {
    setViewingStudent(student);
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setShowModal(true);
  };

  const handleDeleteClick = (student: Student) => {
    setDeletingStudent(student);
  };

  const handleConfirmDelete = async () => {
    if (!deletingStudent) return;

    try {
      const response = await fetch(`/api/students/${deletingStudent.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setDeletingStudent(null);
        fetchStudents(); // Refresh the list
      } else {
        await alert(data.error || 'Failed to delete student', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting student:', error);
      await alert('An error occurred while deleting student', { title: 'Error', type: 'error' });
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingStudent(null);
  };

  const handleDeleteUnassigned = async () => {
    if (classFilter !== UNASSIGNED_CLASS_FILTER) return;

    if (totalStudents === 0) {
      await alert('No unassigned students to delete.', { title: 'Nothing to delete', type: 'info' });
      return;
    }

    const searchNote = search.trim()
      ? ' matching the current search'
      : '';
    const confirmed = await confirm(
      `Delete all ${totalStudents} unassigned student record${totalStudents === 1 ? '' : 's'}${searchNote}? This action cannot be undone.`,
      {
        title: 'Delete Unassigned Students',
        type: 'danger',
        confirmText: 'Delete All',
        cancelText: 'Cancel',
      },
    );
    if (!confirmed) return;

    setDeletingUnassigned(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());

      const response = await fetch(
        `/api/students/unassigned${params.toString() ? `?${params.toString()}` : ''}`,
        { method: 'DELETE' },
      );
      const data = await response.json();

      if (data.success) {
        await alert(`Deleted ${data.data.deleted} unassigned student(s).`, {
          title: 'Deleted',
          type: 'success',
        });
        fetchStudents();
      } else {
        await alert(data.error || 'Failed to delete unassigned students', {
          title: 'Error',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error deleting unassigned students:', error);
      await alert('An error occurred while deleting unassigned students', {
        title: 'Error',
        type: 'error',
      });
    } finally {
      setDeletingUnassigned(false);
    }
  };

  const showDeleteUnassigned =
    classFilter === UNASSIGNED_CLASS_FILTER && !loading && totalStudents > 0;

  const deleteUnassignedButton = showDeleteUnassigned ? (
    <button
      type="button"
      onClick={handleDeleteUnassigned}
      disabled={deletingUnassigned}
      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 border border-red-200 rounded hover:bg-red-50 hover:text-red-900 disabled:opacity-50"
    >
      <FiTrash2 size={13} />
      {deletingUnassigned ? 'Deleting...' : 'Delete unassigned'}
    </button>
  ) : null;

  const hasActiveFilters = Boolean(search || classFilter || sectionFilter);
  const activeFilterCount = [search, classFilter, sectionFilter].filter(Boolean).length;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="space-y-3">
          {pageHint === 'documents' && (
            <p className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              Open a student profile and use the <strong>Documents</strong> tab for transfer
              certificates and uploaded files.
            </p>
          )}
          {pageHint === 'medical' && (
            <p className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              Open a student profile and use the <strong>Medical</strong> tab for health records.
            </p>
          )}
          <div className="flex flex-wrap justify-between items-start gap-3">
            <div>
              <h1 className="text-xl text-gray-900">Students</h1>
              <p className="text-gray-600 mt-1 text-sm">Manage student information and records</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFiltersExpanded((prev) => !prev)}
                aria-expanded={filtersExpanded}
                className={`border px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${
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
              <Link
                href="/students/bulk-edit"
                className="border px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center space-x-2 text-sm"
              >
                <FiEdit />
                <span>Bulk Edit</span>
              </Link>
              <button
                onClick={() => setShowImport(true)}
                className="border px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center space-x-2 text-sm"
              >
                <FiUpload />
                <span>Import CSV</span>
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center space-x-2 text-sm"
              >
                <FiPlus />
                <span>Add Student</span>
              </button>
            </div>
          </div>

          {filtersExpanded && (
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2 relative">
                  <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, admission no., or phone..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm text-gray-900 bg-white"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm text-gray-900 bg-white"
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                >
                  <option value="">All Classes</option>
                  {hasUnassignedStudents && (
                    <option value={UNASSIGNED_CLASS_FILTER}>Unassigned (no class)</option>
                  )}
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm text-gray-900 bg-white"
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  disabled={!classFilter || classFilter === UNASSIGNED_CLASS_FILTER}
                >
                  <option value="">All Sections</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
              </div>
              {hasActiveFilters && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center flex-wrap gap-2">
                    {search && (
                      <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs">
                        Search: &quot;{search}&quot;
                      </span>
                    )}
                    {classFilter && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                        Class:{' '}
                        {classFilter === UNASSIGNED_CLASS_FILTER
                          ? 'Unassigned'
                          : classes.find((c) => c.id.toString() === classFilter)?.name}
                      </span>
                    )}
                    {sectionFilter && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                        Section: {sections.find((s) => s.id.toString() === sectionFilter)?.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {deleteUnassignedButton}
                    <button
                      onClick={() => {
                        setSearch('');
                        setClassFilter('');
                        setSectionFilter('');
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                    >
                      <FiX size={14} />
                      Clear all
                    </button>
                  </div>
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
              {classFilter && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                  {classFilter === UNASSIGNED_CLASS_FILTER
                    ? 'Unassigned'
                    : classes.find((c) => c.id.toString() === classFilter)?.name}
                </span>
              )}
              {sectionFilter && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                  {sections.find((s) => s.id.toString() === sectionFilter)?.name}
                </span>
              )}
              {deleteUnassignedButton}
              <button
                onClick={() => {
                  setSearch('');
                  setClassFilter('');
                  setSectionFilter('');
                }}
                className="text-gray-500 hover:text-gray-800 underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <VirtualizedStudentsTable
              students={students}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
            />
          )}
        </div>

        {/* Total Count */}
        {!loading && (
          <div className="flex justify-end items-center mt-2 px-2">
            <div className="text-sm text-gray-600">
              Total Students: <span className="font-semibold text-gray-900">{totalStudents}</span>
              {students.length < totalStudents && (
                <span className="ml-2 text-xs text-gray-500">
                  (Loaded {students.length} of {totalStudents})
                </span>
              )}
              {classFilter && (
                <span className="ml-2 text-xs text-gray-500">
                  (Filtered by{' '}
                  {classFilter === UNASSIGNED_CLASS_FILTER
                    ? 'unassigned students'
                    : classes.find((c) => c.id.toString() === classFilter)?.name}
                  )
                </span>
              )}
            </div>
          </div>
        )}

        {/* Add/Edit Student Modal */}
        <AddStudentModal
          isOpen={showModal}
          onClose={handleCloseModal}
          onSuccess={fetchStudents}
          editingStudent={editingStudent}
        />

        {/* View Student Modal */}
        <ViewStudentModal
          isOpen={!!viewingStudent}
          onClose={() => setViewingStudent(null)}
          student={viewingStudent}
          onEdit={() => {
            if (viewingStudent) {
              setEditingStudent(viewingStudent);
              setViewingStudent(null);
              setShowModal(true);
            }
          }}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={!!deletingStudent}
          title="Delete Student"
          message={`Are you sure you want to delete ${deletingStudent?.first_name} ${deletingStudent?.last_name}? This action cannot be undone.`}
          confirmText="Yes, Delete"
          cancelText="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingStudent(null)}
          type="danger"
        />

        <BulkImportModal
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          onSuccess={fetchStudents}
          title="Bulk Import Students"
          templateType="students"
          importUrl="/api/import/students"
        />
      </div>
    </DashboardLayout>
  );
}

export default function StudentsPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center py-16 text-gray-500">Loading…</div>
        </DashboardLayout>
      }
    >
      <StudentsPageContent />
    </Suspense>
  );
}

