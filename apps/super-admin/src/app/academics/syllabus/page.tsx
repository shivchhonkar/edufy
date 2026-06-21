'use client';

import AppModal, {
  APP_MODAL_BODY,
  APP_MODAL_FOOTER,
  APP_MODAL_HEADER,
  APP_MODAL_PANEL,
} from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import TeacherNav from '@/features/teachers/components/TeacherNav';
import { useDialog } from '@/shared/context/DialogContext';
import { FiPlus, FiTrash2, FiX } from 'react-icons/fi';

const selectClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500';

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500';

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
  const [subjects, setSubjects] = useState<{ id: number; name: string; code?: string }[]>([]);
  const [classSubjects, setClassSubjects] = useState<
    { class_id: number; subject_id: number; subject_name: string; subject_code?: string }[]
  >([]);
  const [staff, setStaff] = useState<{ id: number; first_name: string; last_name: string }[]>([]);
  const [filterClass, setFilterClass] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showProgress, setShowProgress] = useState<Chapter | null>(null);
  const [addForm, setAddForm] = useState({ class_id: '', subject_id: '', title: '', total_periods: '5', sort_order: '0' });
  const [progressForm, setProgressForm] = useState({ staff_id: '', periods_completed: '0', status: 'not_started', notes: '' });

  const fetchData = useCallback(async () => {
    let url = '/api/syllabus';
    if (filterClass) url += `?class_id=${filterClass}`;
    const [cRes, clsRes, csRes, subRes, stRes] = await Promise.all([
      fetch(url),
      fetch('/api/classes?active_only=true'),
      fetch('/api/class-subjects'),
      fetch('/api/subjects'),
      fetch('/api/staff?limit=200&status=active'),
    ]);
    const [cData, clsData, csData, subData, stData] = await Promise.all([
      cRes.json(),
      clsRes.json(),
      csRes.json(),
      subRes.json(),
      stRes.json(),
    ]);
    if (cData.success) setChapters(cData.data);
    if (clsData.success) setClasses(clsData.data);
    if (csData.success) setClassSubjects(csData.data);
    if (subData.success) setSubjects(subData.data);
    if (stData.success) setStaff(stData.data);
  }, [filterClass]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredAddSubjects = useMemo(() => {
    if (!addForm.class_id) return [];

    const seen = new Set<number>();
    const forClass = classSubjects
      .filter((cs) => String(cs.class_id) === addForm.class_id)
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
      id: s.id,
      name: s.name,
      code: s.code,
    }));
  }, [addForm.class_id, classSubjects, subjects]);

  const canAddChapter = Boolean(addForm.class_id && addForm.subject_id && addForm.title.trim());

  const openAddModal = () => {
    setAddForm({ class_id: '', subject_id: '', title: '', total_periods: '5', sort_order: '0' });
    setShowAdd(true);
  };

  const closeAddModal = () => setShowAdd(false);

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
    if (data.success) {
      closeAddModal();
      setAddForm({ class_id: '', subject_id: '', title: '', total_periods: '5', sort_order: '0' });
      fetchData();
    } else await alert(data.error, { title: 'Error', type: 'error' });
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
            <button
              type="button"
              onClick={openAddModal}
              className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
            >
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

        <AppModal open={showAdd} onClose={closeAddModal}>
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className={`${APP_MODAL_PANEL} relative z-10 w-full rounded-xl`}
              style={{ maxWidth: '32rem', height: 'auto', maxHeight: '90vh' }}
            >
              <div className={APP_MODAL_HEADER}>
                <h2 className="text-base font-semibold text-gray-900">Add Syllabus Chapter</h2>
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  aria-label="Close"
                >
                  <FiX size={20} />
                </button>
              </div>

              <div className={`${APP_MODAL_BODY} px-4 sm:px-6 py-4 space-y-4`}>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addForm.class_id}
                    onChange={(e) =>
                      setAddForm({ ...addForm, class_id: e.target.value, subject_id: '' })
                    }
                    className={selectClass}
                  >
                    <option value="">Select class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addForm.subject_id}
                    onChange={(e) => setAddForm({ ...addForm, subject_id: e.target.value })}
                    className={selectClass}
                    disabled={!addForm.class_id}
                  >
                    <option value="">
                      {!addForm.class_id
                        ? 'Select class first'
                        : filteredAddSubjects.length === 0
                          ? 'No subjects for this class'
                          : 'Select subject'}
                    </option>
                    {filteredAddSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.code ? ` (${s.code})` : ''}
                      </option>
                    ))}
                  </select>
                  {addForm.class_id && filteredAddSubjects.length === 0 && (
                    <p className="mt-1 text-xs text-amber-600">
                      Assign subjects to this class under Academics → Subjects first.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Chapter title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addForm.title}
                    onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                    className={inputClass}
                    placeholder="e.g. Introduction to Algebra"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Total periods
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={addForm.total_periods}
                      onChange={(e) => setAddForm({ ...addForm, total_periods: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Sort order
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={addForm.sort_order}
                      onChange={(e) => setAddForm({ ...addForm, sort_order: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div className={APP_MODAL_FOOTER}>
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addChapter}
                  disabled={!canAddChapter}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </AppModal>

        {showProgress && (
          <AppModal open={Boolean(showProgress)} onClose={() => setShowProgress(null)}>
            <div className="flex min-h-full items-center justify-center p-4">
              <div
                className={`${APP_MODAL_PANEL} relative z-10 w-full rounded-xl`}
                style={{ maxWidth: '32rem', height: 'auto', maxHeight: '90vh' }}
              >
                <div className={APP_MODAL_HEADER}>
                  <h2 className="text-base font-semibold text-gray-900 truncate pr-2">
                    Update Progress — {showProgress.title}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowProgress(null)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 shrink-0"
                    aria-label="Close"
                  >
                    <FiX size={20} />
                  </button>
                </div>

                <div className={`${APP_MODAL_BODY} px-4 sm:px-6 py-4 space-y-4`}>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Teacher</label>
                    <select
                      value={progressForm.staff_id}
                      onChange={(e) => setProgressForm({ ...progressForm, staff_id: e.target.value })}
                      className={selectClass}
                    >
                      <option value="">Select teacher</option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.first_name} {s.last_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Periods completed
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={showProgress.total_periods}
                      value={progressForm.periods_completed}
                      onChange={(e) =>
                        setProgressForm({ ...progressForm, periods_completed: e.target.value })
                      }
                      className={inputClass}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Out of {showProgress.total_periods} total periods
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                    <select
                      value={progressForm.status}
                      onChange={(e) => setProgressForm({ ...progressForm, status: e.target.value })}
                      className={selectClass}
                    >
                      <option value="not_started">Not started</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                    <textarea
                      value={progressForm.notes}
                      onChange={(e) => setProgressForm({ ...progressForm, notes: e.target.value })}
                      className={`${inputClass} resize-none`}
                      rows={3}
                      placeholder="Optional notes"
                    />
                  </div>
                </div>

                <div className={APP_MODAL_FOOTER}>
                  <button
                    type="button"
                    onClick={() => setShowProgress(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveProgress}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </AppModal>
        )}
      </div>
    </DashboardLayout>
  );
}
