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
import { FiChevronDown, FiChevronRight, FiPlus, FiTrash2, FiX } from 'react-icons/fi';

const fieldClass =
  'w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:bg-gray-50 disabled:text-gray-500';

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Waiting',
  in_progress: 'In progress',
  completed: 'Done',
};

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
  const [filterSubject, setFilterSubject] = useState('');
  const [coverage, setCoverage] = useState<'all' | 'open'>('all');
  const [expandedClassId, setExpandedClassId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showProgress, setShowProgress] = useState<Chapter | null>(null);
  const [addForm, setAddForm] = useState({ class_id: '', subject_id: '', title: '', total_periods: '5', sort_order: '0' });
  const [progressForm, setProgressForm] = useState({ staff_id: '', periods_completed: '0', status: 'not_started', notes: '' });

  const fetchData = useCallback(async () => {
    const [cRes, clsRes, csRes, subRes, stRes] = await Promise.all([
      fetch('/api/syllabus'),
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
  }, []);

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

  const subjectOptions = useMemo(() => {
    const seen = new Set<number>();
    return classSubjects
      .filter((row) => {
        if (filterClass && String(row.class_id) !== filterClass) return false;
        if (seen.has(Number(row.subject_id))) return false;
        seen.add(Number(row.subject_id));
        return true;
      })
      .map((row) => ({ id: Number(row.subject_id), name: row.subject_name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [classSubjects, filterClass]);

  const grouped = useMemo(() => {
    return sortClassesByName(classes)
      .filter((cls) => !filterClass || String(cls.id) === filterClass)
      .map((cls) => {
        const seen = new Set<number>();
        const subjectsForClass = classSubjects
          .filter((row) => {
            if (Number(row.class_id) !== cls.id || seen.has(Number(row.subject_id))) return false;
            if (filterSubject && String(row.subject_id) !== filterSubject) return false;
            seen.add(Number(row.subject_id));
            return true;
          })
          .map((row) => ({
            subject_id: Number(row.subject_id),
            subject_name: row.subject_name,
            chapters: chapters
              .filter((chapter) => chapter.class_id === cls.id && chapter.subject_id === Number(row.subject_id))
              .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title)),
          }))
          .sort((a, b) => a.subject_name.localeCompare(b.subject_name));
        const chapterCount = subjectsForClass.reduce((sum, subject) => sum + subject.chapters.length, 0);
        return { ...cls, subjects: subjectsForClass, chapterCount };
      })
      .filter((cls) => (coverage === 'all' || cls.chapterCount === 0) && (filterSubject ? cls.subjects.length > 0 : true));
  }, [chapters, classes, classSubjects, coverage, filterClass, filterSubject]);

  useEffect(() => {
    if (grouped.length === 0) {
      setExpandedClassId(null);
      return;
    }
    setExpandedClassId((current) =>
      current != null && grouped.some((cls) => cls.id === current) ? current : grouped[0].id,
    );
  }, [grouped]);

  const summary = useMemo(() => {
    const waiting = chapters.filter((chapter) => (chapter.progress_status || 'not_started') === 'not_started').length;
    const active = chapters.filter((chapter) => chapter.progress_status === 'in_progress').length;
    const done = chapters.filter((chapter) => chapter.progress_status === 'completed').length;
    const classesWithChapters = new Set(chapters.map((chapter) => chapter.class_id));
    return {
      waiting,
      active,
      done,
      openClasses: classes.filter((cls) => !classesWithChapters.has(cls.id)).length,
    };
  }, [chapters, classes]);

  const openAddModal = (classId = '', subjectId = '') => {
    setAddForm({
      class_id: classId,
      subject_id: subjectId,
      title: '',
      total_periods: '5',
      sort_order: '0',
    });
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
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Syllabus</h1>
            <p className="mt-0.5 text-xs text-gray-500">
              Chapters by class and subject. {summary.openClasses} class{summary.openClasses === 1 ? '' : 'es'} still have no chapters.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openAddModal(filterClass, filterSubject)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
          >
            <FiPlus size={14} /> Add chapter
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: 'Waiting', value: summary.waiting, tone: 'bg-gray-50 text-gray-900' },
            { label: 'In progress', value: summary.active, tone: 'bg-amber-50 text-amber-900' },
            { label: 'Done', value: summary.done, tone: 'bg-green-50 text-green-900' },
            { label: 'Classes open', value: summary.openClasses, tone: 'bg-white text-gray-900' },
          ].map((card) => (
            <div key={card.label} className={`rounded-xl border border-gray-200 px-3 py-2 shadow-sm ${card.tone}`}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{card.label}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
          <label className="min-w-[10rem] flex-1">
            <span className="mb-1 block text-[11px] font-medium text-gray-600">Class</span>
            <select
              value={filterClass}
              onChange={(event) => {
                setFilterClass(event.target.value);
                setFilterSubject('');
              }}
              className={fieldClass}
            >
              <option value="">All classes</option>
              {sortClassesByName(classes).map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </label>
          <label className="min-w-[10rem] flex-1">
            <span className="mb-1 block text-[11px] font-medium text-gray-600">Subject</span>
            <select value={filterSubject} onChange={(event) => setFilterSubject(event.target.value)} className={fieldClass}>
              <option value="">All subjects</option>
              {subjectOptions.map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </label>
          <div className="inline-flex rounded-md border border-gray-200 p-0.5 text-[11px]">
            <button type="button" onClick={() => setCoverage('all')} className={`rounded px-2 py-1 ${coverage === 'all' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}>All</button>
            <button type="button" onClick={() => setCoverage('open')} className={`rounded px-2 py-1 ${coverage === 'open' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}>No chapters</button>
          </div>
        </div>

        {grouped.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-xs text-gray-500 shadow-sm">
            No classes match these filters.
          </p>
        ) : (
          <div className="space-y-3">
            {grouped.map((cls) => {
              const open = expandedClassId === cls.id;
              return (
              <section key={cls.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setExpandedClassId(open ? null : cls.id)}
                  className={`flex w-full flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-gray-50 ${open ? 'border-b border-gray-100' : ''}`}
                  aria-expanded={open}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {open ? <FiChevronDown className="shrink-0 text-gray-400" size={14} /> : <FiChevronRight className="shrink-0 text-gray-400" size={14} />}
                    <span>
                      <span className="block text-sm font-semibold text-gray-900">{cls.name}</span>
                      <span className="block text-[11px] text-gray-500">{cls.chapterCount} chapter{cls.chapterCount === 1 ? '' : 's'}</span>
                    </span>
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cls.chapterCount > 0 ? 'border border-green-200 bg-green-50 text-green-800' : 'border border-amber-200 bg-amber-50 text-amber-800'}`}>
                    {cls.chapterCount > 0 ? 'Started' : 'No chapters'}
                  </span>
                </button>
                {!open ? null : cls.subjects.length === 0 ? (
                  <div className="flex items-center justify-between gap-3 px-4 py-4">
                    <p className="text-xs text-gray-500">Map subjects to this class before adding chapters.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {cls.subjects.map((subject) => (
                      <div key={subject.subject_id} className="px-4 py-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-gray-900">{subject.subject_name}</p>
                          <button
                            type="button"
                            onClick={() => openAddModal(String(cls.id), String(subject.subject_id))}
                            className="text-[11px] font-medium text-primary-600 hover:text-primary-700"
                          >
                            Add chapter
                          </button>
                        </div>
                        {subject.chapters.length === 0 ? (
                          <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800">No chapters yet.</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {subject.chapters.map((chapter) => {
                              const status = chapter.progress_status || 'not_started';
                              return (
                                <li key={chapter.id} className="rounded-md bg-gray-50 px-2.5 py-2">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-xs font-medium text-gray-900">{chapter.title}</p>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${status === 'completed' ? 'bg-green-100 text-green-800' : status === 'in_progress' ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-700'}`}>
                                      {STATUS_LABEL[status] || status}
                                    </span>
                                  </div>
                                  <div className="mt-1.5 flex items-center gap-2">
                                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                                      <div className="h-full rounded-full bg-primary-600" style={{ width: `${progressPct(chapter)}%` }} />
                                    </div>
                                    <span className="shrink-0 text-[11px] tabular-nums text-gray-500">
                                      {chapter.periods_completed}/{chapter.total_periods}
                                    </span>
                                  </div>
                                  <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-gray-500">
                                    <span className="truncate">{chapter.teacher_name || 'No teacher on this chapter'}</span>
                                    <span className="flex shrink-0 items-center gap-2">
                                      <button type="button" onClick={() => openProgress(chapter)} className="font-medium text-primary-600 hover:text-primary-700">Update</button>
                                      <button type="button" onClick={() => removeChapter(chapter.id)} className="text-red-600 hover:text-red-700" aria-label="Remove chapter">
                                        <FiTrash2 size={13} />
                                      </button>
                                    </span>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
              );
            })}
          </div>
        )}

        <AppModal open={showAdd} onClose={closeAddModal}>
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className={`${APP_MODAL_PANEL_STRUCTURED} relative z-10 w-full rounded-xl`}
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
                    className={fieldClass}
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
                    className={fieldClass}
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
                    className={fieldClass}
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
                      className={fieldClass}
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
                      className={fieldClass}
                    />
                  </div>
                </div>
              </div>

              <div className={APP_MODAL_FOOTER}>
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addChapter}
                  disabled={!canAddChapter}
                  className="rounded-md bg-primary-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                className={`${APP_MODAL_PANEL_STRUCTURED} relative z-10 w-full rounded-xl`}
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
                      className={fieldClass}
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
                      onChange={(e) => {
                        const periods = Math.max(0, parseInt(e.target.value || '0', 10) || 0);
                        const status =
                          periods <= 0 ? 'not_started' : periods >= showProgress.total_periods ? 'completed' : 'in_progress';
                        setProgressForm({ ...progressForm, periods_completed: String(periods), status });
                      }}
                      className={fieldClass}
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
                      className={fieldClass}
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
                      className={`${fieldClass} resize-none`}
                      rows={3}
                      placeholder="Optional notes"
                    />
                  </div>
                </div>

                <div className={APP_MODAL_FOOTER}>
                  <button
                    type="button"
                    onClick={() => setShowProgress(null)}
                    className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveProgress}
                    className="rounded-md bg-primary-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
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
