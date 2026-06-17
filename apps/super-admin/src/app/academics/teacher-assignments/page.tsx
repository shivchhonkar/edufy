'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import HrNav from '@/features/hr/components/HrNav';
import { useDialog } from '@/shared/context/DialogContext';
import { FiPlus, FiTrash2 } from 'react-icons/fi';

export default function TeacherAssignmentsPage() {
  const { alert, confirm } = useDialog();
  const [assignments, setAssignments] = useState<Record<string, unknown>[]>([]);
  const [staff, setStaff] = useState<Record<string, unknown>[]>([]);
  const [classes, setClasses] = useState<Record<string, unknown>[]>([]);
  const [sections, setSections] = useState<Record<string, unknown>[]>([]);
  const [subjects, setSubjects] = useState<Record<string, unknown>[]>([]);
  const [academicYears, setAcademicYears] = useState<{ name: string }[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    staff_id: '', class_id: '', section_id: '', subject_id: '',
    academic_year: '', is_class_teacher: false,
  });

  const fetchData = useCallback(async () => {
    const [aRes, sRes, cRes, secRes, subRes, yRes] = await Promise.all([
      fetch('/api/teacher-assignments'),
      fetch('/api/staff?limit=200&status=active'),
      fetch('/api/classes?active_only=true'),
      fetch('/api/sections'),
      fetch('/api/subjects'),
      fetch('/api/academic-years'),
    ]);
    const results = await Promise.all([aRes.json(), sRes.json(), cRes.json(), secRes.json(), subRes.json(), yRes.json()]);
    if (results[0].success) setAssignments(results[0].data);
    if (results[1].success) setStaff(results[1].data);
    if (results[2].success) setClasses(results[2].data);
    if (results[3].success) setSections(results[3].data);
    if (results[4].success) setSubjects(results[4].data);
    if (results[5].success) {
      setAcademicYears(results[5].data);
      const active = results[5].data.find((y: { is_active: boolean }) => y.is_active);
      if (active && !form.academic_year) setForm((f) => ({ ...f, academic_year: active.name }));
    }
  }, [form.academic_year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredSections = sections.filter((s) => String(s.class_id) === form.class_id);

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
    if (data.success) { setShowModal(false); fetchData(); }
    else await alert(data.error, { title: 'Error', type: 'error' });
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
          <button type="button" onClick={() => setShowModal(true)} className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm"><FiPlus /> Assign Teacher</button>
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
        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-3">
              <h2 className="font-bold">Assign Teacher</h2>
              <select value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Teacher</option>
                {staff.map((s) => <option key={String(s.id)} value={String(s.id)}>{String(s.first_name)} {String(s.last_name)}</option>)}
              </select>
              <select value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value, section_id: '' })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Class</option>
                {classes.map((c) => <option key={String(c.id)} value={String(c.id)}>{String(c.name)}</option>)}
              </select>
              <select value={form.section_id} onChange={(e) => setForm({ ...form, section_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Section (optional)</option>
                {filteredSections.map((s) => <option key={String(s.id)} value={String(s.id)}>{String(s.name)}</option>)}
              </select>
              <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Subject (optional)</option>
                {subjects.map((s) => <option key={String(s.id)} value={String(s.id)}>{String(s.name)}</option>)}
              </select>
              <select value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                {academicYears.map((y) => <option key={y.name} value={y.name}>{y.name}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_class_teacher} onChange={(e) => setForm({ ...form, is_class_teacher: e.target.checked })} />
                Class Teacher
              </label>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="button" onClick={submit} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">Assign</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
