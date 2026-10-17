'use client';

import AppModal, {
  APP_MODAL_PANEL_STRUCTURED,
  APP_MODAL_HEADER,
  APP_MODAL_BODY,
  APP_MODAL_FOOTER,
} from '@/shared/components/common/AppModal';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { useDialog } from '@/shared/context/DialogContext';
import {
  FiBook,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiEye,
  FiClock,
  FiSearch,
  FiX,
} from 'react-icons/fi';

const fieldClass =
  'w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:bg-gray-50 disabled:text-gray-400';

const labelClass = 'mb-1 block text-[11px] font-medium text-gray-600';

function dateKey(value?: string | null) {
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function formatDue(value?: string | null) {
  const key = dateKey(value);
  if (!key) return '—';
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface Homework {
  id: number;
  title: string;
  description: string;
  class_id?: number;
  section_id?: number | null;
  class_name: string;
  section_name?: string | null;
  subject_name: string;
  due_date: string;
  total_marks: number;
  total_submissions: number;
  submitted_count: number;
  graded_count: number;
  status: string;
  assigned_by_name: string;
}

interface SectionOption {
  id: number;
  name: string;
  class_id: number;
}

interface HomeworkSubmission {
  id: number;
  student_id: number;
  status: string;
  first_name: string;
  last_name: string;
  admission_number?: string;
  roll_number?: string | number | null;
  submitted_at?: string | null;
  submission_text?: string | null;
  submission_file?: string | null;
  marks_obtained?: number | null;
  feedback?: string | null;
}

export default function HomeworkPage() {
  const { alert, confirm } = useDialog();
  const [homework, setHomework] = useState<Homework[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [loadingSubmissionsId, setLoadingSubmissionsId] = useState<number | null>(null);
  const [selectedHomework, setSelectedHomework] = useState<any>(null);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchHomework();
    fetchClasses();
    fetchSubjects();
  }, [filterClass, filterSection, filterSubject, filterStatus, search]);

  useEffect(() => {
    if (!filterClass) {
      setSections([]);
      setFilterSection('');
      return;
    }

    fetch(`/api/sections?class_id=${filterClass}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setSections(data.data);
        else setSections([]);
      })
      .catch(() => setSections([]));
  }, [filterClass]);

  const fetchHomework = async () => {
    try {
      let url = '/api/homework?';
      const params = [];
      if (filterClass) params.push(`class_id=${filterClass}`);
      if (filterSection) params.push(`section_id=${filterSection}`);
      if (filterSubject) params.push(`subject_id=${filterSubject}`);
      if (filterStatus) params.push(`status=${filterStatus}`);
      if (search) params.push(`search=${search}`);
      
      url += params.join('&');

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setHomework(data.data);
      }
    } catch (error) {
      console.error('Error fetching homework:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/classes');
      const data = await res.json();
      if (data.success) {
        setClasses(data.data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await fetch('/api/subjects');
      const data = await res.json();
      if (data.success) {
        setSubjects(data.data);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const handleViewSubmissions = async (hw: Homework) => {
    setShowModal(false);
    setLoadingSubmissionsId(hw.id);
    try {
      const res = await fetch(`/api/homework/${hw.id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedHomework(data.data);
        setSubmissions(data.data.submissions || []);
        setShowSubmissionsModal(true);
      } else {
        await alert(data.error || 'Failed to load submissions', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
      await alert('Failed to load submissions', { title: 'Error', type: 'error' });
    } finally {
      setLoadingSubmissionsId(null);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm('Are you sure you want to delete this homework?', {
      title: 'Delete Homework',
      type: 'danger',
      confirmText: 'Delete',
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/homework/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchHomework();
      } else {
        await alert(data.error, { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting homework:', error);
      await alert('Failed to delete homework', { title: 'Error', type: 'error' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (dueDate: string) => {
    const key = dateKey(dueDate);
    return Boolean(key) && key < todayKey();
  };

  const activeCount = homework.filter((item) => item.status === 'active').length;
  const overdueCount = homework.filter((item) => item.status === 'active' && isOverdue(item.due_date)).length;
  const completedCount = homework.filter((item) => item.status === 'completed').length;

  return (
    <DashboardLayout>
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Homework</h1>
            <p className="mt-0.5 text-xs text-gray-500">Assign work and track who has submitted.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedHomework(null);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
          >
            <FiPlus size={14} />
            Assign homework
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: 'Listed', value: homework.length, tone: 'text-gray-900' },
            { label: 'Active', value: activeCount, tone: 'text-green-700' },
            { label: 'Overdue', value: overdueCount, tone: 'text-red-700' },
            { label: 'Completed', value: completedCount, tone: 'text-blue-700' },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{item.label}</p>
              <p className={`text-lg font-semibold tabular-nums ${item.tone}`}>{item.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <FiSearch className="absolute left-2.5 top-2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search homework"
                className={`${fieldClass} pl-8`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className={fieldClass}
              value={filterClass}
              onChange={(e) => {
                setFilterClass(e.target.value);
                setFilterSection('');
              }}
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>

            <select
              className={fieldClass}
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              disabled={!filterClass}
            >
              <option value="">All Sections</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>

            <select
              className={fieldClass}
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
            >
              <option value="">All Subjects</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>

            <select
              className={fieldClass}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {(search || filterClass || filterSection || filterSubject || filterStatus) && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-gray-500">Filters</span>
                {search && (
                  <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                    Search: "{search}"
                  </span>
                )}
                {filterClass && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                    Class: {classes.find(c => c.id.toString() === filterClass)?.name}
                  </span>
                )}
                {filterSection && (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                    Section: {sections.find(s => s.id.toString() === filterSection)?.name}
                  </span>
                )}
                {filterSubject && (
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                    Subject: {subjects.find(s => s.id.toString() === filterSubject)?.name}
                  </span>
                )}
                {filterStatus && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                    Status: {filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setSearch('');
                  setFilterClass('');
                  setFilterSection('');
                  setFilterSubject('');
                  setFilterStatus('');
                }}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
              >
                <FiX size={16} />
                <span>Clear All</span>
              </button>
            </div>
          )}
        </div>

        {/* Homework List */}
        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-xs text-gray-500 shadow-sm">
            Loading homework…
          </div>
        ) : homework.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center shadow-sm">
            <FiBook className="mx-auto mb-2 text-gray-300" size={28} />
            <p className="text-sm text-gray-600">No homework found</p>
            <p className="mt-1 text-xs text-gray-400">
              {search || filterClass || filterSection || filterSubject
                ? 'Try adjusting your filters'
                : 'Use Assign homework to add the first one'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {homework.map((hw) => (
              <div key={hw.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-medium text-gray-900">{hw.title}</h3>
                      <p className="truncate text-[11px] text-gray-500">
                        {hw.class_name}
                        {hw.section_name ? ` · ${hw.section_name}` : ''}
                        {' · '}
                        {hw.subject_name}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${getStatusColor(hw.status)}`}>
                      {hw.status}
                    </span>
                  </div>

                  <p className="mb-2 line-clamp-2 text-xs text-gray-600">{hw.description}</p>

                  <div className={`mb-2 flex items-center text-xs ${
                    isOverdue(hw.due_date) && hw.status === 'active' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    <FiClock className="mr-1.5" size={13} />
                    <span>Due {formatDue(hw.due_date)}</span>
                    {isOverdue(hw.due_date) && hw.status === 'active' && (
                      <span className="ml-2 text-xs font-medium">(Overdue)</span>
                    )}
                  </div>

                  {/* Submission Stats */}
                  <div className="mb-2 grid grid-cols-3 gap-1.5 rounded-md bg-gray-50 p-2 text-center">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-500">Total</p>
                      <p className="text-sm font-semibold tabular-nums text-gray-900">{hw.total_submissions}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-500">Submitted</p>
                      <p className="text-sm font-semibold tabular-nums text-blue-700">{hw.submitted_count}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-500">Graded</p>
                      <p className="text-sm font-semibold tabular-nums text-green-700">{hw.graded_count}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                    <button
                      type="button"
                      onClick={() => handleViewSubmissions(hw)}
                      disabled={loadingSubmissionsId === hw.id}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-800 disabled:opacity-50"
                    >
                      <FiEye size={16} />
                      <span>
                        {loadingSubmissionsId === hw.id ? 'Loading…' : 'View Submissions'}
                      </span>
                    </button>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedHomework(hw);
                          setShowModal(true);
                        }}
                        className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-primary-600"
                        title="Edit"
                      >
                        <FiEdit size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(hw.id)}
                        className="rounded-md p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <HomeworkModal
          homework={selectedHomework}
          classes={classes}
          subjects={subjects}
          onClose={() => {
            setShowModal(false);
            setSelectedHomework(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setSelectedHomework(null);
            fetchHomework();
          }}
        />
      )}

      {/* Submissions Modal */}
      {showSubmissionsModal && selectedHomework && (
        <SubmissionsModal
          homework={selectedHomework}
          submissions={submissions}
          onClose={() => {
            setShowSubmissionsModal(false);
            setSelectedHomework(null);
            setSubmissions([]);
          }}
          onRefresh={() => handleViewSubmissions({ id: selectedHomework.id } as Homework)}
        />
      )}
    </DashboardLayout>
  );
}

// Homework Modal Component
function HomeworkModal({ homework, classes, subjects, onClose, onSuccess }: any) {
  const { alert } = useDialog();
  const [formData, setFormData] = useState({
    class_id: homework?.class_id ? String(homework.class_id) : '',
    section_id: homework?.section_id ? String(homework.section_id) : '',
    subject_id: homework?.subject_id ? String(homework.subject_id) : '',
    title: homework?.title || '',
    description: homework?.description || '',
    due_date: homework?.due_date?.split('T')[0] || '',
    total_marks: homework?.total_marks || 100,
    status: homework?.status || 'active',
  });
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [attachments, setAttachments] = useState<any[]>(homework?.attachments || []);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!formData.class_id) {
      setSections([]);
      return;
    }

    fetch(`/api/sections?class_id=${formData.class_id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setSections(data.data);
        else setSections([]);
      })
      .catch(() => setSections([]));
  }, [formData.class_id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (data.success) {
          setAttachments((prev) => [...prev, data.data]);
        } else {
          await alert(`Failed to upload ${file.name}: ${data.error}`, { title: 'Upload Failed', type: 'error' });
        }
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      await alert('Failed to upload files', { title: 'Error', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = homework ? `/api/homework/${homework.id}` : '/api/homework';
      const method = homework ? 'PUT' : 'POST';
      
      const payload: any = {
        ...formData,
        class_id: formData.class_id ? parseInt(formData.class_id, 10) : null,
        subject_id: formData.subject_id ? parseInt(formData.subject_id, 10) : null,
        section_id: formData.section_id ? parseInt(formData.section_id, 10) : null,
      };
      if (!homework) {
        payload.assigned_by = 1; // TODO: Get from session
      }
      if (attachments.length > 0) {
        payload.attachments = attachments;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        await alert(data.error, { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error saving homework:', error);
      await alert('Failed to save homework', { title: 'Error', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal open onClose={onClose}>
      <div className={APP_MODAL_PANEL_STRUCTURED}>
        <div className={APP_MODAL_HEADER}>
          <h2 className="text-sm font-semibold text-gray-900">
            {homework ? 'Edit homework' : 'Assign homework'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <FiX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className={`${APP_MODAL_BODY} space-y-3 p-4`}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className={labelClass}>
                Class <span className="text-red-500">*</span>
              </label>
              <select
                className={fieldClass}
                value={formData.class_id}
                onChange={(e) =>
                  setFormData({ ...formData, class_id: e.target.value, section_id: '' })
                }
                required
              >
                <option value="">Select Class</option>
                {classes.map((cls: any) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Section
              </label>
              <select
                className={fieldClass}
                value={formData.section_id}
                onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                disabled={!formData.class_id}
              >
                <option value="">All Sections</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Subject <span className="text-red-500">*</span>
              </label>
              <select
                className={fieldClass}
                value={formData.subject_id}
                onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                required
              >
                <option value="">Select Subject</option>
                {subjects.map((sub: any) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={fieldClass}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Math Assignment - Chapter 5"
              required
            />
          </div>

          <div>
            <label className={labelClass}>
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              className={fieldClass}
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter homework description and instructions..."
              required
            />
          </div>

          {/* File Upload Section */}
          <div>
            <label className={labelClass}>
              Attachments (PDF, Images, Videos)
            </label>
            <div className="mt-1">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-gray-300 px-3 py-4 hover:border-primary-500 hover:bg-gray-50">
                <div className="flex flex-col items-center text-center">
                  <p className="text-xs text-gray-600">
                    <span className="font-medium text-primary-700">Choose files</span> or drop them here
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-400">PDF, images, or video, up to 50MB</p>
                  {uploading && <p className="mt-1 text-[11px] text-primary-600">Uploading…</p>}
                </div>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.mpeg,.webm"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            </div>

            {/* Attachments List */}
            {attachments.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between rounded-md bg-gray-50 px-2 py-1.5">
                    <div className="flex min-w-0 items-center gap-2">
                      {file.type?.includes('image') && (
                        <img src={file.url} alt={file.filename} className="w-10 h-10 object-cover rounded" />
                      )}
                      {file.type?.includes('video') && (
                        <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                          </svg>
                        </div>
                      )}
                      {file.type?.includes('pdf') && (
                        <div className="w-10 h-10 bg-red-100 rounded flex items-center justify-center">
                          <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-gray-900">{file.filename}</p>
                        <p className="text-[11px] text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <FiX size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className={labelClass}>
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className={fieldClass}
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                min={todayKey()}
                required
              />
            </div>

            <div>
              <label className={labelClass}>
                Total Marks <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                className={fieldClass}
                value={formData.total_marks}
                onChange={(e) => setFormData({ ...formData, total_marks: parseInt(e.target.value) })}
                min="1"
                required
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <select
              className={fieldClass}
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          </div>

          <div className={APP_MODAL_FOOTER}>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-primary-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : homework ? 'Update Homework' : 'Assign Homework'}
            </button>
          </div>
        </form>
      </div>
    </AppModal>
  );
}

// Submissions Modal Component
function SubmissionsModal({
  homework,
  submissions,
  onClose,
  onRefresh,
}: {
  homework: Homework & { total_marks: number; description?: string };
  submissions: HomeworkSubmission[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { alert } = useDialog();
  const [gradingSubmission, setGradingSubmission] = useState<HomeworkSubmission | null>(null);
  const [marks, setMarks] = useState('');
  const [feedback, setFeedback] = useState('');
  const [grading, setGrading] = useState(false);

  const pendingCount = submissions.filter((s) => s.status === 'pending').length;
  const submittedCount = submissions.filter((s) => s.status === 'submitted').length;
  const gradedCount = submissions.filter((s) => s.status === 'graded').length;

  const handleGrade = async (submission: HomeworkSubmission) => {
    if (!marks.trim()) return;
    setGrading(true);
    try {
      const res = await fetch(`/api/homework/submissions/${submission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marks_obtained: parseInt(marks, 10),
          feedback,
          graded_by: 1, // TODO: Get from session
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGradingSubmission(null);
        setMarks('');
        setFeedback('');
        onRefresh();
      } else {
        await alert(data.error, { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error grading submission:', error);
      await alert('Failed to grade submission', { title: 'Error', type: 'error' });
    } finally {
      setGrading(false);
    }
  };

  const getSubmissionStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'graded':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const classLine = [
    homework.class_name,
    homework.section_name,
    homework.subject_name,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <AppModal open onClose={onClose}>
      <div className={APP_MODAL_PANEL_STRUCTURED}>
        <div className={`${APP_MODAL_HEADER} items-start`}>
          <div className="min-w-0 pr-3">
            <h2 className="truncate text-sm font-semibold text-gray-900">{homework.title}</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {classLine} · Due {formatDue(homework.due_date)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-600">
              <span>
                Total Marks: <span className="font-semibold text-gray-900">{homework.total_marks}</span>
              </span>
              <span>
                Assigned: <span className="font-semibold text-gray-900">{submissions.length}</span>
              </span>
              <span>
                Pending: <span className="font-semibold text-yellow-700">{pendingCount}</span>
              </span>
              <span>
                Submitted: <span className="font-semibold text-blue-700">{submittedCount}</span>
              </span>
              <span>
                Graded: <span className="font-semibold text-green-700">{gradedCount}</span>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className={`${APP_MODAL_BODY} p-4`}>
          {submissions.length === 0 ? (
            <div className="py-10 text-center">
              <FiBook className="mx-auto mb-2 text-gray-300" size={28} />
              <p className="text-sm text-gray-600">No students assigned for this homework</p>
              <p className="mt-1 text-xs text-gray-400">
                Submissions appear after homework is assigned to a class or section.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Student
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Submitted At
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Marks
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {submissions.map((submission) => (
                    <tr key={submission.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-3 py-2">
                        <div>
                          <div className="text-xs font-medium text-gray-900">
                            {submission.first_name} {submission.last_name}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {submission.admission_number}
                            {submission.roll_number != null && submission.roll_number !== ''
                              ? ` · Roll: ${submission.roll_number}`
                              : ''}
                          </div>
                          {submission.submission_text ? (
                            <p className="mt-1 max-w-xs truncate text-xs text-gray-500" title={submission.submission_text}>
                              {submission.submission_text}
                            </p>
                          ) : null}
                          {submission.submission_file ? (
                            <a
                              href={submission.submission_file}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-block text-xs text-primary-600 hover:text-primary-800"
                            >
                              View attachment
                            </a>
                          ) : null}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${getSubmissionStatusColor(submission.status)}`}
                        >
                          {submission.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-500">
                        {submission.submitted_at
                          ? new Date(submission.submitted_at).toLocaleString('en-IN')
                          : '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {submission.marks_obtained != null ? (
                          <span className="text-xs font-semibold tabular-nums text-gray-900">
                            {submission.marks_obtained}/{homework.total_marks}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Not graded</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right text-xs font-medium">
                        {submission.status === 'submitted' || submission.status === 'graded' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setGradingSubmission(submission);
                              setMarks(submission.marks_obtained?.toString() || '');
                              setFeedback(submission.feedback || '');
                            }}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            {submission.status === 'graded' ? 'Re-grade' : 'Grade'}
                          </button>
                        ) : (
                          <span className="text-gray-400 capitalize">{submission.status}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {gradingSubmission && (
            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <h3 className="mb-2 text-xs font-semibold text-gray-900">
                Grade — {gradingSubmission.first_name} {gradingSubmission.last_name}
              </h3>

              {gradingSubmission.submission_text ? (
                <div className="mb-3 rounded-md border border-gray-200 bg-white p-2.5">
                  <p className="mb-1 text-[11px] font-medium text-gray-500">Submission</p>
                  <p className="whitespace-pre-wrap text-xs text-gray-900">
                    {gradingSubmission.submission_text}
                  </p>
                </div>
              ) : null}

              {gradingSubmission.submission_file ? (
                <div className="mb-3">
                  <a
                    href={gradingSubmission.submission_file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary-600 hover:text-primary-800"
                  >
                    Open submitted attachment
                  </a>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Marks <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    className={fieldClass}
                    value={marks}
                    onChange={(e) => setMarks(e.target.value)}
                    min="0"
                    max={homework.total_marks}
                    placeholder={`Out of ${homework.total_marks}`}
                  />
                </div>

                <div>
                  <label className={labelClass}>Feedback</label>
                  <textarea
                    className={fieldClass}
                    rows={3}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Optional feedback for student..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setGradingSubmission(null);
                    setMarks('');
                    setFeedback('');
                  }}
                  className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleGrade(gradingSubmission)}
                  disabled={!marks.trim() || grading}
                  className="rounded-md bg-primary-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {grading ? 'Grading…' : 'Submit Grade'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={APP_MODAL_FOOTER}>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </AppModal>
  );
}
