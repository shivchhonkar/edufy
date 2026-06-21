'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { getCalendarDateString } from '@edulakhya/utils';
import type { CalendarEvent } from '@/lib/school-calendar';

export type CalendarFormKind = 'holiday' | 'school_event';

interface AddCalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: string;
  editEvent?: CalendarEvent | null;
}

const HOLIDAY_TYPES = [
  { value: 'public', label: 'Public Holiday' },
  { value: 'school', label: 'School Holiday' },
  { value: 'national', label: 'National Holiday' },
  { value: 'festival', label: 'Festival' },
] as const;

const EVENT_TYPES = [
  { value: 'event', label: 'General Event' },
  { value: 'exam', label: 'Exam' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'sports', label: 'Sports' },
  { value: 'other', label: 'Other' },
] as const;

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Everyone' },
  { value: 'parents', label: 'Parents' },
  { value: 'students', label: 'Students' },
  { value: 'staff', label: 'Staff' },
] as const;

function todayIso() {
  return getCalendarDateString();
}

export default function AddCalendarEventModal({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
  editEvent,
}: AddCalendarEventModalProps) {
  const isEditing = Boolean(editEvent);
  const [kind, setKind] = useState<CalendarFormKind>('school_event');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    holidayType: 'school' as (typeof HOLIDAY_TYPES)[number]['value'],
    eventType: 'event' as (typeof EVENT_TYPES)[number]['value'],
    startDate: todayIso(),
    endDate: '',
    allDay: true,
    startTime: '',
    endTime: '',
    location: '',
    audience: 'parents' as (typeof AUDIENCE_OPTIONS)[number]['value'],
    status: 'published' as 'draft' | 'published' | 'cancelled',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (editEvent) {
      const isHoliday = editEvent.kind === 'holiday';
      setKind(isHoliday ? 'holiday' : 'school_event');
      setFormData({
        title: editEvent.title,
        description: editEvent.description || '',
        holidayType: (isHoliday ? editEvent.event_type : 'school') as (typeof HOLIDAY_TYPES)[number]['value'],
        eventType: (isHoliday ? 'event' : editEvent.event_type) as (typeof EVENT_TYPES)[number]['value'],
        startDate: editEvent.start_date,
        endDate: editEvent.end_date !== editEvent.start_date ? editEvent.end_date : '',
        allDay: editEvent.all_day,
        startTime: editEvent.start_time?.slice(0, 5) || '',
        endTime: editEvent.end_time?.slice(0, 5) || '',
        location: editEvent.location || '',
        audience: (editEvent.audience || 'parents') as (typeof AUDIENCE_OPTIONS)[number]['value'],
        status: (editEvent.status as 'draft' | 'published' | 'cancelled') || 'published',
      });
    } else {
      const date = initialDate || todayIso();
      setKind('school_event');
      setFormData({
        title: '',
        description: '',
        holidayType: 'school',
        eventType: 'event',
        startDate: date,
        endDate: date,
        allDay: true,
        startTime: '',
        endTime: '',
        location: '',
        audience: 'parents',
        status: 'published',
      });
    }
    setError('');
  }, [isOpen, editEvent, initialDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim() || !formData.startDate) {
      setError('Title and start date are required');
      return;
    }

    setSubmitting(true);

    try {
      const isHoliday = kind === 'holiday';
      const url = isEditing
        ? `/api/calendar/events/${editEvent!.id}?kind=${editEvent!.kind}`
        : '/api/calendar/events';
      const method = isEditing ? 'PUT' : 'POST';

      const body = isHoliday
        ? {
            kind: 'holiday',
            date: formData.startDate,
            name: formData.title.trim(),
            type: formData.holidayType,
            description: formData.description.trim() || null,
          }
        : {
            kind: 'school_event',
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            event_type: formData.eventType,
            start_date: formData.startDate,
            end_date: formData.endDate || formData.startDate,
            all_day: formData.allDay,
            start_time: formData.allDay ? null : formData.startTime || null,
            end_time: formData.allDay ? null : formData.endTime || null,
            location: formData.location.trim() || null,
            audience: formData.audience,
            status: formData.status,
          };

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
        setError(data.error || 'Failed to save calendar entry');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppModal open={isOpen} onClose={onClose}>
      <div className="flex flex-col h-full w-full min-h-0 min-w-0 bg-white shadow-2xl w-full h-full overflow-y-auto flex flex-col">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl text-gray-900">
            {isEditing ? 'Edit Calendar Entry' : 'Add Calendar Entry'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Entry Type</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setKind('school_event')}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                    kind === 'school_event'
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  Event
                </button>
                <button
                  type="button"
                  onClick={() => setKind('holiday')}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                    kind === 'holiday'
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  Holiday
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {kind === 'holiday' ? 'Holiday Name' : 'Event Title'} *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder={kind === 'holiday' ? 'e.g. Diwali Break' : 'e.g. Annual Day'}
              required
            />
          </div>

          {kind === 'holiday' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Type *</label>
              <select
                value={formData.holidayType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    holidayType: e.target.value as (typeof HOLIDAY_TYPES)[number]['value'],
                  }))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                {HOLIDAY_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                  <select
                    value={formData.eventType}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        eventType: e.target.value as (typeof EVENT_TYPES)[number]['value'],
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    {EVENT_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
                  <select
                    value={formData.audience}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        audience: e.target.value as (typeof AUDIENCE_OPTIONS)[number]['value'],
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    {AUDIENCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value as 'draft' | 'published' | 'cancelled',
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={formData.allDay}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, allDay: e.target.checked }))
                      }
                    />
                    All day event
                  </label>
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              />
            </div>
            {kind === 'school_event' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.endDate}
                  min={formData.startDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            )}
          </div>

          {kind === 'school_event' && !formData.allDay && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
          )}

          {kind === 'school_event' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Optional venue"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Optional details for parents and staff"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </AppModal>
  );
}
