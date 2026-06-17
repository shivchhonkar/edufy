'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import TeacherNav from '@/features/teachers/components/TeacherNav';
import { useDialog } from '@/shared/context/DialogContext';
import { FiPlus, FiTrash2 } from 'react-icons/fi';

interface Chapter {
  id: number;
  class_id: number;
  subject_id: number;
  class_name: string;
  subject_name: string;
  title: string;
  sort_order: number;
  total_periods: number;
  periods_completed: number;
  progress_status: string;
  progress_id: number | null;
  progress_staff_id: number | null;
  teacher_name: string;
}

export default function SyllabusProgressPage() {
  const { alert, confirm } = useDialog();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: number; name: string }[]>([]);
  const [staff, setStaff] = useState<{ id: number; first_name: string; last_name: string }[]>([]);
  const [filterClass, setFilterClass] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showProgress, setShowProgress] = useState<Chapter | null>(null);
  const [addForm, setAddForm] = useState({ class_id: '', subject_id: '', title: '', total_periods: '5', sort_order: '0' });
  const [progressForm, setProgressForm] = useState({ staff_id: '', periods_completed: '0', status: 'not_started', notes: '' });

  const fetchData = useCallback(async () => {
    let url = '/api/syllabus';
    if (filterClass) url += `?class_id=${filterClass}`;
    const [cRes, clsRes, subRes, stRes] = await Promise.all([
      fetch(url),
      fetch('/api/classes?active_only=true'),
      fetch('/api/subjects'),
      fetch('/api/staff?limit=200&status=active'),
    ]);
    const [cData, clsData, subData, stData] = await Promise.all([cRes.json(), clsRes.json(), subRes.json(), stRes.json()]);
    if (cData.success) setChapters(cData.data);
    if (clsData.success) setClasses(clsData.data);
    if (subData.success) setSubjects(subData.data);
    if (stData.success) setStaff(stData.data);
  }, [filterClass]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addChapter = async () => {
    if (!addForm.class_id || !addForm.subject_id || !addForm.title.trim()) {
      await alert('Class, subject, and title are required', { title: 'Validation', type: 'warning' });
      return;
    }
    const res = await fetch('/api/syllabus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_id: parseInt(addForm.class_id, 10),
        subject_id: parseInt(addForm.subject_id, 10),
        title: addForm.title,
        total_periods: parseInt(addForm.total_periods, 10),
        sort_order: parseInt(addForm.sort_order, 10),
      }),
    });
    const data = await res.json();
    if (data.success) { setShowAdd(false); setAddForm({ class_id: '', subject_id: '', title: '', total_periods: '5', sort_order: '0' }); fetchData(); }
    else await alert(data.error, { title: 'Error', type: 'error' });
  };

  const openProgress = (ch: Chapter) => {
    setShowProgress(ch);
    setProgressForm({
      staff_id: ch.progress_staff_id ? String(ch.progress_staff_id) : '',
      periods_completed: String(ch.periods_completed || 0),
      status: ch.progress_status || 'not_started',
      notes: '',
    });
  };

  const saveProgress = async () => {
    if (!showProgress) return;
    const res = await fetch('/api/syllabus/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chapter_id: showProgress.id,
        class_id: showProgress.class_id,
        staff_id: progressForm.staff_id ? parseInt(progressForm.staff_id, 10) : null,
        periods_completed: parseInt(progressForm.periods_completed, 10),
        status: progressForm.status,
        notes: progressForm.notes,
      }),
    });
    const data = await res.json();
    if (data.success) { setShowProgress(null); fetchData(); }
    else await alert(data.error, { title: 'Error', type: 'error' });
  };

  const removeChapter = async (id: number) => {
    const ok = await confirm('Remove this chapter from syllabus?', { title: 'Confirm', type: 'warning' });
    if (!ok) return;
    const res = await fetch(`/api/syllabus?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) fetchData();
  };

  const progressPct = (ch: Chapter) => {
    if (!ch.total_periods) return 0;
    return Math.min(100, Math.round((ch.periods_completed / ch.total_periods) * 100));
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <TeacherNav />
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <h1 className="text-xl">Syllabus Progress Tracking</h1>
          <div className="flex gap-2">
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">All classes</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button type="button" onClick={() => setShowAdd(true)} className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">
              <FiPlus /> Add Chapter
            </button>
          </div>
        </div>

        <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-5 py-3">Class</th>
                <th className="text-left px-5 py-3">Subject</th>
                <th className="text-left px-5 py-3">Chapter</th>
                <th className="text-left px-5 py-3">Progress</th>
                <th className="text-left px-5 py-3">Teacher</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {chapters.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">No syllabus chapters defined. Add chapters to start tracking progress.</td></tr>
              ) : chapters.map((ch) => (
                <tr key={ch.id} className="border-b">
                  <td className="px-5 py-3">{ch.class_name}</td>
                  <td className="px-5 py-3">{ch.subject_name}</td>
                  <td className="px-5 py-3 font-medium">{ch.title}</td>
                  <td className="px-5 py-3 min-w-[140px]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-600 rounded-full" style={{ width: `${progressPct(ch)}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{ch.periods_completed}/{ch.total_periods}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">{ch.teacher_name || '—'}</td>
                  <td className="px-5 py-3 capitalize">{ch.progress_status?.replace('_', ' ')}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => openProgress(ch)} className="px-2 py-1 text-xs border rounded hover:bg-gray-50">Update</button>
                      <button type="button" onClick={() => removeChapter(ch.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showAdd && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-3">
              <h2 className="font-bold">Add Syllabus Chapter</h2>
              <select value={addForm.class_id} onChange={(e) => setAddForm({ ...addForm, class_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Class *</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={addForm.subject_id} onChange={(e) => setAddForm({ ...addForm, subject_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Subject *</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input placeholder="Chapter title *" value={addForm.title} onChange={(e) => setAddForm({ ...addForm, title: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input type="number" placeholder="Total periods" value={addForm.total_periods} onChange={(e) => setAddForm({ ...addForm, total_periods: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="button" onClick={addChapter} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">Add</button>
              </div>
            </div>
          </div>
        )}

        {showProgress && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-3">
              <h2 className="font-bold">Update Progress — {showProgress.title}</h2>
              <select value={progressForm.staff_id} onChange={(e) => setProgressForm({ ...progressForm, staff_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Teacher</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
              </select>
              <input type="number" min={0} max={showProgress.total_periods} placeholder="Periods completed" value={progressForm.periods_completed} onChange={(e) => setProgressForm({ ...progressForm, periods_completed: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <select value={progressForm.status} onChange={(e) => setProgressForm({ ...progressForm, status: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="not_started">Not started</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
              <textarea placeholder="Notes" value={progressForm.notes} onChange={(e) => setProgressForm({ ...progressForm, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowProgress(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="button" onClick={saveProgress} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
