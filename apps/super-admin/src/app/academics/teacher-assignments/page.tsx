'use client';

import AppModal, {
  APP_MODAL_BODY,
  APP_MODAL_FOOTER,
  APP_MODAL_HEADER,
  APP_MODAL_PANEL,
} from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import HrNav from '@/features/hr/components/HrNav';
import { useDialog } from '@/shared/context/DialogContext';
import { FiPlus, FiTrash2, FiX } from 'react-icons/fi';

const selectClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500';

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
        <HrNav />
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl">Teacher Assignments</h1>
          <button
            type="button"
            onClick={openAssignModal}
            className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            <FiPlus /> Assign Teacher
          </button>
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
              {assignments.length === 0 ? <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">No assignments</td></tr>
              : assignments.map((a) => (
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
              ))}
            </tbody>
          </table>
        </div>
        <AppModal open={showModal} onClose={closeAssignModal}>
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className={`${APP_MODAL_PANEL} relative z-10 w-full rounded-xl`}
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
