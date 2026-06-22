'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useState } from 'react';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';
import { useDialog } from '@/shared/context/DialogContext';
import { compareClassNames } from '@/lib/class-sort';
import {
  FiBookOpen,
  FiCalendar,
  FiEdit2,
  FiEye,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiX,
} from 'react-icons/fi';

interface ClassOption {
  id: number;
  name: string;
  academic_year: string;
}

interface SectionOption {
  id: number;
  class_id: number;
  name: string;
}

interface SubjectOption {
  id: number;
  name: string;
}

interface StaffOption {
  id: number;
  first_name: string;
  last_name: string;
}

interface AcademicYear {
  id: number;
  name: string;
  is_active: boolean;
}

export interface LessonPlan {
  id: number;
  title: string;
  class_id: number;
  section_id?: number | null;
  subject_id: number;
  staff_id?: number | null;
  lesson_date: string;
  duration_minutes: number;
  topic?: string | null;
  objectives?: string | null;
  materials?: string | null;
  procedure?: string | null;
  assessment?: string | null;
  homework?: string | null;
  status: string;
  academic_year?: string | null;
  week_number?: number | null;
  period_number?: number | null;
  class_name?: string;
  section_name?: string | null;
  subject_name?: string;
  teacher_name?: string;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const emptyForm = {
  title: '',
  class_id: '',
  section_id: '',
  subject_id: '',
  staff_id: '',
  lesson_date: new Date().toISOString().split('T')[0],
  duration_minutes: '40',
  topic: '',
  objectives: '',
  materials: '',
  procedure: '',
  assessment: '',
  homework: '',
  status: 'scheduled',
  academic_year: '',
  week_number: '',
  period_number: '',
};

function formatLessonDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

interface LessonPlansTabProps {
  classes: ClassOption[];
  academicYears: AcademicYear[];
}

export default function LessonPlansTab({ classes, academicYears }: LessonPlansTabProps) {
  const { alert } = useDialog();
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState<LessonPlan | null>(null);
  const [editing, setEditing] = useState<LessonPlan | null>(null);
  const [deleting, setDeleting] = useState<LessonPlan | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const sortedClasses = [...classes].sort((a, b) => compareClassNames(a.name, b.name));

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterClass) params.set('class_id', filterClass);
      if (filterSubject) params.set('subject_id', filterSubject);
      if (filterStatus) params.set('status', filterStatus);
      if (search.trim()) params.set('search', search.trim());
      const activeYear = academicYears.find((y) => y.is_active)?.name;
      if (activeYear) params.set('academic_year', activeYear);

      const res = await fetch(`/api/lesson-plans?${params}`);
      const data = await res.json();
      if (data.success) setPlans(data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [filterClass, filterSubject, filterStatus, search, academicYears]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    fetch('/api/subjects')
      .then((r) => r.json())
      .then((d) => d.success && setSubjects(d.data))
      .catch(console.error);
    fetch('/api/staff?limit=200&status=active')
      .then((r) => r.json())
      .then((d) => d.success && setStaff(d.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!form.class_id) {
      setSections([]);
      return;
    }
    fetch(`/api/sections?class_id=${form.class_id}`)
      .then((r) => r.json())
      .then((d) => d.success && setSections(d.data))
      .catch(console.error);
  }, [form.class_id]);

  const openCreate = () => {
    const activeYear = academicYears.find((y) => y.is_active)?.name || '';
    setEditing(null);
    setForm({ ...emptyForm, academic_year: activeYear });
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (plan: LessonPlan) => {
    setEditing(plan);
    setForm({
      title: plan.title,
      class_id: String(plan.class_id),
      section_id: plan.section_id ? String(plan.section_id) : '',
      subject_id: String(plan.subject_id),
      staff_id: plan.staff_id ? String(plan.staff_id) : '',
      lesson_date: plan.lesson_date.split('T')[0],
      duration_minutes: String(plan.duration_minutes ?? 40),
      topic: plan.topic || '',
      objectives: plan.objectives || '',
      materials: plan.materials || '',
      procedure: plan.procedure || '',
      assessment: plan.assessment || '',
      homework: plan.homework || '',
      status: plan.status || 'scheduled',
      academic_year: plan.academic_year || '',
      week_number: plan.week_number != null ? String(plan.week_number) : '',
      period_number: plan.period_number != null ? String(plan.period_number) : '',
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setFormError('Title is required');
      return;
    }
    if (!form.class_id || !form.subject_id || !form.lesson_date) {
      setFormError('Class, subject, and lesson date are required');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const payload = {
        title: form.title.trim(),
        class_id: parseInt(form.class_id, 10),
        section_id: form.section_id ? parseInt(form.section_id, 10) : null,
        subject_id: parseInt(form.subject_id, 10),
        staff_id: form.staff_id ? parseInt(form.staff_id, 10) : null,
        lesson_date: form.lesson_date,
        duration_minutes: parseInt(form.duration_minutes, 10) || 40,
        topic: form.topic,
        objectives: form.objectives,
        materials: form.materials,
        procedure: form.procedure,
        assessment: form.assessment,
        homework: form.homework,
        status: form.status,
        academic_year: form.academic_year || null,
        week_number: form.week_number ? parseInt(form.week_number, 10) : null,
        period_number: form.period_number ? parseInt(form.period_number, 10) : null,
      };

      const url = editing ? `/api/lesson-plans/${editing.id}` : '/api/lesson-plans';
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        fetchPlans();
      } else {
        setFormError(data.error || 'Failed to save');
      }
    } catch {
      setFormError('Failed to save lesson plan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/lesson-plans/${deleting.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDeleting(null);
        fetchPlans();
      } else {
        await alert(data.error || 'Failed to delete', { title: 'Error', type: 'error' });
      }
    } catch {
      await alert('Failed to delete lesson plan', { title: 'Error', type: 'error' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* <p className="text-sm text-gray-600">
          Plan daily lessons by class and subject — objectives, materials, procedure, and assessment.
        </p> */}
        <button
          type="button"
          onClick={openCreate}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm"
        >
          <FiPlus size={16} />
          Add Lesson Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2 relative">
          <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search title or topic..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
        >
          <option value="">All classes</option>
          {sortedClasses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <select
        className="border rounded-lg px-3 py-2 text-sm max-w-xs"
        value={filterSubject}
        onChange={(e) => setFilterSubject(e.target.value)}
      >
        <option value="">All subjects</option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
          </div>
        ) : plans.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">
            No lesson plans yet. Click &quot;Add Lesson Plan&quot; to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500 sticky top-0 z-10 shrink-0">
                <tr>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Title</th>
                  <th className="text-left p-3">Class</th>
                  <th className="text-left p-3">Subject</th>
                  <th className="text-left p-3">Teacher</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} className="border-b hover:bg-gray-50 sticky top-0 z-10 shrink-0">
                    <td className="p-3 whitespace-nowrap text-gray-700">
                      {formatLessonDate(plan.lesson_date)}
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-gray-900">{plan.title}</p>
                      {plan.topic && <p className="text-xs text-gray-500 truncate max-w-[12rem]">{plan.topic}</p>}
                    </td>
                    <td className="p-3 text-gray-600">
                      {plan.class_name}
                      {plan.section_name ? ` · ${plan.section_name}` : ''}
                    </td>
                    <td className="p-3 text-gray-600">{plan.subject_name}</td>
                    <td className="p-3 text-gray-600">{plan.teacher_name || '—'}</td>
                    <td className="p-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                          STATUS_STYLES[plan.status] || STATUS_STYLES.scheduled
                        }`}
                      >
                        {plan.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowView(plan)}
                          className="text-gray-500 hover:text-primary-600 p-1"
                          title="View"
                        >
                          <FiEye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(plan)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Edit"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(plan)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <AppModal open={showForm} onClose={() => setShowForm(false)}>
      <div className={APP_MODAL_PANEL}>
            <div className="sticky top-0 bg-white border-b px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg text-gray-900 flex items-center gap-2">
                <FiBookOpen className="text-primary-600" />
                {editing ? 'Edit Lesson Plan' : 'New Lesson Plan'}
              </h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Introduction to Fractions"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Class *</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.class_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, class_id: e.target.value, section_id: '' }))
                    }
                  >
                    <option value="">Select class</option>
                    {sortedClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.section_id}
                    onChange={(e) => setForm((f) => ({ ...f, section_id: e.target.value }))}
                    disabled={!form.class_id}
                  >
                    <option value="">All sections</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Subject *</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.subject_id}
                    onChange={(e) => setForm((f) => ({ ...f, subject_id: e.target.value }))}
                  >
                    <option value="">Select subject</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Teacher</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.staff_id}
                    onChange={(e) => setForm((f) => ({ ...f, staff_id: e.target.value }))}
                  >
                    <option value="">Unassigned</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.first_name} {s.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lesson date *</label>
                  <input
                    type="date"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.lesson_date}
                    onChange={(e) => setForm((f) => ({ ...f, lesson_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Duration (mins)</label>
                  <input
                    type="number"
                    min={1}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.duration_minutes}
                    onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    {STATUS_OPTIONS.filter((o) => o.value).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Topic / Unit</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.topic}
                    onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Week #</label>
                  <input
                    type="number"
                    min={1}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.week_number}
                    onChange={(e) => setForm((f) => ({ ...f, week_number: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Period #</label>
                  <input
                    type="number"
                    min={1}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.period_number}
                    onChange={(e) => setForm((f) => ({ ...f, period_number: e.target.value }))}
                  />
                </div>
              </div>

              {[
                { key: 'objectives' as const, label: 'Learning objectives' },
                { key: 'materials' as const, label: 'Materials & resources' },
                { key: 'procedure' as const, label: 'Teaching procedure / activities' },
                { key: 'assessment' as const, label: 'Assessment' },
                { key: 'homework' as const, label: 'Homework / follow-up' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <textarea
                    rows={3}
                    className="w-full border rounded-lg px-3 py-2 text-sm resize-y"
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t px-5 py-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </AppModal>
      )}

      {showView && (
        <AppModal open={Boolean(showView)} onClose={() => setShowView(null)}>
      <div className={APP_MODAL_PANEL}>
            <div className="border-b px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg text-gray-900">{showView.title}</h2>
              <button type="button" onClick={() => setShowView(null)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="flex items-center gap-1 text-gray-600">
                  <FiCalendar size={12} />
                  {formatLessonDate(showView.lesson_date)}
                </span>
                <span className={`px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[showView.status]}`}>
                  {showView.status}
                </span>
              </div>
              <p>
                <span className="text-gray-500">Class:</span> {showView.class_name}
                {showView.section_name ? ` · ${showView.section_name}` : ''}
              </p>
              <p>
                <span className="text-gray-500">Subject:</span> {showView.subject_name}
              </p>
              <p>
                <span className="text-gray-500">Teacher:</span> {showView.teacher_name || '—'}
              </p>
              {showView.topic && (
                <p>
                  <span className="text-gray-500">Topic:</span> {showView.topic}
                </p>
              )}
              {[
                ['Objectives', showView.objectives],
                ['Materials', showView.materials],
                ['Procedure', showView.procedure],
                ['Assessment', showView.assessment],
                ['Homework', showView.homework],
              ].map(
                ([label, value]) =>
                  value && (
                    <div key={label as string}>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{label}</p>
                      <p className="text-gray-800 whitespace-pre-wrap">{value}</p>
                    </div>
                  )
              )}
            </div>
            <div className="border-t px-5 py-3 flex justify-end gap-2 sticky bottom-0 z-10 shrink-0 bg-white">
              <button
                type="button"
                onClick={() => {
                  openEdit(showView);
                  setShowView(null);
                }}
                className="px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setShowView(null)}
                className="px-3 py-1.5 text-sm border rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </AppModal>
      )}

      <ConfirmDialog
        isOpen={!!deleting}
        title="Delete Lesson Plan"
        message={`Delete "${deleting?.title}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        type="danger"
      />
    </div>
  );
}
