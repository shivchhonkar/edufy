'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import TeacherNav from '@/features/teachers/components/TeacherNav';
import { useDialog } from '@/shared/context/DialogContext';
import { FiEdit2, FiPlus, FiTrash2, FiX } from 'react-icons/fi';

interface Activity {
  id: number;
  staff_id: number;
  teacher_name: string;
  class_id: number;
  class_name: string;
  section_name: string;
  subject_name: string;
  activity_date: string;
  topic_covered: string;
  periods_taught: number;
  homework_given: boolean;
  remarks: string;
  status: string;
}

const defaultForm = {
  staff_id: '', class_id: '', section_id: '', subject_id: '',
  activity_date: new Date().toISOString().split('T')[0],
  topic_covered: '', periods_taught: '1', homework_given: false, remarks: '', status: 'completed',
};

export default function DailyActivitiesPage() {
  const { alert, confirm } = useDialog();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [staff, setStaff] = useState<{ id: number; first_name: string; last_name: string }[]>([]);
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [sections, setSections] = useState<{ id: number; name: string; class_id: number }[]>([]);
  const [subjects, setSubjects] = useState<{ id: number; name: string }[]>([]);
  const [filterStaff, setFilterStaff] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [form, setForm] = useState(defaultForm);

  const fetchData = useCallback(async () => {
    let url = '/api/teacher-activities';
    if (filterStaff) url += `?staff_id=${filterStaff}`;
    const [aRes, sRes, cRes, subRes] = await Promise.all([
      fetch(url),
      fetch('/api/staff?limit=200&status=active'),
      fetch('/api/classes?active_only=true'),
      fetch('/api/subjects'),
    ]);
    const [aData, sData, cData, subData] = await Promise.all([aRes.json(), sRes.json(), cRes.json(), subRes.json()]);
    if (aData.success) setActivities(aData.data);
    if (sData.success) setStaff(sData.data);
    if (cData.success) setClasses(cData.data);
    if (subData.success) setSubjects(subData.data);
  }, [filterStaff]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (form.class_id) {
      fetch(`/api/sections?class_id=${form.class_id}`)
        .then((r) => r.json())
        .then((d) => d.success && setSections(d.data));
    } else {
      setSections([]);
    }
  }, [form.class_id]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...defaultForm, staff_id: filterStaff });
    setShowModal(true);
  };

  const openEdit = (a: Activity) => {
    setEditing(a);
    setForm({
      staff_id: String(a.staff_id),
      class_id: a.class_id ? String(a.class_id) : '',
      section_id: '',
      subject_id: '',
      activity_date: String(a.activity_date).slice(0, 10),
      topic_covered: a.topic_covered || '',
      periods_taught: String(a.periods_taught),
      homework_given: a.homework_given,
      remarks: a.remarks || '',
      status: a.status || 'completed',
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.staff_id || !form.activity_date) {
      await alert('Teacher and date are required', { title: 'Validation', type: 'warning' });
      return;
    }
    const payload = {
      staff_id: parseInt(form.staff_id, 10),
      class_id: form.class_id ? parseInt(form.class_id, 10) : null,
      section_id: form.section_id ? parseInt(form.section_id, 10) : null,
      subject_id: form.subject_id ? parseInt(form.subject_id, 10) : null,
      activity_date: form.activity_date,
      topic_covered: form.topic_covered,
      periods_taught: parseInt(form.periods_taught, 10),
      homework_given: form.homework_given,
      remarks: form.remarks,
      status: form.status,
    };
    const url = editing ? `/api/teacher-activities/${editing.id}` : '/api/teacher-activities';
    const res = await fetch(url, {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) { setShowModal(false); fetchData(); }
    else await alert(data.error, { title: 'Error', type: 'error' });
  };

  const remove = async (id: number) => {
    const ok = await confirm('Delete this activity log?', { title: 'Confirm', type: 'warning' });
    if (!ok) return;
    const res = await fetch(`/api/teacher-activities/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) fetchData();
    else await alert(data.error, { title: 'Error', type: 'error' });
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <TeacherNav />
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <h1 className="text-xl">Daily Activity Tracking</h1>
          <div className="flex gap-2 items-center">
            <select value={filterStaff} onChange={(e) => setFilterStaff(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">All teachers</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select>
            <button type="button" onClick={openCreate} className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">
              <FiPlus /> Log Activity
            </button>
          </div>
        </div>

        <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b sticky top-0 z-10 shrink-0">
              <tr>
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-left px-5 py-3">Teacher</th>
                <th className="text-left px-5 py-3">Class</th>
                <th className="text-left px-5 py-3">Subject</th>
                <th className="text-left px-5 py-3">Topic</th>
                <th className="text-left px-5 py-3">Periods</th>
                <th className="text-left px-5 py-3">HW</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activities.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-8 text-center text-gray-400">No activities logged yet</td></tr>
              ) : activities.map((a) => (
                <tr key={a.id} className="border-b">
                  <td className="px-5 py-3">{String(a.activity_date).slice(0, 10)}</td>
                  <td className="px-5 py-3">{a.teacher_name}</td>
                  <td className="px-5 py-3">{a.class_name || '—'}{a.section_name ? ` (${a.section_name})` : ''}</td>
                  <td className="px-5 py-3">{a.subject_name || '—'}</td>
                  <td className="px-5 py-3 max-w-[200px] truncate">{a.topic_covered || '—'}</td>
                  <td className="px-5 py-3">{a.periods_taught}</td>
                  <td className="px-5 py-3">{a.homework_given ? 'Yes' : '—'}</td>
                  <td className="px-5 py-3 capitalize">{a.status}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => openEdit(a)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"><FiEdit2 /></button>
                      <button type="button" onClick={() => remove(a.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showModal && (
          <AppModal open={showModal} onClose={() => setShowModal(false)}>
      <div className={APP_MODAL_PANEL + " p-6 relative space-y-2"} >
              <h2 className="text-lg ">{editing ? 'Edit Activity' : 'Log Daily Activity'}</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="absolute right-6 top-6 text-gray-500 hover:text-gray-900 focus:outline-none"
                aria-label="Close"
              >
                <FiX size={18} />
              </button>
              <select value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mb-2 mt-2">
                <option value="">Teacher *</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
              </select>
              <input type="date" value={form.activity_date} onChange={(e) => setForm({ ...form, activity_date: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mb-2 mt-2" />
              <select value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value, section_id: '' })} className="w-full border rounded-lg px-3 py-2 text-sm mb-2 mt-2">
                <option value="">Class</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={form.section_id} onChange={(e) => setForm({ ...form, section_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mb-2 mt-2">
                <option value="">Section</option>
                {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mb-2 mt-2">
                <option value="">Subject</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input placeholder="Topic covered" value={form.topic_covered} onChange={(e) => setForm({ ...form, topic_covered: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mb-2 mt-2" />
              <input type="number" min={1} placeholder="Periods taught" value={form.periods_taught} onChange={(e) => setForm({ ...form, periods_taught: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mb-2 mt-2" />
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mb-2 mt-2">
                <option value="completed">Completed</option>
                <option value="partial">Partial</option>
                <option value="missed">Missed</option>
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.homework_given} onChange={(e) => setForm({ ...form, homework_given: e.target.checked })} />
                Homework given
              </label>
              <textarea placeholder="Remarks" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mb-2 mt-2" rows={2} />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="button" onClick={save} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">{editing ? 'Update' : 'Save'}</button>
              </div>
            </div>
          </AppModal>
        )}
      </div>
    </DashboardLayout>
  );
}
