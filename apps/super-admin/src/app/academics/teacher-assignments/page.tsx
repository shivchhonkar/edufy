'use client';

import AppModal, {
  APP_MODAL_BODY,
  APP_MODAL_FOOTER,
  APP_MODAL_HEADER,
  APP_MODAL_PANEL_STRUCTURED,
} from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import HrNav from '@/features/hr/components/HrNav';
import { useDialog } from '@/shared/context/DialogContext';
import { FiArrowLeft, FiPlus, FiTrash2, FiX } from 'react-icons/fi';
import Link from 'next/link';

const selectClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500';

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
  const [listFilters, setListFilters] = useState(EMPTY_LIST_FILTERS);
  const [form, setForm] = useState({
    staff_id: '', class_id: '', section_id: '', subject_id: '',
    academic_year: '', is_class_teacher: false,
  });

  const fetchData = useCallback(async () => {
    const [aRes, sRes, cRes, secRes, csRes, subRes, yRes] = await Promise.all([
      fetch('/api/teacher-assignments'),
      fetch('/api/staff?limit=200&status=active'),
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

  const submit = async () => {
    const res = await fetch('/api/teacher-assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: parseInt(form.staff_id, 10),
        class_id: parseInt(form.class_id, 10),
        section_id: form.section_id ? parseInt(form.section_id, 10) : null,
        subject_id: form.subject_id ? parseInt(form.subject_id, 10) : null,
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
      <div className="max-w-7xl mx-auto">
        {/* <HrNav /> */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <h1 className="text-xl text-gray-900">Teacher Assignments</h1>
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 px-4 py-2 border border-gray-300 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              <FiArrowLeft /> Dashboard
            </Link>
            <button
              type="button"
              onClick={openAssignModal}
              className="inline-flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
            >
              <FiPlus /> Assign Teacher
            </button>
          </div>
        </div>

        <div className="bg-white border rounded-xl shadow-sm mb-4 px-4 py-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1 min-w-0">
              <div className="min-w-[140px]">
                <label className="block text-xs font-medium text-gray-600 mb-1">Teacher</label>
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
                <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
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
                <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
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
                <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
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
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
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

        <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-5 py-3">Teacher</th>
                <th className="text-left px-5 py-3">Class</th>
                <th className="text-left px-5 py-3">Section</th>
                <th className="text-left px-5 py-3">Subject</th>
                <th className="text-left px-5 py-3">Year</th>
                <th className="text-left px-5 py-3">Class Teacher</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                    {assignments.length === 0
                      ? 'No assignments'
                      : 'No assignments match the selected filters'}
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((a) => (
                <tr key={String(a.id)} className="border-b">
                  <td className="px-5 py-3">{String(a.teacher_name)}</td>
                  <td className="px-5 py-3">{String(a.class_name)}</td>
                  <td className="px-5 py-3">{String(a.section_name || '—')}</td>
                  <td className="px-5 py-3">{String(a.subject_name || '—')}</td>
                  <td className="px-5 py-3">{String(a.academic_year)}</td>
                  <td className="px-5 py-3">{a.is_class_teacher ? 'Yes' : '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <button type="button" onClick={() => remove(Number(a.id))} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><FiTrash2 /></button>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
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

                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
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
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={!canSubmit}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
