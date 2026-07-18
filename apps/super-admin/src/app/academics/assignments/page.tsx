'use client';

import AssignTeacherModal, {
  type AssignTeacherForm,
} from '@/features/academics/components/AssignTeacherModal';
import type {
  AcademicAssignmentsOverview,
  AssignmentTab,
  ClassOption,
  ClassSubjectLink,
  ClassSubjectRow,
  CoTeachingRow,
  SectionOption,
  StaffOption,
  SubjectOption,
  TeacherAssignmentRow,
  WorkloadRow,
} from '@/features/academics/types/academic-assignments';
import {
  formatAssignedSince,
  sectionLabel,
} from '@/features/academics/types/academic-assignments';
import { compareClassNames, sortClassesByName } from '@/lib/class-sort';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { useDialog } from '@/shared/context/DialogContext';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiBookOpen,
  FiLayers,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
  FiUpload,
  FiUserCheck,
  FiUsers,
} from 'react-icons/fi';

const TABS: { id: AssignmentTab; label: string }[] = [
  { id: 'class-wise', label: 'Class-wise' },
  { id: 'teacher-wise', label: 'Teacher-wise' },
  { id: 'subject-wise', label: 'Subject-wise' },
  { id: 'bulk', label: 'Bulk Assignment' },
  { id: 'workload', label: 'Workload' },
];

const EMPTY_FORM: AssignTeacherForm = {
  staff_id: '',
  class_id: '',
  section_id: '',
  subject_id: '',
  academic_year: '',
  is_class_teacher: false,
};

const selectClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500';

interface AssignmentFilters {
  classId: string;
  sectionId: string;
  subjectId: string;
  staffId: string;
}

const EMPTY_FILTERS: AssignmentFilters = {
  classId: '',
  sectionId: '',
  subjectId: '',
  staffId: '',
};

function applyAssignmentFilters(rows: TeacherAssignmentRow[], filters: AssignmentFilters) {
  return rows.filter((row) => {
    if (filters.classId && row.class_id !== Number(filters.classId)) return false;
    if (filters.sectionId && row.section_id !== Number(filters.sectionId)) return false;
    if (filters.subjectId && row.subject_id !== Number(filters.subjectId)) return false;
    if (filters.staffId && row.staff_id !== Number(filters.staffId)) return false;
    return true;
  });
}

export default function AcademicAssignmentsPage() {
  const { alert, confirm } = useDialog();
  const [activeTab, setActiveTab] = useState<AssignmentTab>('class-wise');
  const [academicYear, setAcademicYear] = useState('');
  const [filters, setFilters] = useState<AssignmentFilters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AcademicAssignmentsOverview>({
    assignments: [],
    classSubjects: [],
    workload: [],
    coTeaching: [],
  });

  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubjectLink[]>([]);
  const [academicYears, setAcademicYears] = useState<{ name: string; is_active?: boolean }[]>([]);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState<AssignTeacherForm>(EMPTY_FORM);
  const [assignSaving, setAssignSaving] = useState(false);

  const [bulkForm, setBulkForm] = useState({
    staff_id: '',
    class_id: '',
    section_id: '',
    academic_year: '',
    subject_ids: [] as number[],
    is_class_teacher: false,
  });
  const [bulkSaving, setBulkSaving] = useState(false);

  const loadReferenceData = useCallback(async () => {
    const [staffRes, classesRes, sectionsRes, subjectsRes, csRes, yearsRes] = await Promise.all([
      fetch('/api/staff?limit=300&status=active'),
      fetch('/api/classes?active_only=true'),
      fetch('/api/sections'),
      fetch('/api/subjects'),
      fetch('/api/class-subjects'),
      fetch('/api/academic-years'),
    ]);

    const [staffData, classesData, sectionsData, subjectsData, csData, yearsData] =
      await Promise.all([
        staffRes.json(),
        classesRes.json(),
        sectionsRes.json(),
        subjectsRes.json(),
        csRes.json(),
        yearsRes.json(),
      ]);

    if (staffData.success) {
      setStaff(
        [...staffData.data].sort((a: StaffOption, b: StaffOption) =>
          `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`),
        ),
      );
    }
    if (classesData.success) setClasses(sortClassesByName(classesData.data));
    if (sectionsData.success) setSections(sectionsData.data);
    if (subjectsData.success) {
      setSubjects(
        [...subjectsData.data].sort((a: SubjectOption, b: SubjectOption) =>
          a.name.localeCompare(b.name),
        ),
      );
    }
    if (csData.success) {
      setClassSubjects(
        csData.data.map((row: ClassSubjectRow) => ({
          class_id: row.class_id,
          subject_id: row.subject_id,
          subject_name: row.subject_name,
          subject_code: row.subject_code,
        })),
      );
    }
    if (yearsData.success) {
      setAcademicYears(yearsData.data);
      const active =
        yearsData.data.find((y: { is_active?: boolean }) => y.is_active) || yearsData.data[0];
      if (active) {
        setAcademicYear(active.name);
        setAssignForm((prev) => ({ ...prev, academic_year: active.name }));
        setBulkForm((prev) => ({ ...prev, academic_year: active.name }));
      }
    }
  }, []);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (academicYear) params.set('academic_year', academicYear);
      const res = await fetch(`/api/academic-assignments/overview?${params}`);
      const data = await res.json();
      if (data.success) setOverview(data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => {
    void loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    if (!academicYear) return;
    void loadOverview();
  }, [loadOverview, academicYear]);

  const sortedClasses = useMemo(() => sortClassesByName(classes), [classes]);

  const filterSections = useMemo(() => {
    const list = filters.classId
      ? sections.filter((section) => String(section.class_id) === filters.classId)
      : sections;
    return [...list].sort((a, b) => compareClassNames(a.name, b.name));
  }, [sections, filters.classId]);

  const filteredAssignments = useMemo(
    () => applyAssignmentFilters(overview.assignments, filters),
    [overview.assignments, filters],
  );

  const filteredClassSubjects = useMemo(() => {
    let rows = overview.classSubjects;
    if (filters.classId) rows = rows.filter((row) => String(row.class_id) === filters.classId);
    if (filters.subjectId) rows = rows.filter((row) => String(row.subject_id) === filters.subjectId);
    return rows;
  }, [overview.classSubjects, filters.classId, filters.subjectId]);

  const filteredCoTeaching = useMemo(() => {
    return overview.coTeaching.filter((row) => {
      if (filters.classId && String(row.class_id) !== filters.classId) return false;
      if (filters.sectionId && String(row.section_id ?? '') !== filters.sectionId) return false;
      if (filters.subjectId && String(row.subject_id) !== filters.subjectId) return false;
      if (filters.staffId) {
        const staffId = Number(filters.staffId);
        if (!row.teachers.some((teacher) => teacher.staff_id === staffId)) return false;
      }
      return true;
    });
  }, [overview.coTeaching, filters]);

  const classWiseGroups = useMemo(() => {
    const map = new Map<
      number,
      {
        class_id: number;
        class_name: string;
        subjects: {
          subject_id: number;
          subject_name: string;
          subject_code: string | null;
          teachers: TeacherAssignmentRow[];
        }[];
      }
    >();

    for (const cs of filteredClassSubjects) {
      if (!map.has(cs.class_id)) {
        map.set(cs.class_id, {
          class_id: cs.class_id,
          class_name: cs.class_name,
          subjects: [],
        });
      }
      let teachers = filteredAssignments.filter(
        (a) => a.class_id === cs.class_id && a.subject_id === cs.subject_id,
      );
      if (filters.sectionId) {
        teachers = teachers.filter((a) => String(a.section_id ?? '') === filters.sectionId);
      }
      if (filters.staffId) {
        teachers = teachers.filter((a) => String(a.staff_id) === filters.staffId);
      }
      map.get(cs.class_id)!.subjects.push({
        subject_id: cs.subject_id,
        subject_name: cs.subject_name,
        subject_code: cs.subject_code,
        teachers,
      });
    }

    return Array.from(map.values()).sort((a, b) => compareClassNames(a.class_name, b.class_name));
  }, [filteredClassSubjects, filteredAssignments, filters.sectionId, filters.staffId]);

  const teacherWiseGroups = useMemo(() => {
    const map = new Map<
      number,
      {
        staff_id: number;
        teacher_name: string;
        employee_id: string;
        assignments: TeacherAssignmentRow[];
      }
    >();

    for (const row of filteredAssignments) {
      if (!map.has(row.staff_id)) {
        map.set(row.staff_id, {
          staff_id: row.staff_id,
          teacher_name: row.teacher_name,
          employee_id: row.employee_id,
          assignments: [],
        });
      }
      map.get(row.staff_id)!.assignments.push(row);
    }

    return Array.from(map.values()).sort((a, b) => a.teacher_name.localeCompare(b.teacher_name));
  }, [filteredAssignments]);

  const subjectWiseGroups = useMemo(() => {
    const map = new Map<
      number,
      {
        subject_id: number;
        subject_name: string;
        subject_code: string | null;
        assignments: TeacherAssignmentRow[];
      }
    >();

    for (const row of filteredAssignments) {
      if (!row.subject_id) continue;
      if (!map.has(row.subject_id)) {
        map.set(row.subject_id, {
          subject_id: row.subject_id,
          subject_name: row.subject_name || 'Unknown',
          subject_code: row.subject_code,
          assignments: [],
        });
      }
      map.get(row.subject_id)!.assignments.push(row);
    }

    return Array.from(map.values()).sort((a, b) => a.subject_name.localeCompare(b.subject_name));
  }, [filteredAssignments]);

  const filteredWorkload = useMemo(() => {
    let rows = overview.workload;
    if (filters.staffId) {
      rows = rows.filter((row) => String(row.staff_id) === filters.staffId);
    }
    if (filters.classId || filters.sectionId || filters.subjectId) {
      const staffIds = new Set(filteredAssignments.map((row) => row.staff_id));
      rows = rows.filter((row) => staffIds.has(row.staff_id));
    }
    return rows;
  }, [overview.workload, filteredAssignments, filters]);

  const bulkClassSubjects = useMemo(() => {
    if (!bulkForm.class_id) return [];
    const seen = new Set<number>();
    return classSubjects
      .filter((cs) => String(cs.class_id) === bulkForm.class_id)
      .filter((cs) => {
        if (seen.has(cs.subject_id)) return false;
        seen.add(cs.subject_id);
        return true;
      });
  }, [bulkForm.class_id, classSubjects]);

  const bulkSections = useMemo(() => {
    const list = sections.filter((s) => String(s.class_id) === bulkForm.class_id);
    return [...list].sort((a, b) => compareClassNames(a.name, b.name));
  }, [sections, bulkForm.class_id]);

  const updateFilters = (patch: Partial<AssignmentFilters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      if (patch.classId !== undefined && patch.classId !== prev.classId) {
        next.sectionId = '';
      }
      return next;
    });
  };

  const openAssignModal = () => {
    const active = academicYears.find((y) => y.is_active);
    setAssignForm({
      ...EMPTY_FORM,
      academic_year: academicYear || active?.name || '',
    });
    setShowAssignModal(true);
  };

  const openAssignModalForSubject = (classId: number, subjectId: number) => {
    setAssignForm({
      staff_id: filters.staffId || '',
      class_id: String(classId),
      section_id: filters.sectionId || '',
      subject_id: String(subjectId),
      academic_year: academicYear || academicYears.find((y) => y.is_active)?.name || '',
      is_class_teacher: false,
    });
    setShowAssignModal(true);
  };

  const submitAssignment = async () => {
    setAssignSaving(true);
    try {
      const res = await fetch('/api/teacher-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: parseInt(assignForm.staff_id, 10),
          class_id: parseInt(assignForm.class_id, 10),
          section_id: assignForm.section_id ? parseInt(assignForm.section_id, 10) : null,
          subject_id: assignForm.subject_id ? parseInt(assignForm.subject_id, 10) : null,
          academic_year: assignForm.academic_year,
          is_class_teacher: assignForm.is_class_teacher,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAssignModal(false);
        await loadOverview();
      } else {
        await alert(data.error, { title: 'Error', type: 'error' });
      }
    } finally {
      setAssignSaving(false);
    }
  };

  const removeAssignment = async (id: number) => {
    const ok = await confirm('Remove this assignment?', { title: 'Confirm', type: 'warning' });
    if (!ok) return;
    const res = await fetch(`/api/teacher-assignments?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) await loadOverview();
    else await alert(data.error || 'Failed to remove assignment', { title: 'Error', type: 'error' });
  };

  const toggleBulkSubject = (subjectId: number) => {
    setBulkForm((prev) => ({
      ...prev,
      subject_ids: prev.subject_ids.includes(subjectId)
        ? prev.subject_ids.filter((id) => id !== subjectId)
        : [...prev.subject_ids, subjectId],
    }));
  };

  const submitBulkAssignments = async () => {
    if (!bulkForm.staff_id || !bulkForm.class_id || !bulkForm.academic_year) {
      await alert('Teacher, class, and academic year are required.', {
        title: 'Missing fields',
        type: 'warning',
      });
      return;
    }
    if (bulkForm.subject_ids.length === 0) {
      await alert('Select at least one subject.', { title: 'Missing subjects', type: 'warning' });
      return;
    }

    setBulkSaving(true);
    try {
      const assignments = bulkForm.subject_ids.map((subject_id) => ({
        staff_id: parseInt(bulkForm.staff_id, 10),
        class_id: parseInt(bulkForm.class_id, 10),
        section_id: bulkForm.section_id ? parseInt(bulkForm.section_id, 10) : null,
        subject_id,
        academic_year: bulkForm.academic_year,
        is_class_teacher: bulkForm.is_class_teacher,
      }));

      const res = await fetch('/api/teacher-assignments/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments }),
      });
      const data = await res.json();
      if (data.success) {
        await alert(data.message || 'Bulk assignments saved', { title: 'Saved', type: 'success' });
        setBulkForm((prev) => ({ ...prev, subject_ids: [] }));
        await loadOverview();
      } else {
        await alert(data.error || data.message || 'Bulk save failed', {
          title: 'Error',
          type: 'error',
        });
      }
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-medium text-gray-900">
              {/* <FiBookOpen className="text-primary-600" /> */}
              Academic Assignments
            </h1>
            {/* <p className="mt-1 text-sm text-gray-600">
              View class, teacher, and subject mappings, co-teaching, and workload for timetable
              planning.
            </p> */}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadOverview()}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <FiRefreshCw size={15} />
              Refresh
            </button>
            <button
              type="button"
              onClick={openAssignModal}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <FiPlus size={16} />
              Assign Teacher
            </button>
          </div>
        </div>

        {filteredCoTeaching.length > 0 && activeTab === 'subject-wise' && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <strong>{filteredCoTeaching.length}</strong> class-subject combination
            {filteredCoTeaching.length === 1 ? ' has' : 's have'} multiple teachers assigned
            (co-teaching). See Subject-wise tab for details.
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-3">
            <nav className="-mb-px flex flex-wrap gap-4 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-700'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4 space-y-4">
            <AssignmentFilterBar
              academicYear={academicYear}
              academicYears={academicYears}
              filters={filters}
              classes={sortedClasses}
              sections={filterSections}
              subjects={subjects}
              staff={staff}
              onAcademicYearChange={setAcademicYear}
              onFiltersChange={updateFilters}
              onClear={() => setFilters(EMPTY_FILTERS)}
            />

            {loading ? (
              <div className="flex h-48 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
              </div>
            ) : activeTab === 'class-wise' ? (
              <ClassWiseTab
                groups={classWiseGroups}
                onRemove={removeAssignment}
                onAssign={openAssignModalForSubject}
              />
            ) : activeTab === 'teacher-wise' ? (
              <TeacherWiseTab groups={teacherWiseGroups} onRemove={removeAssignment} />
            ) : activeTab === 'subject-wise' ? (
              <SubjectWiseTab
                groups={subjectWiseGroups}
                coTeaching={filteredCoTeaching}
                onRemove={removeAssignment}
              />
            ) : activeTab === 'bulk' ? (
              <BulkAssignmentTab
                staff={staff}
                classes={sortedClasses}
                sections={bulkSections}
                subjects={bulkClassSubjects}
                academicYears={academicYears}
                form={bulkForm}
                saving={bulkSaving}
                onChange={setBulkForm}
                onToggleSubject={toggleBulkSubject}
                onSubmit={() => void submitBulkAssignments()}
              />
            ) : (
              <WorkloadTab rows={filteredWorkload} academicYear={academicYear} />
            )}
          </div>
        </div>
      </div>

      <AssignTeacherModal
        open={showAssignModal}
        form={assignForm}
        staff={staff}
        classes={sortedClasses}
        sections={sections}
        classSubjects={classSubjects}
        subjects={subjects}
        academicYears={academicYears}
        saving={assignSaving}
        onClose={() => setShowAssignModal(false)}
        onChange={setAssignForm}
        onSubmit={() => void submitAssignment()}
      />
    </DashboardLayout>
  );
}

function ClassWiseTab({
  groups,
  onRemove,
  onAssign,
}: {
  groups: {
    class_id: number;
    class_name: string;
    subjects: {
      subject_id: number;
      subject_name: string;
      subject_code: string | null;
      teachers: TeacherAssignmentRow[];
    }[];
  }[];
  onRemove: (id: number) => void;
  onAssign: (classId: number, subjectId: number) => void;
}) {
  if (groups.length === 0) {
    return (
      <EmptyState message="No class-subject mappings found. Assign subjects to classes under Academics → Subjects." />
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.class_id} className="rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 border-b bg-gray-50 px-4 py-3">
            <FiLayers className="text-primary-600" size={16} />
            <h3 className="font-semibold text-gray-900">{group.class_name}</h3>
            <span className="text-xs text-gray-500">{group.subjects.length} subject(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b bg-white text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Subject</th>
                  <th className="px-4 py-2 text-left">Assigned Teachers</th>
                  <th className="px-4 py-2 text-left">Section</th>
                  <th className="px-4 py-2 text-left">Since</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {group.subjects.map((subject) =>
                  subject.teachers.length > 0 ? (
                    subject.teachers.map((teacher, index) => (
                      <tr key={teacher.id} className="hover:bg-gray-50">
                        {index === 0 && (
                          <td className="px-4 py-3 align-top" rowSpan={subject.teachers.length}>
                            <div className="font-medium text-gray-900">{subject.subject_name}</div>
                            {subject.subject_code && (
                              <div className="text-xs text-gray-500">{subject.subject_code}</div>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{teacher.teacher_name}</div>
                          <div className="text-xs text-gray-500">{teacher.employee_id}</div>
                          {teacher.is_class_teacher && (
                            <span className="mt-1 inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800">
                              Class Teacher
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{sectionLabel(teacher.section_name)}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {formatAssignedSince(teacher.assigned_since)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => onAssign(group.class_id, subject.subject_id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-primary-200 px-2.5 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50"
                            >
                              <FiPlus size={13} />
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemove(teacher.id)}
                              className="rounded p-1.5 text-red-500 hover:bg-red-50"
                              aria-label="Remove assignment"
                            >
                              <FiTrash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr key={subject.subject_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{subject.subject_name}</div>
                        {subject.subject_code && (
                          <div className="text-xs text-gray-500">{subject.subject_code}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-amber-600">No teacher assigned yet</td>
                      <td className="px-4 py-3 text-gray-400">—</td>
                      <td className="px-4 py-3 text-gray-400">—</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onAssign(group.class_id, subject.subject_id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
                        >
                          <FiPlus size={13} />
                          Assign Teacher
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function TeacherWiseTab({
  groups,
  onRemove,
}: {
  groups: {
    staff_id: number;
    teacher_name: string;
    employee_id: string;
    assignments: TeacherAssignmentRow[];
  }[];
  onRemove: (id: number) => void;
}) {
  if (groups.length === 0) {
    return <EmptyState message="No teacher assignments found for the selected filters." />;
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.staff_id} className="rounded-lg border border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <FiUserCheck className="text-primary-600" size={16} />
              <div>
                <h3 className="font-semibold text-gray-900">{group.teacher_name}</h3>
                <p className="text-xs text-gray-500">{group.employee_id}</p>
              </div>
            </div>
            <span className="text-xs text-gray-500">
              {group.assignments.length} assignment(s) ·{' '}
              {new Set(group.assignments.map((a) => a.class_id)).size} class(es) ·{' '}
              {new Set(group.assignments.map((a) => a.subject_id).filter(Boolean)).size} subject(s)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Class</th>
                  <th className="px-4 py-2 text-left">Section</th>
                  <th className="px-4 py-2 text-left">Subject</th>
                  <th className="px-4 py-2 text-left">Role</th>
                  <th className="px-4 py-2 text-left">Since</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {group.assignments.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.class_name}</td>
                    <td className="px-4 py-3 text-gray-600">{sectionLabel(row.section_name)}</td>
                    <td className="px-4 py-3 text-gray-600">{row.subject_name || '—'}</td>
                    <td className="px-4 py-3">
                      {row.is_class_teacher ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                          Class Teacher
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                          Subject Teacher
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatAssignedSince(row.assigned_since)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onRemove(row.id)}
                        className="rounded p-1.5 text-red-500 hover:bg-red-50"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function SubjectWiseTab({
  groups,
  coTeaching,
  onRemove,
}: {
  groups: {
    subject_id: number;
    subject_name: string;
    subject_code: string | null;
    assignments: TeacherAssignmentRow[];
  }[];
  coTeaching: CoTeachingRow[];
  onRemove: (id: number) => void;
}) {
  return (
    <div className="space-y-6">
      {coTeaching.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Co-teachers & shared subjects</h3>
          <div className="overflow-x-auto rounded-lg border border-blue-200">
            <table className="min-w-full text-sm">
              <thead className="bg-blue-50 text-xs uppercase tracking-wide text-blue-800">
                <tr>
                  <th className="px-4 py-2 text-left">Subject</th>
                  <th className="px-4 py-2 text-left">Class</th>
                  <th className="px-4 py-2 text-left">Section</th>
                  <th className="px-4 py-2 text-left">Teachers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100 bg-white">
                {coTeaching.map((row) => (
                  <tr key={`${row.class_id}-${row.section_id}-${row.subject_id}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.subject_name}</div>
                      {row.subject_code && (
                        <div className="text-xs text-gray-500">{row.subject_code}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">{row.class_name}</td>
                    <td className="px-4 py-3">{sectionLabel(row.section_name)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {row.teachers.map((teacher) => (
                          <span
                            key={teacher.staff_id}
                            className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-900"
                          >
                            {teacher.teacher_name}
                            {teacher.is_class_teacher ? ' · CT' : ''}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">All subject assignments</h3>
        {groups.length === 0 ? (
          <EmptyState message="No subject assignments found." />
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.subject_id} className="rounded-lg border border-gray-200">
                <div className="border-b bg-gray-50 px-4 py-3">
                  <h4 className="font-semibold text-gray-900">{group.subject_name}</h4>
                  {group.subject_code && (
                    <p className="text-xs text-gray-500">{group.subject_code}</p>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-2 text-left">Teacher</th>
                        <th className="px-4 py-2 text-left">Class</th>
                        <th className="px-4 py-2 text-left">Section</th>
                        <th className="px-4 py-2 text-left">Since</th>
                        <th className="px-4 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {group.assignments.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">{row.teacher_name}</td>
                          <td className="px-4 py-3">{row.class_name}</td>
                          <td className="px-4 py-3">{sectionLabel(row.section_name)}</td>
                          <td className="px-4 py-3">{formatAssignedSince(row.assigned_since)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => onRemove(row.id)}
                              className="rounded p-1.5 text-red-500 hover:bg-red-50"
                            >
                              <FiTrash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function BulkAssignmentTab({
  staff,
  classes,
  sections,
  subjects,
  academicYears,
  form,
  saving,
  onChange,
  onToggleSubject,
  onSubmit,
}: {
  staff: StaffOption[];
  classes: ClassOption[];
  sections: SectionOption[];
  subjects: ClassSubjectLink[];
  academicYears: { name: string; is_active?: boolean }[];
  form: {
    staff_id: string;
    class_id: string;
    section_id: string;
    academic_year: string;
    subject_ids: number[];
    is_class_teacher: boolean;
  };
  saving: boolean;
  onChange: (form: {
    staff_id: string;
    class_id: string;
    section_id: string;
    academic_year: string;
    subject_ids: number[];
    is_class_teacher: boolean;
  }) => void;
  onToggleSubject: (subjectId: number) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
      <div className="space-y-4 rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 text-gray-900">
          <FiUpload className="text-primary-600" />
          <h3 className="font-semibold">Bulk assign teacher</h3>
        </div>
        <p className="text-sm text-gray-600">
          Assign one teacher to multiple subjects in a class and section for the selected academic
          year.
        </p>

        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-gray-600">Teacher</span>
          <select
            value={form.staff_id}
            onChange={(e) => onChange({ ...form, staff_id: e.target.value })}
            className={selectClass}
          >
            <option value="">Select teacher</option>
            {staff.map((member) => (
              <option key={member.id} value={String(member.id)}>
                {member.first_name} {member.last_name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-gray-600">Academic Year</span>
          <select
            value={form.academic_year}
            onChange={(e) => onChange({ ...form, academic_year: e.target.value })}
            className={selectClass}
          >
            <option value="">Select year</option>
            {academicYears.map((year) => (
              <option key={year.name} value={year.name}>
                {year.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-gray-600">Class</span>
          <select
            value={form.class_id}
            onChange={(e) =>
              onChange({ ...form, class_id: e.target.value, section_id: '', subject_ids: [] })
            }
            className={selectClass}
          >
            <option value="">Select class</option>
            {classes.map((cls) => (
              <option key={cls.id} value={String(cls.id)}>
                {cls.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-gray-600">Section</span>
          <select
            value={form.section_id}
            onChange={(e) => onChange({ ...form, section_id: e.target.value })}
            className={selectClass}
            disabled={!form.class_id}
          >
            <option value="">All sections</option>
            {sections.map((section) => (
              <option key={section.id} value={String(section.id)}>
                {section.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.is_class_teacher}
            onChange={(e) => onChange({ ...form, is_class_teacher: e.target.checked })}
            className="rounded border-gray-300 text-primary-600"
          />
          Mark as class teacher
        </label>

        <button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : `Assign ${form.subject_ids.length || 0} subject(s)`}
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="mb-3 font-semibold text-gray-900">Select subjects</h3>
        {!form.class_id ? (
          <p className="text-sm text-gray-500">Choose a class to load its subjects.</p>
        ) : subjects.length === 0 ? (
          <p className="text-sm text-amber-600">
            No subjects mapped to this class.{' '}
            <Link href="/academics/subjects" className="font-medium text-primary-600 hover:underline">
              Map subjects first
            </Link>
            .
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {subjects.map((subject) => {
              const selected = form.subject_ids.includes(subject.subject_id);
              return (
                <button
                  key={subject.subject_id}
                  type="button"
                  onClick={() => onToggleSubject(subject.subject_id)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    selected
                      ? 'border-primary-500 bg-primary-50 text-primary-900'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium">{subject.subject_name}</div>
                  {subject.subject_code && (
                    <div className="text-xs text-gray-500">{subject.subject_code}</div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function WorkloadTab({
  rows,
  academicYear,
}: {
  rows: WorkloadRow[];
  academicYear: string;
}) {
  if (rows.length === 0) {
    return <EmptyState message="No workload data for the selected academic year." />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
        Workload combines teacher assignments with timetable periods
        {academicYear ? ` for ${academicYear}` : ''}. Use this to balance teaching load before
        generating routines.
        <Link href="/academics/timetable" className="ml-1 font-medium text-primary-600 hover:underline">
          Open timetable
        </Link>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Teacher</th>
              <th className="px-4 py-3 text-left">Assignments</th>
              <th className="px-4 py-3 text-left">Classes</th>
              <th className="px-4 py-3 text-left">Subjects</th>
              <th className="px-4 py-3 text-left">Sections</th>
              <th className="px-4 py-3 text-left">Class Teacher</th>
              <th className="px-4 py-3 text-left">Timetable Periods</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.staff_id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{row.teacher_name}</div>
                  <div className="text-xs text-gray-500">{row.employee_id}</div>
                </td>
                <td className="px-4 py-3">{row.total_assignments}</td>
                <td className="px-4 py-3">{row.classes_count}</td>
                <td className="px-4 py-3">{row.subjects_count}</td>
                <td className="px-4 py-3">{row.sections_count}</td>
                <td className="px-4 py-3">{row.class_teacher_roles}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      row.timetable_periods > 25
                        ? 'bg-red-100 text-red-800'
                        : row.timetable_periods > 18
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {row.timetable_periods}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AssignmentFilterBar({
  academicYear,
  academicYears,
  filters,
  classes,
  sections,
  subjects,
  staff,
  onAcademicYearChange,
  onFiltersChange,
  onClear,
}: {
  academicYear: string;
  academicYears: { name: string; is_active?: boolean }[];
  filters: AssignmentFilters;
  classes: ClassOption[];
  sections: SectionOption[];
  subjects: SubjectOption[];
  staff: StaffOption[];
  onAcademicYearChange: (value: string) => void;
  onFiltersChange: (patch: Partial<AssignmentFilters>) => void;
  onClear: () => void;
}) {
  const hasFilters = Boolean(
    filters.classId || filters.sectionId || filters.subjectId || filters.staffId,
  );

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <label className="block min-w-[140px] flex-1 text-sm">
        <span className="mb-1 block text-xs font-medium text-gray-600">Session</span>
        <select
          value={academicYear}
          onChange={(e) => onAcademicYearChange(e.target.value)}
          className={selectClass}
        >
          {academicYears.map((year) => (
            <option key={year.name} value={year.name}>
              {year.name}
              {year.is_active ? ' (Active)' : ''}
            </option>
          ))}
        </select>
      </label>

      <label className="block min-w-[120px] flex-1 text-sm">
        <span className="mb-1 block text-xs font-medium text-gray-600">Class</span>
        <select
          value={filters.classId}
          onChange={(e) => onFiltersChange({ classId: e.target.value })}
          className={selectClass}
        >
          <option value="">All classes</option>
          {classes.map((cls) => (
            <option key={cls.id} value={String(cls.id)}>
              {cls.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block min-w-[120px] flex-1 text-sm">
        <span className="mb-1 block text-xs font-medium text-gray-600">Section</span>
        <select
          value={filters.sectionId}
          onChange={(e) => onFiltersChange({ sectionId: e.target.value })}
          className={selectClass}
          disabled={!filters.classId}
        >
          <option value="">{filters.classId ? 'All sections' : 'Select class first'}</option>
          {sections.map((section) => (
            <option key={section.id} value={String(section.id)}>
              {section.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block min-w-[140px] flex-1 text-sm">
        <span className="mb-1 block text-xs font-medium text-gray-600">Subject</span>
        <select
          value={filters.subjectId}
          onChange={(e) => onFiltersChange({ subjectId: e.target.value })}
          className={selectClass}
        >
          <option value="">All subjects</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={String(subject.id)}>
              {subject.name}
              {subject.code ? ` (${subject.code})` : ''}
            </option>
          ))}
        </select>
      </label>

      <label className="block min-w-[160px] flex-1 text-sm">
        <span className="mb-1 block text-xs font-medium text-gray-600">Teacher</span>
        <select
          value={filters.staffId}
          onChange={(e) => onFiltersChange({ staffId: e.target.value })}
          className={selectClass}
        >
          <option value="">All teachers</option>
          {staff.map((member) => (
            <option key={member.id} value={String(member.id)}>
              {member.first_name} {member.last_name}
            </option>
          ))}
        </select>
      </label>

      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 px-6 py-16 text-center">
      <FiUsers className="mb-3 text-gray-300" size={32} />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
