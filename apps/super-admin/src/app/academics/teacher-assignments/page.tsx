'use client';

import AppModal, {
  APP_MODAL_BODY,
  APP_MODAL_FOOTER,
  APP_MODAL_HEADER,
  APP_MODAL_PANEL_STRUCTURED,
} from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { useDialog } from '@/shared/context/DialogContext';
import { sortClassesByName } from '@/lib/class-sort';
import { FiPlus, FiTrash2, FiX } from 'react-icons/fi';

const selectClass =
  'w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:bg-gray-50 disabled:text-gray-500';

const EMPTY_LIST_FILTERS = {
  staff_id: '',
  class_id: '',
  section_id: '',
  subject_id: '',
};

export default function TeacherAssignmentsPage() {
  const { alert, confirm } = useDialog();
  const [assignments, setAssignments] = useState<Record<string, unknown>[]>([]);
  const [staff, setStaff] = useState<Record<string, unknown>[]>([]);
  const [classes, setClasses] = useState<Record<string, unknown>[]>([]);
  const [sections, setSections] = useState<Record<string, unknown>[]>([]);
  const [classSubjects, setClassSubjects] = useState<
    { class_id: number; subject_id: number; subject_name: string; subject_code?: string }[]
  >([]);
  const [subjects, setSubjects] = useState<Record<string, unknown>[]>([]);
  const [academicYears, setAcademicYears] = useState<{ name: string; is_active?: boolean }[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [boardTab, setBoardTab] = useState<'class' | 'teacher'>('class');
  const [boardFilter, setBoardFilter] = useState<'all' | 'open'>('all');
  const [teacherFilter, setTeacherFilter] = useState<'all' | 'free'>('all');
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState('');
  const [listFilters, setListFilters] = useState(EMPTY_LIST_FILTERS);
  const [form, setForm] = useState({
    staff_id: '', class_id: '', section_id: '', subject_id: '',
    academic_year: '', is_class_teacher: false,
  });

  const fetchData = useCallback(async () => {
    const [aRes, sRes, cRes, secRes, csRes, subRes, yRes] = await Promise.all([
      fetch('/api/teacher-assignments'),
      fetch('/api/teachers?limit=300&status=active'),
      fetch('/api/classes?active_only=true'),
      fetch('/api/sections'),
      fetch('/api/class-subjects'),
      fetch('/api/subjects'),
      fetch('/api/academic-years'),
    ]);
    const results = await Promise.all([
      aRes.json(),
      sRes.json(),
      cRes.json(),
      secRes.json(),
      csRes.json(),
      subRes.json(),
      yRes.json(),
    ]);
    if (results[0].success) setAssignments(results[0].data);
    if (results[1].success) setStaff(results[1].data);
    if (results[2].success) setClasses(results[2].data);
    if (results[3].success) setSections(results[3].data);
    if (results[4].success) setClassSubjects(results[4].data);
    if (results[5].success) setSubjects(results[5].data);
    if (results[6].success) {
      setAcademicYears(results[6].data);
      const active = results[6].data.find((y: { is_active: boolean }) => y.is_active);
      if (active && !form.academic_year) setForm((f) => ({ ...f, academic_year: active.name }));
    }
  }, [form.academic_year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAssignModal = () => {
    const activeYear = academicYears.find((y) => y.is_active);
    setForm({
      staff_id: '',
      class_id: '',
      section_id: '',
      subject_id: '',
      academic_year: activeYear?.name || form.academic_year || '',
      is_class_teacher: false,
    });
    setShowModal(true);
  };

  const closeAssignModal = () => setShowModal(false);

  const filteredSections = sections.filter((s) => String(s.class_id) === form.class_id);

  const filteredSubjects = useMemo(() => {
    if (!form.class_id) return [];

    const seen = new Set<number>();
    const forClass = classSubjects
      .filter((cs) => String(cs.class_id) === form.class_id)
      .filter((cs) => {
        const id = Number(cs.subject_id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((cs) => ({
        id: cs.subject_id,
        name: cs.subject_name,
        code: cs.subject_code,
      }));

    if (forClass.length > 0) return forClass;

    return subjects.map((s) => ({
      id: Number(s.id),
      name: String(s.name),
      code: s.code ? String(s.code) : undefined,
    }));
  }, [classSubjects, subjects, form.class_id]);

  const listFilterTeachers = useMemo(() => {
    const seen = new Set<number>();
    const options: { id: number; name: string }[] = [];
    for (const row of assignments) {
      const id = Number(row.staff_id);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      options.push({ id, name: String(row.teacher_name || 'Teacher') });
    }
    return options.sort((a, b) => a.name.localeCompare(b.name));
  }, [assignments]);

  const listFilterSections = useMemo(
    () =>
      sections.filter(
        (s) => !listFilters.class_id || String(s.class_id) === listFilters.class_id,
      ),
    [sections, listFilters.class_id],
  );

  const listFilterSubjects = useMemo(() => {
    if (listFilters.class_id) {
      const seen = new Set<number>();
      return classSubjects
        .filter((cs) => String(cs.class_id) === listFilters.class_id)
        .filter((cs) => {
          const id = Number(cs.subject_id);
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        })
        .map((cs) => ({ id: cs.subject_id, name: cs.subject_name }));
    }

    const seen = new Set<number>();
    const options: { id: number; name: string }[] = [];
    for (const row of assignments) {
      const id = Number(row.subject_id);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      options.push({ id, name: String(row.subject_name || 'Subject') });
    }
    return options.sort((a, b) => a.name.localeCompare(b.name));
  }, [assignments, classSubjects, listFilters.class_id]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((row) => {
      if (listFilters.staff_id && String(row.staff_id) !== listFilters.staff_id) return false;
      if (listFilters.class_id && String(row.class_id) !== listFilters.class_id) return false;
      if (listFilters.section_id && String(row.section_id) !== listFilters.section_id) return false;
      if (listFilters.subject_id && String(row.subject_id) !== listFilters.subject_id) return false;
      return true;
    });
  }, [assignments, listFilters]);

  const hasActiveListFilters = Boolean(
    listFilters.staff_id ||
      listFilters.class_id ||
      listFilters.section_id ||
      listFilters.subject_id,
  );

  const canSubmit = Boolean(form.staff_id && form.class_id && form.academic_year);

  const activeYear = academicYears.find((year) => year.is_active)?.name || form.academic_year || '';

  const teacherOptions = useMemo(
    () =>
      staff
        .map((person) => ({
          id: Number(person.id),
          name: `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Teacher',
        }))
        .filter((person) => person.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [staff],
  );

  const yearAssignments = useMemo(
    () => assignments.filter((row) => !activeYear || String(row.academic_year) === activeYear),
    [assignments, activeYear],
  );

  const classBoard = useMemo(() => {
    const ordered = sortClassesByName(
      classes.map((row) => ({ id: Number(row.id), name: String(row.name || 'Class') })),
    );
    return ordered
      .map((cls) => {
        const seen = new Set<number>();
        const subjectsForClass = classSubjects.filter((row) => {
          if (Number(row.class_id) !== cls.id || seen.has(Number(row.subject_id))) return false;
          seen.add(Number(row.subject_id));
          return true;
        });
        const subjectsForBoard = subjectsForClass
          .map((subject) => {
            const teachers = yearAssignments
              .filter(
                (row) =>
                  Number(row.class_id) === cls.id && Number(row.subject_id) === Number(subject.subject_id),
              )
              .map((row) => ({
                id: Number(row.id),
                name: String(row.section_name ? `${row.teacher_name} · ${row.section_name}` : row.teacher_name || 'Teacher'),
              }));
            return {
              subject_id: Number(subject.subject_id),
              subject_name: subject.subject_name,
              teachers,
            };
          })
          .sort((a, b) => {
            const openA = a.teachers.length === 0 ? 0 : 1;
            const openB = b.teachers.length === 0 ? 0 : 1;
            return openA - openB || a.subject_name.localeCompare(b.subject_name);
          });
        const openCount = subjectsForBoard.filter((subject) => subject.teachers.length === 0).length;
        return { ...cls, subjects: subjectsForBoard, openCount };
      })
      .filter((cls) => cls.subjects.length > 0);
  }, [classes, classSubjects, yearAssignments]);

  const teacherBoard = useMemo(() => {
    const byStaff = new Map<number, { id: number; label: string }[]>();
    for (const row of yearAssignments) {
      const staffId = Number(row.staff_id);
      if (!staffId) continue;
      const list = byStaff.get(staffId) || [];
      const parts = [row.class_name, row.section_name, row.subject_name].filter(Boolean);
      list.push({ id: Number(row.id), label: parts.join(' · ') || 'Assignment' });
      byStaff.set(staffId, list);
    }
    return teacherOptions
      .map((teacher) => {
        const items = byStaff.get(teacher.id) || [];
        const classesHeld = new Set(
          yearAssignments
            .filter((row) => Number(row.staff_id) === teacher.id && row.class_name)
            .map((row) => String(row.class_name)),
        );
        return { ...teacher, items, classCount: classesHeld.size };
      })
      .sort((a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name));
  }, [teacherOptions, yearAssignments]);

  const openCount = classBoard.reduce((sum, row) => sum + row.openCount, 0);

  const assignSlot = async (classId: number, subjectId: number) => {
    const key = `${classId}-${subjectId}`;
    const staffId = picks[key];
    if (!staffId || !activeYear) {
      await alert('Choose a teacher and an active academic year first.', { title: 'Notice', type: 'warning' });
      return;
    }
    const duplicate = yearAssignments.some(
      (row) =>
        String(row.staff_id) === staffId &&
        Number(row.class_id) === classId &&
        Number(row.subject_id) === subjectId &&
        (row.section_id == null || row.section_id === ''),
    );
    if (duplicate) {
      await alert('This teacher is already assigned to that class and subject.', {
        title: 'Duplicate assignment',
        type: 'warning',
      });
      return;
    }
    setSavingKey(key);
    try {
      const res = await fetch('/api/teacher-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: parseInt(staffId, 10),
          class_id: classId,
          section_id: null,
          subject_id: subjectId,
          academic_year: activeYear,
          is_class_teacher: false,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        await alert(data.error || 'Could not assign the teacher.', { title: 'Error', type: 'error' });
        return;
      }
      setPicks((prev) => ({ ...prev, [key]: '' }));
      await fetchData();
    } finally {
      setSavingKey('');
    }
  };

  const submit = async () => {
    const sectionId = form.section_id ? parseInt(form.section_id, 10) : null;
    const subjectId = form.subject_id ? parseInt(form.subject_id, 10) : null;
    const duplicate = assignments.some(
      (row) =>
        String(row.staff_id) === form.staff_id &&
        String(row.class_id) === form.class_id &&
        String(row.academic_year) === form.academic_year &&
        (row.section_id == null ? null : Number(row.section_id)) === sectionId &&
        (row.subject_id == null ? null : Number(row.subject_id)) === subjectId,
    );
    if (duplicate) {
      await alert('This teacher is already assigned to that class, section, and subject for this year.', {
        title: 'Duplicate assignment',
        type: 'warning',
      });
      return;
    }

    const res = await fetch('/api/teacher-assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: parseInt(form.staff_id, 10),
        class_id: parseInt(form.class_id, 10),
        section_id: sectionId,
        subject_id: subjectId,
        academic_year: form.academic_year,
        is_class_teacher: form.is_class_teacher,
      }),
    });
    const data = await res.json();
    if (data.success) {
      closeAssignModal();
      fetchData();
    } else await alert(data.error, { title: 'Error', type: 'error' });
  };

  const remove = async (id: number) => {
    const ok = await confirm('Remove this assignment?', { title: 'Confirm', type: 'warning' });
    if (!ok) return;
    const res = await fetch(`/api/teacher-assignments?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) fetchData();
  };

  return (
    <DashboardLayout>
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Teacher Assignments</h1>
            <p className="mt-0.5 text-xs text-gray-500">
              {activeYear ? `${activeYear} · ` : ''}
              {openCount} subject{openCount === 1 ? '' : 's'} still need a teacher.
            </p>
          </div>
          <button
            type="button"
            onClick={openAssignModal}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
          >
            <FiPlus size={14} /> Assign Teacher
          </button>
        </div>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-2.5">
            <div className="inline-flex rounded-md border border-gray-200 p-0.5 text-[11px] font-medium">
              <button type="button" onClick={() => setBoardTab('class')} className={`rounded px-2 py-1 ${boardTab === 'class' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}>
                By class
              </button>
              <button type="button" onClick={() => setBoardTab('teacher')} className={`rounded px-2 py-1 ${boardTab === 'teacher' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}>
                By teacher
              </button>
            </div>
            {boardTab === 'class' ? (
              <div className="inline-flex rounded-md border border-gray-200 p-0.5 text-[11px]">
                <button type="button" onClick={() => setBoardFilter('all')} className={`rounded px-2 py-1 ${boardFilter === 'all' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}>All</button>
                <button type="button" onClick={() => setBoardFilter('open')} className={`rounded px-2 py-1 ${boardFilter === 'open' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}>Open only</button>
              </div>
            ) : (
              <div className="inline-flex rounded-md border border-gray-200 p-0.5 text-[11px]">
                <button type="button" onClick={() => setTeacherFilter('all')} className={`rounded px-2 py-1 ${teacherFilter === 'all' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}>All</button>
                <button type="button" onClick={() => setTeacherFilter('free')} className={`rounded px-2 py-1 ${teacherFilter === 'free' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}>Free</button>
              </div>
            )}
          </div>
          {boardTab === 'teacher' ? (
            teacherBoard.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-gray-500">No teachers on record.</p>
            ) : (
              <div className="max-h-[36rem] divide-y divide-gray-100 overflow-y-auto">
                {teacherBoard
                  .filter((teacher) => teacherFilter === 'all' || teacher.items.length === 0)
                  .map((teacher) => {
                    const free = teacher.items.length === 0;
                    return (
                      <div key={teacher.id} className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{teacher.name}</p>
                            <p className="text-[11px] text-gray-500">
                              {free ? 'No class or subject assigned' : `${teacher.items.length} assigned · ${teacher.classCount} class${teacher.classCount === 1 ? '' : 'es'}`}
                            </p>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${free ? 'border border-green-200 bg-green-50 text-green-800' : 'border border-gray-200 bg-gray-50 text-gray-700'}`}>
                            {free ? 'Free' : `${teacher.items.length} assigned`}
                          </span>
                        </div>
                        {!free && (
                          <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                            {teacher.items.map((item) => (
                              <li key={item.id} className="flex items-center justify-between gap-2 rounded-md bg-gray-50 px-2 py-1.5 text-xs text-gray-700">
                                <span className="truncate">{item.label}</span>
                                <button type="button" onClick={() => remove(item.id)} className="shrink-0 text-[11px] font-medium text-red-600 hover:text-red-700">
                                  Unassign
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
              </div>
            )
          ) : classBoard.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-gray-500">Add subjects, then map them to classes.</p>
          ) : (
            <div className="max-h-[36rem] divide-y divide-gray-100 overflow-y-auto">
              {classBoard
                .filter((row) => boardFilter === 'all' || row.openCount > 0)
                .map((row) => {
                  const subjectsForRow = boardFilter === 'open' ? row.subjects.filter((subject) => subject.teachers.length === 0) : row.subjects;
                  return (
                    <div key={row.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900">{row.name}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${row.openCount > 0 ? 'border border-amber-200 bg-amber-50 text-amber-800' : 'border border-green-200 bg-green-50 text-green-800'}`}>
                          {row.openCount > 0 ? `${row.openCount} open` : 'Covered'}
                        </span>
                      </div>
                      <ul className="mt-2 grid grid-cols-1 gap-1.5 lg:grid-cols-2">
                        {subjectsForRow.map((subject) => {
                          const key = `${row.id}-${subject.subject_id}`;
                          const open = subject.teachers.length === 0;
                          return (
                            <li key={subject.subject_id} className={`rounded-md px-2 py-1.5 text-xs ${open ? 'bg-amber-50' : 'bg-gray-50'}`}>
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate font-medium text-gray-800">{subject.subject_name}</span>
                                {open && <span className="shrink-0 font-medium text-amber-800">Unassigned</span>}
                              </div>
                              {open ? (
                                <div className="mt-1.5 flex gap-1.5">
                                  <select
                                    value={picks[key] || ''}
                                    onChange={(event) => setPicks((prev) => ({ ...prev, [key]: event.target.value }))}
                                    className={selectClass}
                                  >
                                    <option value="">Select teacher</option>
                                    {teacherOptions.map((teacher) => (
                                      <option key={teacher.id} value={String(teacher.id)}>{teacher.name}</option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    disabled={!picks[key] || savingKey === key}
                                    onClick={() => assignSlot(row.id, subject.subject_id)}
                                    className="shrink-0 rounded-md bg-primary-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                                  >
                                    {savingKey === key ? 'Saving' : 'Assign'}
                                  </button>
                                </div>
                              ) : (
                                <ul className="mt-1 space-y-1">
                                  {subject.teachers.map((teacher) => (
                                    <li key={teacher.id} className="flex items-center justify-between gap-2 text-gray-600">
                                      <span className="truncate">{teacher.name}</span>
                                      <button type="button" onClick={() => remove(teacher.id)} className="shrink-0 text-[11px] font-medium text-red-600 hover:text-red-700">
                                        Unassign
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
            </div>
          )}
        </section>

        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1 min-w-0">
              <div className="min-w-[140px]">
                <label className="mb-1 block text-[11px] font-medium text-gray-600">Teacher</label>
                <select
                  value={listFilters.staff_id}
                  onChange={(e) =>
                    setListFilters((prev) => ({ ...prev, staff_id: e.target.value }))
                  }
                  className={selectClass}
                >
                  <option value="">All teachers</option>
                  {listFilterTeachers.map((t) => (
                    <option key={String(t.id)} value={String(t.id)}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[140px]">
                <label className="mb-1 block text-[11px] font-medium text-gray-600">Class</label>
                <select
                  value={listFilters.class_id}
                  onChange={(e) =>
                    setListFilters((prev) => ({
                      ...prev,
                      class_id: e.target.value,
                      section_id: '',
                      subject_id: '',
                    }))
                  }
                  className={selectClass}
                >
                  <option value="">All classes</option>
                  {classes.map((c) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {String(c.name)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[140px]">
                <label className="mb-1 block text-[11px] font-medium text-gray-600">Section</label>
                <select
                  value={listFilters.section_id}
                  onChange={(e) =>
                    setListFilters((prev) => ({ ...prev, section_id: e.target.value }))
                  }
                  className={selectClass}
                  disabled={!listFilters.class_id}
                >
                  <option value="">
                    {listFilters.class_id ? 'All sections' : 'Select class first'}
                  </option>
                  {listFilterSections.map((s) => (
                    <option key={String(s.id)} value={String(s.id)}>
                      {String(s.name)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[140px]">
                <label className="mb-1 block text-[11px] font-medium text-gray-600">Subject</label>
                <select
                  value={listFilters.subject_id}
                  onChange={(e) =>
                    setListFilters((prev) => ({ ...prev, subject_id: e.target.value }))
                  }
                  className={selectClass}
                >
                  <option value="">All subjects</option>
                  {listFilterSubjects.map((s) => (
                    <option key={String(s.id)} value={String(s.id)}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {hasActiveListFilters && (
              <button
                type="button"
                onClick={() => setListFilters(EMPTY_LIST_FILTERS)}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                <FiX className="w-4 h-4" />
                Clear filters
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Showing {filteredAssignments.length} of {assignments.length} assignment
            {assignments.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {['Teacher', 'Class', 'Section', 'Subject', 'Year', 'Class teacher', 'Actions'].map((label) => (
                  <th
                    key={label}
                    className={`px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 ${
                      label === 'Actions' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-500">
                    {assignments.length === 0
                      ? 'No assignments'
                      : 'No assignments match the selected filters'}
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((a) => (
                <tr key={String(a.id)} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-900">{String(a.teacher_name)}</td>
                  <td className="px-4 py-2 text-gray-700">{String(a.class_name || '—')}</td>
                  <td className="px-4 py-2 text-gray-700">{String(a.section_name || '—')}</td>
                  <td className="px-4 py-2 text-gray-700">{String(a.subject_name || '—')}</td>
                  <td className="px-4 py-2 text-gray-700">{String(a.academic_year)}</td>
                  <td className="px-4 py-2 text-gray-700">{a.is_class_teacher ? 'Yes' : '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <button type="button" onClick={() => remove(Number(a.id))} className="rounded p-1.5 text-red-500 hover:bg-red-50" aria-label="Remove assignment"><FiTrash2 size={14} /></button>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
          </div>
        </div>
        <AppModal open={showModal} onClose={closeAssignModal}>
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className={`${APP_MODAL_PANEL_STRUCTURED} relative z-10 w-full rounded-xl`}
              style={{ maxWidth: '32rem', height: 'auto', maxHeight: '90vh' }}
            >
              <div className={APP_MODAL_HEADER}>
                <h2 className="text-base font-semibold text-gray-900">Assign Teacher</h2>
                <button
                  type="button"
                  onClick={closeAssignModal}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  aria-label="Close"
                >
                  <FiX size={20} />
                </button>
              </div>

              <div className={`${APP_MODAL_BODY} px-4 sm:px-6 py-4 space-y-4`}>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Teacher <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.staff_id}
                    onChange={(e) => setForm({ ...form, staff_id: e.target.value })}
                    className={selectClass}
                  >
                    <option value="">Select teacher</option>
                    {staff.map((s) => (
                      <option key={String(s.id)} value={String(s.id)}>
                        {String(s.first_name)} {String(s.last_name)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.class_id}
                    onChange={(e) =>
                      setForm({ ...form, class_id: e.target.value, section_id: '', subject_id: '' })
                    }
                    className={selectClass}
                  >
                    <option value="">Select class</option>
                    {classes.map((c) => (
                      <option key={String(c.id)} value={String(c.id)}>
                        {String(c.name)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Section <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <select
                    value={form.section_id}
                    onChange={(e) => setForm({ ...form, section_id: e.target.value })}
                    className={selectClass}
                    disabled={!form.class_id}
                  >
                    <option value="">All sections / no section</option>
                    {filteredSections.map((s) => (
                      <option key={String(s.id)} value={String(s.id)}>
                        {String(s.name)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Subject <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <select
                    value={form.subject_id}
                    onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                    className={selectClass}
                    disabled={!form.class_id}
                  >
                    <option value="">
                      {!form.class_id
                        ? 'Select class first'
                        : filteredSubjects.length === 0
                          ? 'No subjects for this class'
                          : 'No specific subject'}
                    </option>
                    {filteredSubjects.map((s) => (
                      <option key={String(s.id)} value={String(s.id)}>
                        {s.name}
                        {s.code ? ` (${s.code})` : ''}
                      </option>
                    ))}
                  </select>
                  {form.class_id && filteredSubjects.length === 0 && (
                    <p className="mt-1 text-xs text-amber-600">
                      Assign subjects to this class under Academics → Subjects first.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Academic Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.academic_year}
                    onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                    className={selectClass}
                  >
                    <option value="">Select academic year</option>
                    {academicYears.map((y) => (
                      <option key={y.name} value={y.name}>
                        {y.name}
                        {y.is_active ? ' (Active)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.is_class_teacher}
                    onChange={(e) => setForm({ ...form, is_class_teacher: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  Mark as class teacher
                </label>
              </div>

              <div className={APP_MODAL_FOOTER}>
                <button
                  type="button"
                  onClick={closeAssignModal}
                  className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={!canSubmit}
                  className="rounded-md bg-primary-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        </AppModal>
      </div>
    </DashboardLayout>
  );
}
