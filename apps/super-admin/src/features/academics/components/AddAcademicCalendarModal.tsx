'use client';

import AppModal, {
  APP_MODAL_BODY,
  APP_MODAL_FOOTER,
  APP_MODAL_HEADER,
  APP_MODAL_PANEL_STRUCTURED,
} from '@/shared/components/common/AppModal';
import { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { getCalendarDateString } from '@edulakhya/utils';
import type {
  AcademicCalendarCategory,
  AcademicCalendarEntry,
} from '@/lib/academic-calendar';
import { useSettings } from '@/shared/SettingsContext';

const HOLIDAY_TYPES = [
  { value: 'public', label: 'Public Holiday' },
  { value: 'school', label: 'School Holiday' },
  { value: 'national', label: 'National Holiday' },
  { value: 'festival', label: 'Festival' },
] as const;

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Everyone' },
  { value: 'parents', label: 'Parents' },
  { value: 'students', label: 'Students' },
  { value: 'staff', label: 'Staff' },
] as const;

const CATEGORY_LABELS: Record<Exclude<AcademicCalendarCategory, 'all'>, string> = {
  holiday: 'Holiday',
  exam: 'Exam',
  ptm: 'PTM',
  event: 'Event',
  term_date: 'Term Date',
};

const ENTRY_TYPE_OPTIONS: { value: Exclude<AcademicCalendarCategory, 'all'>; label: string }[] = [
  { value: 'holiday', label: 'Holiday' },
  { value: 'exam', label: 'Exam' },
  { value: 'ptm', label: 'PTM' },
  { value: 'event', label: 'Event' },
  { value: 'term_date', label: 'Term Date' },
];

interface AddAcademicCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  category: Exclude<AcademicCalendarCategory, 'all'>;
  allowCategorySelect?: boolean;
  initialDate?: string;
  editEntry?: AcademicCalendarEntry | null;
}

function todayIso() {
  return getCalendarDateString();
}

export default function AddAcademicCalendarModal({
  isOpen,
  onClose,
  onSuccess,
  category,
  allowCategorySelect = false,
  initialDate,
  editEntry,
}: AddAcademicCalendarModalProps) {
  const { settings } = useSettings();
  const isEditing = Boolean(editEntry);
  const [selectedCategory, setSelectedCategory] =
    useState<Exclude<AcademicCalendarCategory, 'all'>>(category);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    holidayType: 'school' as (typeof HOLIDAY_TYPES)[number]['value'],
    startDate: todayIso(),
    endDate: '',
    allDay: true,
    startTime: '',
    endTime: '',
    location: '',
    audience: 'all' as (typeof AUDIENCE_OPTIONS)[number]['value'],
    status: 'published' as 'draft' | 'published' | 'cancelled',
    academicYear: settings.academic_year || '',
    termNumber: '',
  });

  useEffect(() => {
    if (!isOpen) return;

    if (!editEntry) {
      setSelectedCategory(category);
    }

    if (editEntry) {
      setForm({
        title: editEntry.title,
        description: editEntry.description || '',
        holidayType: (editEntry.holiday_type || 'school') as (typeof HOLIDAY_TYPES)[number]['value'],
        startDate: editEntry.start_date,
        endDate: editEntry.end_date !== editEntry.start_date ? editEntry.end_date : '',
        allDay: editEntry.all_day ?? true,
        startTime: editEntry.start_time?.slice(0, 5) || '',
        endTime: editEntry.end_time?.slice(0, 5) || '',
        location: editEntry.location || '',
        audience: (editEntry.audience || 'all') as (typeof AUDIENCE_OPTIONS)[number]['value'],
        status: (editEntry.status as 'draft' | 'published' | 'cancelled') || 'published',
        academicYear: editEntry.academic_year || settings.academic_year || '',
        termNumber: editEntry.term_number != null ? String(editEntry.term_number) : '',
      });
    } else {
      const date = initialDate || todayIso();
      setForm({
        title: '',
        description: '',
        holidayType: 'school',
        startDate: date,
        endDate: date,
        allDay: true,
        startTime: '',
        endTime: '',
        location: '',
        audience: 'all',
        status: 'published',
        academicYear: settings.academic_year || '',
        termNumber: '',
      });
    }
    setError('');
  }, [isOpen, editEntry, initialDate, settings.academic_year, category]);

  const activeCategory = editEntry?.category ?? selectedCategory;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim() || !form.startDate) {
      setError('Title and start date are required');
      return;
    }

    if (activeCategory === 'term_date' && !form.endDate) {
      setError('End date is required for term dates');
      return;
    }

    setSubmitting(true);

    try {
      const url = isEditing
        ? `/api/academics/academic-calendar/${editEntry!.id}?source_kind=${editEntry!.source_kind}`
        : '/api/academics/academic-calendar';
      const method = isEditing ? 'PUT' : 'POST';

      let body: Record<string, unknown>;

      if (activeCategory === 'holiday') {
        body = {
          category: 'holiday',
          date: form.startDate,
          name: form.title.trim(),
          type: form.holidayType,
          description: form.description.trim() || null,
        };
      } else if (activeCategory === 'term_date') {
        body = {
          category: 'term_date',
          academic_year: form.academicYear.trim(),
          term_name: form.title.trim(),
          term_number: form.termNumber ? parseInt(form.termNumber, 10) : null,
          start_date: form.startDate,
          end_date: form.endDate || form.startDate,
          description: form.description.trim() || null,
        };
      } else {
        body = {
          category: activeCategory,
          title: form.title.trim(),
          description: form.description.trim() || null,
          start_date: form.startDate,
          end_date: form.endDate || form.startDate,
          all_day: form.allDay,
          start_time: form.allDay ? null : form.startTime || null,
          end_time: form.allDay ? null : form.endTime || null,
          location: form.location.trim() || null,
          audience: form.audience,
          status: form.status,
        };
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (data.success) {
        onSuccess();
        onClose();
      } else {
        setError(data.error || 'Failed to save entry');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const modalTitle = isEditing
    ? `Edit ${CATEGORY_LABELS[activeCategory]}`
    : allowCategorySelect
      ? 'Add Entry'
      : `Add ${CATEGORY_LABELS[activeCategory]}`;

  const titleLabel =
    activeCategory === 'holiday'
      ? 'Holiday Name'
      : activeCategory === 'term_date'
        ? 'Term Name'
        : activeCategory === 'exam'
          ? 'Exam Title'
          : activeCategory === 'ptm'
            ? 'PTM Title'
            : 'Event Title';

  return (
    <AppModal open={isOpen} onClose={onClose}>
      <div className={APP_MODAL_PANEL_STRUCTURED}>
        <div className={APP_MODAL_HEADER}>
          <h2 className="text-xl text-gray-900">{modalTitle}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <FiX size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className={`${APP_MODAL_BODY} space-y-4 p-6`}>
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>
            )}

            {allowCategorySelect && !isEditing && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Entry Type *</label>
                <div className="flex flex-wrap gap-2">
                  {ENTRY_TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedCategory(option.value)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        selectedCategory === option.value
                          ? 'border-primary-600 bg-primary-600 text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{titleLabel} *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                required
              />
            </div>

            {activeCategory === 'holiday' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Holiday Type *</label>
                <select
                  value={form.holidayType}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      holidayType: e.target.value as (typeof HOLIDAY_TYPES)[number]['value'],
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  {HOLIDAY_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeCategory === 'term_date' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Academic Year *</label>
                  <input
                    type="text"
                    value={form.academicYear}
                    onChange={(e) => setForm((prev) => ({ ...prev, academicYear: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    placeholder="e.g. 2026-27"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Term Number</label>
                  <input
                    type="number"
                    min={1}
                    value={form.termNumber}
                    onChange={(e) => setForm((prev) => ({ ...prev, termNumber: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    placeholder="e.g. 1"
                  />
                </div>
              </div>
            )}

            {activeCategory !== 'holiday' && activeCategory !== 'term_date' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Audience</label>
                  <select
                    value={form.audience}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        audience: e.target.value as (typeof AUDIENCE_OPTIONS)[number]['value'],
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  >
                    {AUDIENCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        status: e.target.value as 'draft' | 'published' | 'cancelled',
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {activeCategory === 'term_date' ? 'Start Date *' : 'Date *'}
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              {(activeCategory === 'term_date' ||
                activeCategory === 'exam' ||
                activeCategory === 'ptm' ||
                activeCategory === 'event') && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    min={form.startDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
              )}
            </div>

            {activeCategory !== 'holiday' && activeCategory !== 'term_date' && (
              <>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.allDay}
                    onChange={(e) => setForm((prev) => ({ ...prev, allDay: e.target.checked }))}
                  />
                  All day
                </label>

                {!form.allDay && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Start Time</label>
                      <input
                        type="time"
                        value={form.startTime}
                        onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">End Time</label>
                      <input
                        type="time"
                        value={form.endTime}
                        onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    placeholder="Optional venue"
                  />
                </div>
              </>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
          </div>

          <div className={`${APP_MODAL_FOOTER} gap-3`}>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary-600 px-5 py-2.5 text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </AppModal>
  );
}
