'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { Fragment, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import QuickAddSubjectsPanel from '@/features/subjects/components/QuickAddSubjectsPanel';
import { useDialog } from '@/shared/context/DialogContext';
import {
  FiBook,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSave,
  FiX,
  FiUsers,
  FiSearch,
  FiFilter,
  FiChevronDown,
  FiChevronRight,
  FiChevronUp,
  FiCheck,
} from 'react-icons/fi';

interface Subject {
  id: number;
  name: string;
  code: string;
  description: string;
}

interface Class {
  id: number;
  name: string;
}

interface ClassSubject {
  id: number;
  class_id: number;
  subject_id: number;
  class_name: string;
  subject_name: string;
  subject_code: string;
  teacher_name: string | null;
}

export default function SubjectsPage() {
  const { alert, confirm } = useDialog();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'subjects' | 'assignments'>('subjects');
  const [search, setSearch] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [expandedClassId, setExpandedClassId] = useState<number | null>(null);

  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    description: '',
  });

  const [classSubjectSelections, setClassSubjectSelections] = useState<Record<number, number[]>>({});

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const selections: Record<number, number[]> = {};
    classes.forEach((cls) => {
      selections[cls.id] = classSubjects
        .filter((cs) => cs.class_id === cls.id)
        .map((cs) => cs.subject_id);
    });
    setClassSubjectSelections(selections);
  }, [classes, classSubjects]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subjectsRes, classesRes, assignmentsRes] = await Promise.all([
        fetch('/api/subjects'),
        fetch('/api/classes'),
        fetch('/api/class-subjects'),
      ]);

      const [subjectsData, classesData, assignmentsData] = await Promise.all([
        subjectsRes.json(),
        classesRes.json(),
        assignmentsRes.json(),
      ]);

      if (subjectsData.success) setSubjects(subjectsData.data);
      if (classesData.success) setClasses(classesData.data);
      if (assignmentsData.success) setClassSubjects(assignmentsData.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q)
    );
  }, [subjects, search]);

  const filteredClasses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter((c) => c.name.toLowerCase().includes(q));
  }, [classes, search]);

  const hasActiveFilters = Boolean(search);
  const listCount = activeTab === 'subjects' ? filteredSubjects.length : filteredClasses.length;
  const totalCount = activeTab === 'subjects' ? subjects.length : classes.length;

  const openAddSubjectModal = () => {
    setEditingSubject(null);
    setSubjectForm({ name: '', code: '', description: '' });
    setShowSubjectModal(true);
  };

  const handleSaveSubject = async () => {
    if (!subjectForm.name.trim() || !subjectForm.code.trim()) {
      await alert('Subject name and code are required', { title: 'Notice', type: 'warning' });
      return;
    }

    try {
      const url = editingSubject ? `/api/subjects/${editingSubject.id}` : '/api/subjects';
      const method = editingSubject ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subjectForm),
      });

      const data = await response.json();
      if (data.success) {
        setShowSubjectModal(false);
        setEditingSubject(null);
        setSubjectForm({ name: '', code: '', description: '' });
        fetchData();
      } else {
        await alert(data.error || 'Failed to save subject', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error saving subject:', error);
      await alert('Failed to save subject', { title: 'Error', type: 'error' });
    }
  };

  const handleDeleteSubject = async (id: number) => {
    const confirmed = await confirm('Are you sure you want to delete this subject?', {
      title: 'Delete Subject',
      type: 'danger',
      confirmText: 'Delete',
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        fetchData();
      } else {
        await alert(data.error || 'Failed to delete subject', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting subject:', error);
      await alert('Failed to delete subject', { title: 'Error', type: 'error' });
    }
  };

  const handleEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    setSubjectForm({
      name: subject.name,
      code: subject.code,
      description: subject.description,
    });
    setShowSubjectModal(true);
  };

  const handleToggleSubjectForClass = (classId: number, subjectId: number) => {
    setClassSubjectSelections((prev) => {
      const current = prev[classId] || [];
      const updated = current.includes(subjectId)
        ? current.filter((id) => id !== subjectId)
        : [...current, subjectId];
      return { ...prev, [classId]: updated };
    });
  };

  const handleSelectAllForClass = (classId: number) => {
    setClassSubjectSelections((prev) => ({
      ...prev,
      [classId]: subjects.map((s) => s.id),
    }));
  };

  const handleDeselectAllForClass = (classId: number) => {
    setClassSubjectSelections((prev) => ({
      ...prev,
      [classId]: [],
    }));
  };

  const handleSaveForClass = async (classId: number) => {
    try {
      const response = await fetch('/api/class-subjects/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: classId,
          subject_ids: classSubjectSelections[classId] || [],
        }),
      });

      const data = await response.json();
      if (data.success) {
        await alert(data.message || 'Assignments saved', { title: 'Saved', type: 'success' });
        fetchData();
      } else {
        await alert(data.error || 'Failed to save', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error saving assignments:', error);
      await alert('Failed to save assignments', { title: 'Error', type: 'error' });
    }
  };

  const toggleExpandClass = (classId: number) => {
    setExpandedClassId((prev) => (prev === classId ? null : classId));
  };

  const getAssignedClasses = (subjectId: number) =>
    classSubjects.filter((cs) => cs.subject_id === subjectId);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl text-gray-900 flex items-center gap-2">
                <FiBook className="text-primary-600" size={20} />
                Subjects
              </h1>
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
                    1
                  </span>
                )}
                {filtersExpanded ? <FiChevronUp size={14} /> : <FiChevronRight size={14} />}
              </button>
              {activeTab === 'subjects' && (
                <button
                  onClick={openAddSubjectModal}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm"
                >
                  <FiPlus size={16} />
                  Add Subject
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-1 border-b border-gray-200">
            <button
              onClick={() => {
                setActiveTab('subjects');
                setSearch('');
                setExpandedClassId(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'subjects'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FiBook size={14} />
              Subjects ({subjects.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('assignments');
                setSearch('');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'assignments'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FiUsers size={14} />
              Class Assignments ({classes.length})
            </button>
          </div>

          {filtersExpanded && (
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
              <div className="relative">
                <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder={
                    activeTab === 'subjects'
                      ? 'Search subjects by name, code...'
                      : 'Search classes...'
                  }
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm text-gray-900"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {hasActiveFilters && (
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs">
                    Search: &quot;{search}&quot;
                  </span>
                  <button
                    onClick={() => setSearch('')}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                  >
                    <FiX size={14} />
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}

          {!filtersExpanded && hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-gray-500">Filtered:</span>
              <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full">
                &quot;{search}&quot;
              </span>
              <button onClick={() => setSearch('')} className="text-gray-500 hover:text-gray-800 underline">
                Clear
              </button>
            </div>
          )}
        </div>

        {activeTab === 'subjects' && (
          <QuickAddSubjectsPanel
            onSubjectsAdded={fetchData}
            onNotify={async (message, type) => {
              await alert(message, {
                title: type === 'error' ? 'Error' : type === 'warning' ? 'Notice' : 'Saved',
                type,
              });
            }}
          />
        )}

        <div className="bg-white rounded-lg shadow flex flex-col min-h-0">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 text-sm text-gray-600">
            {loading ? (
              'Loading...'
            ) : (
              <>
                Showing <span className="font-semibold text-gray-900">{listCount}</span>
                {listCount !== totalCount && (
                  <>
                    {' '}
                    of <span className="font-semibold text-gray-900">{totalCount}</span>
                  </>
                )}
              </>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
            </div>
          ) : activeTab === 'subjects' ? (
            filteredSubjects.length === 0 ? (
              <div className="p-10 text-center">
                <FiBook className="mx-auto text-gray-300 text-4xl mb-3" />
                <h3 className="text-base font-semibold text-gray-900">No subjects found</h3>
                <button
                  onClick={openAddSubjectModal}
                  className="mt-3 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm inline-flex items-center gap-1"
                >
                  <FiPlus /> Add Subject
                </button>
              </div>
            ) : (
              <div className="overflow-auto max-h-[calc(100vh-240px)]">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                        Subject
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                        Code
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                        Description
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                        Classes
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredSubjects.map((subject) => {
                      const assigned = getAssignedClasses(subject.id);
                      return (
                        <tr key={subject.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5">
                            <div className="text-sm font-medium text-gray-900">{subject.name}</div>
                          </td>
                          <td className="px-4 py-2.5 text-sm text-gray-600 font-mono">{subject.code}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-600 max-w-xs truncate">
                            {subject.description || '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            {assigned.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-md">
                                {assigned.map((cs) => (
                                  <span
                                    key={cs.id}
                                    className="px-2 py-0.5 bg-primary-50 text-primary-700 text-xs font-medium rounded border border-primary-200"
                                  >
                                    {cs.class_name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Not assigned</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <button
                                onClick={() => handleEditSubject(subject)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                                title="Edit"
                              >
                                <FiEdit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteSubject(subject.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Delete"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : filteredClasses.length === 0 ? (
            <div className="p-10 text-center">
              <FiUsers className="mx-auto text-gray-300 text-4xl mb-3" />
              <h3 className="text-base font-semibold text-gray-900">No classes found</h3>
              <p className="text-sm text-gray-600 mt-1">Create classes first, then assign subjects.</p>
            </div>
          ) : subjects.length === 0 ? (
            <div className="p-10 text-center">
              <FiBook className="mx-auto text-gray-300 text-4xl mb-3" />
              <h3 className="text-base font-semibold text-gray-900">No subjects to assign</h3>
              <button
                onClick={() => setActiveTab('subjects')}
                className="mt-3 text-primary-600 text-sm underline"
              >
                Add subjects first
              </button>
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(100vh-240px)]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="w-10 px-3 py-2.5" />
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                      Class
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                      Selected
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                      Assigned
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredClasses.map((cls) => {
                    const selectedForClass = classSubjectSelections[cls.id] || [];
                    const assignedCount = classSubjects.filter((cs) => cs.class_id === cls.id).length;
                    const isExpanded = expandedClassId === cls.id;

                    return (
                      <Fragment key={cls.id}>
                        <tr className={`hover:bg-gray-50 ${isExpanded ? 'bg-primary-50/30' : ''}`}>
                          <td className="px-3 py-2.5">
                            <button
                              onClick={() => toggleExpandClass(cls.id)}
                              className="p-1 text-gray-500 hover:text-primary-600 rounded"
                              title="Assign subjects"
                            >
                              {isExpanded ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                            </button>
                          </td>
                          <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{cls.name}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-700">
                            {selectedForClass.length} / {subjects.length}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-gray-700">{assignedCount}</td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleSelectAllForClass(cls.id)}
                                className="px-2 py-1 text-xs text-primary-700 hover:bg-primary-50 rounded"
                              >
                                All
                              </button>
                              <button
                                onClick={() => handleDeselectAllForClass(cls.id)}
                                className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                              >
                                Clear
                              </button>
                              <button
                                onClick={() => handleSaveForClass(cls.id)}
                                className="px-2.5 py-1 bg-primary-600 text-white rounded text-xs hover:bg-primary-700 inline-flex items-center gap-1"
                              >
                                <FiSave size={12} />
                                Save
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={5} className="p-0">
                              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                                <p className="text-xs text-gray-600 mb-2">
                                  Toggle subjects for {cls.name}
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                                  {subjects.map((subject) => {
                                    const isChecked = selectedForClass.includes(subject.id);
                                    return (
                                      <button
                                        key={subject.id}
                                        type="button"
                                        onClick={() => handleToggleSubjectForClass(cls.id, subject.id)}
                                        className={`px-2.5 py-1.5 rounded-md border text-xs font-medium text-left transition-colors ${
                                          isChecked
                                            ? 'bg-primary-600 text-white border-primary-600'
                                            : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                                        }`}
                                      >
                                        {isChecked && <FiCheck className="inline mr-1" size={12} />}
                                        <span className="block truncate">{subject.name}</span>
                                        <span
                                          className={`block text-[10px] truncate ${
                                            isChecked ? 'text-primary-100' : 'text-gray-500'
                                          }`}
                                        >
                                          {subject.code}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showSubjectModal && (
        <AppModal open={showSubjectModal} onClose={() => { setShowSubjectModal(false); setEditingSubject(null); }}>
      <div className={APP_MODAL_PANEL}>
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingSubject ? 'Edit Subject' : 'Add Subject'}
              </h2>
              <button
                onClick={() => {
                  setShowSubjectModal(false);
                  setEditingSubject(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900"
                  placeholder="e.g. Mathematics"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900"
                  placeholder="e.g. MATH"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={subjectForm.description}
                  onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900"
                  placeholder="Brief description"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t">
              <button
                onClick={() => {
                  setShowSubjectModal(false);
                  setEditingSubject(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSubject}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
              >
                {editingSubject ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
          </AppModal>
      )}
    </DashboardLayout>
  );
}
