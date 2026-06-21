'use client';

import AppModal from '@/shared/components/common/AppModal';
import { Fragment, Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';
import { useDialog } from '@/shared/context/DialogContext';
import { Class, Section } from '@/shared/types';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiLayers,
  FiSearch,
  FiX,
  FiSave,
  FiToggleLeft,
  FiToggleRight,
  FiChevronDown,
  FiChevronRight,
  FiGrid,
  FiCheck,
  FiFilter,
  FiChevronUp,
  FiBookOpen,
} from 'react-icons/fi';
import LessonPlansTab from '@/features/classes/components/LessonPlansTab';

interface AcademicYear {
  id: number;
  name: string;
  is_active: boolean;
}

interface ClassForm {
  name: string;
  description: string;
  academic_year: string;
  is_active: boolean;
}

interface SectionForm {
  name: string;
  capacity: string;
  is_active: boolean;
  class_ids: number[];
}

const emptyClassForm: ClassForm = {
  name: '',
  description: '',
  academic_year: '',
  is_active: true,
};

const emptySectionForm: SectionForm = {
  name: '',
  capacity: '',
  is_active: true,
  class_ids: [],
};

function ClassesPageContent() {
  const { alert } = useDialog();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'classes' | 'sections' | 'lesson-plans'>('classes');
  const [classes, setClasses] = useState<Class[]>([]);
  const [allSections, setAllSections] = useState<Section[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Class state
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showClassModal, setShowClassModal] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [classForm, setClassForm] = useState<ClassForm>(emptyClassForm);
  const [savingClass, setSavingClass] = useState(false);
  const [classMessage, setClassMessage] = useState('');
  const [deletingClass, setDeletingClass] = useState<Class | null>(null);
  const [expandedClassId, setExpandedClassId] = useState<number | null>(null);
  const [assignedSectionIds, setAssignedSectionIds] = useState<number[]>([]);
  const [savingAssignments, setSavingAssignments] = useState(false);

  // Section state
  const [sectionStatusFilter, setSectionStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [sectionForm, setSectionForm] = useState<SectionForm>(emptySectionForm);
  const [savingSection, setSavingSection] = useState(false);
  const [sectionMessage, setSectionMessage] = useState('');
  const [deletingSection, setDeletingSection] = useState<Section | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [classesRes, sectionsRes, yearsRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/sections'),
        fetch('/api/academic-years'),
      ]);
      const [classesData, sectionsData, yearsData] = await Promise.all([
        classesRes.json(),
        sectionsRes.json(),
        yearsRes.json(),
      ]);
      if (classesData.success) setClasses(classesData.data);
      if (sectionsData.success) setAllSections(sectionsData.data);
      if (yearsData.success) setAcademicYears(yearsData.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'sections') setActiveTab('sections');
    else if (tab === 'lesson-plans') setActiveTab('lesson-plans');
    else if (tab === 'classes') setActiveTab('classes');
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const loadClassAssignments = async (classId: number) => {
    try {
      const res = await fetch(`/api/sections?class_id=${classId}`);
      const data = await res.json();
      if (data.success) {
        setAssignedSectionIds(data.data.map((s: Section) => s.id));
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  };

  const toggleExpandClass = (classId: number) => {
    if (expandedClassId === classId) {
      setExpandedClassId(null);
      return;
    }
    setExpandedClassId(classId);
    loadClassAssignments(classId);
  };

  const filteredClasses = classes.filter((cls) => {
    const matchesSearch =
      cls.name.toLowerCase().includes(search.toLowerCase()) ||
      cls.academic_year.toLowerCase().includes(search.toLowerCase());
    const isActive = cls.is_active !== false;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && isActive) ||
      (statusFilter === 'inactive' && !isActive);
    return matchesSearch && matchesStatus;
  });

  const filteredSections = allSections.filter((sec) => {
    const matchesSearch = sec.name.toLowerCase().includes(search.toLowerCase());
    const isActive = sec.is_active !== false;
    const matchesStatus =
      sectionStatusFilter === 'all' ||
      (sectionStatusFilter === 'active' && isActive) ||
      (sectionStatusFilter === 'inactive' && !isActive);
    return matchesSearch && matchesStatus;
  });

  // --- Class handlers ---
  const openAddClassModal = () => {
    const activeYear = academicYears.find((y) => y.is_active)?.name || '';
    setEditingClass(null);
    setClassForm({ ...emptyClassForm, academic_year: activeYear });
    setClassMessage('');
    setShowClassModal(true);
  };

  const openEditClassModal = (cls: Class) => {
    setEditingClass(cls);
    setClassForm({
      name: cls.name,
      description: cls.description || '',
      academic_year: cls.academic_year,
      is_active: cls.is_active !== false,
    });
    setClassMessage('');
    setShowClassModal(true);
  };

  const handleSaveClass = async () => {
    if (!classForm.name.trim()) { setClassMessage('Class name is required'); return; }
    if (!classForm.academic_year) { setClassMessage('Academic year is required'); return; }

    setSavingClass(true);
    setClassMessage('');
    try {
      const url = editingClass ? `/api/classes/${editingClass.id}` : '/api/classes';
      const res = await fetch(url, {
        method: editingClass ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowClassModal(false);
        fetchData();
      } else {
        setClassMessage(data.error || 'Failed to save class');
      }
    } catch {
      setClassMessage('Failed to save class');
    } finally {
      setSavingClass(false);
    }
  };

  const handleToggleClassStatus = async (cls: Class) => {
    const res = await fetch(`/api/classes/${cls.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: cls.is_active === false }),
    });
    const data = await res.json();
    if (data.success) fetchData();
    else await alert(data.error || 'Failed to update status', { title: 'Error', type: 'error' });
  };

  const handleConfirmDeleteClass = async () => {
    if (!deletingClass) return;
    const res = await fetch(`/api/classes/${deletingClass.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      setDeletingClass(null);
      if (expandedClassId === deletingClass.id) setExpandedClassId(null);
      fetchData();
    } else {
      await alert(data.error || 'Failed to delete class', { title: 'Error', type: 'error' });
    }
  };

  const toggleSectionAssignment = (sectionId: number) => {
    setAssignedSectionIds((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    );
  };

  const handleSaveClassSections = async (classId: number) => {
    setSavingAssignments(true);
    try {
      const res = await fetch('/api/class-sections/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: classId, section_ids: assignedSectionIds }),
      });
      const data = await res.json();
      if (data.success) fetchData();
      else await alert(data.error || 'Failed to save section assignments', { title: 'Error', type: 'error' });
    } catch {
      await alert('Failed to save section assignments', { title: 'Error', type: 'error' });
    } finally {
      setSavingAssignments(false);
    }
  };

  // --- Section handlers ---
  const openAddSectionModal = () => {
    setEditingSection(null);
    setSectionForm(emptySectionForm);
    setSectionMessage('');
    setShowSectionModal(true);
  };

  const openEditSectionModal = (sec: Section) => {
    setEditingSection(sec);
    setSectionForm({
      name: sec.name,
      capacity: sec.capacity?.toString() || '',
      is_active: sec.is_active !== false,
      class_ids: sec.assigned_classes?.map((c) => c.id) || [],
    });
    setSectionMessage('');
    setShowSectionModal(true);
  };

  const toggleSectionClass = (classId: number) => {
    setSectionForm((prev) => ({
      ...prev,
      class_ids: prev.class_ids.includes(classId)
        ? prev.class_ids.filter((id) => id !== classId)
        : [...prev.class_ids, classId],
    }));
  };

  const handleSaveSection = async () => {
    if (!sectionForm.name.trim()) { setSectionMessage('Section name is required'); return; }

    setSavingSection(true);
    setSectionMessage('');
    try {
      const url = editingSection ? `/api/sections/${editingSection.id}` : '/api/sections';
      const res = await fetch(url, {
        method: editingSection ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sectionForm.name.trim(),
          capacity: sectionForm.capacity ? parseInt(sectionForm.capacity, 10) : null,
          is_active: sectionForm.is_active,
          class_ids: sectionForm.class_ids,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowSectionModal(false);
        fetchData();
        if (expandedClassId) loadClassAssignments(expandedClassId);
      } else {
        setSectionMessage(data.error || 'Failed to save section');
      }
    } catch {
      setSectionMessage('Failed to save section');
    } finally {
      setSavingSection(false);
    }
  };

  const handleToggleSectionStatus = async (sec: Section) => {
    const res = await fetch(`/api/sections/${sec.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: sec.is_active === false }),
    });
    const data = await res.json();
    if (data.success) fetchData();
    else await alert(data.error || 'Failed to update status', { title: 'Error', type: 'error' });
  };

  const handleConfirmDeleteSection = async () => {
    if (!deletingSection) return;
    const res = await fetch(`/api/sections/${deletingSection.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      setDeletingSection(null);
      fetchData();
    } else {
      await alert(data.error || 'Failed to delete section', { title: 'Error', type: 'error' });
    }
  };

  const renderClassSectionAssignPanel = (cls: Class) => (
    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <FiGrid className="text-primary-600" size={14} />
        <h4 className="text-sm font-semibold text-gray-900">Assign sections to {cls.name}</h4>
      </div>
      <p className="text-xs text-gray-600 mb-3">
        Select sections to assign. The same section can be shared across multiple classes.
      </p>

      {allSections.length === 0 ? (
        <p className="text-xs text-amber-600 mb-3">
          No sections defined yet. Go to the{' '}
          <button type="button" onClick={() => setActiveTab('sections')} className="underline font-medium">
            Sections tab
          </button>{' '}
          to create them.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 mb-3">
          {allSections.filter((s) => s.is_active !== false).map((sec) => {
            const selected = assignedSectionIds.includes(sec.id);
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => toggleSectionAssignment(sec.id)}
                className={`px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                  selected
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                }`}
              >
                {selected && <FiCheck className="inline mr-1" size={12} />}
                {sec.name}
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => handleSaveClassSections(cls.id)}
        disabled={savingAssignments}
        className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-xs flex items-center gap-1.5"
      >
        <FiSave size={14} />
        {savingAssignments ? 'Saving...' : `Save (${assignedSectionIds.length})`}
      </button>
    </div>
  );

  const activeStatusFilter =
    activeTab === 'classes' ? statusFilter : activeTab === 'sections' ? sectionStatusFilter : 'all';
  const hasActiveFilters =
    activeTab !== 'lesson-plans' && Boolean(search || activeStatusFilter !== 'all');
  const activeFilterCount = [search, activeStatusFilter !== 'all'].filter(Boolean).length;
  const listCount =
    activeTab === 'classes'
      ? filteredClasses.length
      : activeTab === 'sections'
        ? filteredSections.length
        : 0;
  const totalCount =
    activeTab === 'classes'
      ? classes.length
      : activeTab === 'sections'
        ? allSections.length
        : 0;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl text-gray-900 flex items-center gap-2">
                <FiLayers className="text-primary-600" size={20} />
                Classes & Sections
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFiltersExpanded((prev) => !prev)}
                aria-expanded={filtersExpanded}
                className={`border px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${
                  activeTab === 'lesson-plans'
                    ? 'hidden'
                    : filtersExpanded || hasActiveFilters
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
                {filtersExpanded ? <FiChevronUp size={14} /> : <FiChevronRight size={14} />}
              </button>
              {activeTab !== 'lesson-plans' && (
                <button
                  onClick={activeTab === 'classes' ? openAddClassModal : openAddSectionModal}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm"
                >
                  <FiPlus size={16} />
                  {activeTab === 'classes' ? 'Add Class' : 'Add Section'}
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-1 border-b border-gray-200">
            <button
              onClick={() => {
                setActiveTab('classes');
                setSearch('');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'classes'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FiLayers size={14} />
              Classes ({classes.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('sections');
                setSearch('');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'sections'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FiGrid size={14} />
              Sections ({allSections.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('lesson-plans');
                setSearch('');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'lesson-plans'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FiBookOpen size={14} />
              Lesson Plans
            </button>
          </div>

          {activeTab !== 'lesson-plans' && filtersExpanded && (
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={activeTab === 'classes' ? 'Search classes...' : 'Search sections...'}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm text-gray-900"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white sm:w-44"
                  value={activeStatusFilter}
                  onChange={(e) => {
                    const v = e.target.value as 'all' | 'active' | 'inactive';
                    if (activeTab === 'classes') setStatusFilter(v);
                    else setSectionStatusFilter(v);
                  }}
                >
                  <option value="all">All status</option>
                  <option value="active">Active only</option>
                  <option value="inactive">Disabled only</option>
                </select>
              </div>
              {hasActiveFilters && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {search && (
                      <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full">
                        Search: &quot;{search}&quot;
                      </span>
                    )}
                    {activeStatusFilter !== 'all' && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full capitalize">
                        {activeStatusFilter}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSearch('');
                      if (activeTab === 'classes') setStatusFilter('all');
                      else setSectionStatusFilter('all');
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                  >
                    <FiX size={14} />
                    Clear all
                  </button>
                </div>
              )}
            </div>
          )}

          {!filtersExpanded && hasActiveFilters && activeTab !== 'lesson-plans' && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-gray-500">Filtered:</span>
              {search && (
                <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full">
                  &quot;{search}&quot;
                </span>
              )}
              {activeStatusFilter !== 'all' && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full capitalize">
                  {activeStatusFilter}
                </span>
              )}
              <button
                onClick={() => {
                  setSearch('');
                  if (activeTab === 'classes') setStatusFilter('all');
                  else setSectionStatusFilter('all');
                }}
                className="text-gray-500 hover:text-gray-800 underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {activeTab === 'lesson-plans' ? (
          <LessonPlansTab classes={classes} academicYears={academicYears} />
        ) : (
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
          ) : activeTab === 'classes' ? (
            filteredClasses.length === 0 ? (
              <div className="p-10 text-center">
                <FiLayers className="mx-auto text-gray-300 text-4xl mb-3" />
                <h3 className="text-base font-semibold text-gray-900">No classes found</h3>
                <button onClick={openAddClassModal} className="mt-3 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm">
                  <FiPlus className="inline mr-1" /> Add Class
                </button>
              </div>
            ) : (
              <div className="overflow-auto max-h-[calc(100vh-240px)]">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="w-10 px-3 py-2.5" />
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Sections</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredClasses.map((cls) => {
                      const isActive = cls.is_active !== false;
                      const isExpanded = expandedClassId === cls.id;
                      return (
                        <Fragment key={cls.id}>
                          <tr className={`hover:bg-gray-50 ${isExpanded ? 'bg-primary-50/30' : ''}`}>
                            <td className="px-3 py-2.5">
                              <button
                                onClick={() => toggleExpandClass(cls.id)}
                                className="p-1 text-gray-500 hover:text-primary-600 rounded"
                                title="Assign sections"
                              >
                                {isExpanded ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                              </button>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="text-sm font-medium text-gray-900">{cls.name}</div>
                              {cls.description && (
                                <div className="text-xs text-gray-500 truncate max-w-[200px]">{cls.description}</div>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-sm text-gray-700">{cls.academic_year}</td>
                            <td className="px-4 py-2.5">
                              <button
                                onClick={() => toggleExpandClass(cls.id)}
                                className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                              >
                                {cls.section_count ?? 0}
                              </button>
                            </td>
                            <td className="px-4 py-2.5 text-sm text-gray-700">{cls.student_count ?? 0}</td>
                            <td className="px-4 py-2.5">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                  isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {isActive ? 'Active' : 'Disabled'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-0.5">
                                <button
                                  onClick={() => handleToggleClassStatus(cls)}
                                  className={`p-1.5 rounded-lg ${isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}
                                  title={isActive ? 'Disable' : 'Enable'}
                                >
                                  {isActive ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
                                </button>
                                <button
                                  onClick={() => openEditClassModal(cls)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                                  title="Edit"
                                >
                                  <FiEdit2 size={16} />
                                </button>
                                <button
                                  onClick={() => setDeletingClass(cls)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                  title="Delete"
                                >
                                  <FiTrash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="p-0">
                                {renderClassSectionAssignPanel(cls)}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : filteredSections.length === 0 ? (
            <div className="p-10 text-center">
              <FiGrid className="mx-auto text-gray-300 text-4xl mb-3" />
              <h3 className="text-base font-semibold text-gray-900">No sections found</h3>
              <p className="text-sm text-gray-600 mt-1">Create shared sections like A, B, C and assign them to classes.</p>
              <button onClick={openAddSectionModal} className="mt-3 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm">
                <FiPlus className="inline mr-1" /> Add Section
              </button>
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(100vh-240px)]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Section</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Capacity</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Assigned Classes</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSections.map((sec) => {
                    const isActive = sec.is_active !== false;
                    const assigned = sec.assigned_classes || [];
                    return (
                      <tr key={sec.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <div className="text-sm font-medium text-gray-900">{sec.name}</div>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-700">{sec.capacity ?? '—'}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-700">{sec.student_count ?? 0}</td>
                        <td className="px-4 py-2.5">
                          {assigned.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-md">
                              {assigned.map((c) => (
                                <span
                                  key={c.id}
                                  className="px-2 py-0.5 bg-primary-50 text-primary-700 text-xs font-medium rounded border border-primary-200"
                                >
                                  {c.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Not assigned</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              onClick={() => handleToggleSectionStatus(sec)}
                              className={`p-1.5 rounded ${isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}
                              title={isActive ? 'Disable' : 'Enable'}
                            >
                              {isActive ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
                            </button>
                            <button
                              onClick={() => openEditSectionModal(sec)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit"
                            >
                              <FiEdit2 size={16} />
                            </button>
                            <button
                              onClick={() => setDeletingSection(sec)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
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
          )}
        </div>
        )}

      {/* Class Modal */}
      {showClassModal && (
        <AppModal open={showClassModal} onClose={() => setShowClassModal(false)}>
          <div className="flex flex-col h-full w-full min-h-0 min-w-0 bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">{editingClass ? 'Edit Class' : 'Add Class'}</h2>
              <button onClick={() => setShowClassModal(false)} className="p-2 text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {classMessage && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{classMessage}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Name <span className="text-red-500">*</span></label>
                <input type="text" className="w-full px-4 py-2 border rounded-lg text-gray-900" value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} placeholder="e.g. Class 10" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={2} className="w-full px-4 py-2 border rounded-lg text-gray-900" value={classForm.description} onChange={(e) => setClassForm({ ...classForm, description: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year <span className="text-red-500">*</span></label>
                <select className="w-full px-4 py-2 border rounded-lg text-gray-900 bg-white" value={classForm.academic_year} onChange={(e) => setClassForm({ ...classForm, academic_year: e.target.value })}>
                  <option value="">Select academic year</option>
                  {academicYears.map((y) => <option key={y.id} value={y.name}>{y.name}{y.is_active ? ' (Active)' : ''}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={classForm.is_active} onChange={(e) => setClassForm({ ...classForm, is_active: e.target.checked })} className="h-4 w-4" />
                Class is active
              </label>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t">
              <button onClick={() => setShowClassModal(false)} className="px-4 py-2 border rounded-lg text-gray-700">Cancel</button>
              <button onClick={handleSaveClass} disabled={savingClass} className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2">
                <FiSave /> {savingClass ? 'Saving...' : editingClass ? 'Update' : 'Add Class'}
              </button>
            </div>
          </div>
        </AppModal>
      )}

      {/* Section Modal */}
      {showSectionModal && (
        <AppModal open={showSectionModal} onClose={() => setShowSectionModal(false)}>
          <div className="flex flex-col h-full w-full min-h-0 min-w-0 bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">{editingSection ? 'Edit Section' : 'Add Section'}</h2>
              <button onClick={() => setShowSectionModal(false)} className="p-2 text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {sectionMessage && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{sectionMessage}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section Name <span className="text-red-500">*</span></label>
                <input type="text" className="w-full px-4 py-2 border rounded-lg text-gray-900" value={sectionForm.name} onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })} placeholder="e.g. A, B, C" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                <input type="number" className="w-full px-4 py-2 border rounded-lg text-gray-900" value={sectionForm.capacity} onChange={(e) => setSectionForm({ ...sectionForm, capacity: e.target.value })} placeholder="Optional" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={sectionForm.is_active} onChange={(e) => setSectionForm({ ...sectionForm, is_active: e.target.checked })} className="h-4 w-4" />
                Section is active
              </label>

              <div className="pt-3 border-t">
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Classes</label>
                <p className="text-xs text-gray-500 mb-3">Select all classes that should have this section.</p>
                {classes.length === 0 ? (
                  <p className="text-sm text-amber-600">Create classes first.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {classes.map((cls) => {
                      const selected = sectionForm.class_ids.includes(cls.id);
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => toggleSectionClass(cls.id)}
                          className={`px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                            selected ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                          }`}
                        >
                          {selected && <FiCheck className="inline mr-1" size={14} />}
                          {cls.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t">
              <button onClick={() => setShowSectionModal(false)} className="px-4 py-2 border rounded-lg text-gray-700">Cancel</button>
              <button onClick={handleSaveSection} disabled={savingSection} className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2">
                <FiSave /> {savingSection ? 'Saving...' : editingSection ? 'Update' : 'Add Section'}
              </button>
            </div>
          </div>
        </AppModal>
      )}

      <ConfirmDialog
        isOpen={!!deletingClass}
        title="Delete Class"
        message={`Delete "${deletingClass?.name}"? Section assignments will be removed. Sections themselves are kept.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDeleteClass}
        onCancel={() => setDeletingClass(null)}
        type="danger"
      />

      <ConfirmDialog
        isOpen={!!deletingSection}
        title="Delete Section"
        message={`Delete section "${deletingSection?.name}"? It will be removed from all assigned classes.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDeleteSection}
        onCancel={() => setDeletingSection(null)}
        type="danger"
      />
      </div>
    </DashboardLayout>
  );
}

export default function ClassesPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center py-16 text-gray-500">Loading…</div>
        </DashboardLayout>
      }
    >
      <ClassesPageContent />
    </Suspense>
  );
}
