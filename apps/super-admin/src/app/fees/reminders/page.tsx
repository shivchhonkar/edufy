'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { FiSearch, FiSend } from 'react-icons/fi';
import FeesPageHeader from '@/features/fees/components/FeesPageHeader';
import FeesClassSectionFilters from '@/features/fees/components/FeesClassSectionFilters';
import { useClassSectionOptions } from '@/features/fees/hooks/useClassSectionOptions';
import { useFeesStudents } from '@/features/fees/hooks/useFeesStudents';
import { formatFeeCurrency } from '@/features/fees/utils/fees-format';
import { filterFeeStudents } from '@/features/fees/utils/student-filters';
import { useSettings } from '@/shared/SettingsContext';
import { useDialog } from '@/shared/context/DialogContext';

type ReminderChannel = 'sms' | 'whatsapp' | 'email' | 'in-app';

const CHANNEL_OPTIONS: Array<{ id: ReminderChannel; label: string }> = [
  { id: 'sms', label: 'SMS' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'email', label: 'Email' },
  { id: 'in-app', label: 'In App' },
];

const DEFAULT_TEMPLATE =
  'Dear Parent, your ward has pending school fees. Kindly clear the due amount before the due date to avoid late fee. Thank you.';

const STUDENT_LIST_GRID = 'grid-cols-[3rem_3rem_minmax(0,1fr)_6.5rem]';

export default function FeesSendRemindersPage() {
  const { settings } = useSettings();
  const { alert } = useDialog();
  const { students, loading } = useFeesStudents(settings.academic_year);
  const {
    classes,
    sections,
    classId,
    sectionId,
    setClassId,
    setSectionId,
    loadingSections,
    hasActiveFilters,
  } = useClassSectionOptions();

  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [channels, setChannels] = useState<ReminderChannel[]>(['sms']);
  const [message, setMessage] = useState(DEFAULT_TEMPLATE);
  const [sending, setSending] = useState(false);

  const dueStudents = useMemo(
    () =>
      filterFeeStudents(
        students.filter((student) => (student.pendingAmount || 0) > 0),
        { search, classId, sectionId },
      ),
    [students, search, classId, sectionId],
  );

  const sortedDueStudents = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    return [...dueStudents].sort((a, b) => {
      const aSelected = selectedSet.has(a.id);
      const bSelected = selectedSet.has(b.id);
      if (aSelected !== bSelected) return aSelected ? -1 : 1;
      return 0;
    });
  }, [dueStudents, selectedIds]);

  const totalDueAmount = useMemo(
    () => dueStudents.reduce((sum, student) => sum + (student.pendingAmount || 0), 0),
    [dueStudents],
  );

  const selectedStudentsCount = selectedIds.length;
  const allStudentsSelected = dueStudents.length > 0 && selectedStudentsCount === dueStudents.length;
  const someStudentsSelected = selectedStudentsCount > 0 && selectedStudentsCount < dueStudents.length;

  const toggleStudent = (studentId: number) => {
    setSelectedIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    );
  };

  const toggleSelectAll = () => {
    if (!dueStudents.length) return;
    setSelectedIds((prev) => (prev.length === dueStudents.length ? [] : dueStudents.map((s) => s.id)));
  };

  const clearSelection = () => setSelectedIds([]);

  const toggleChannel = (channel: ReminderChannel) => {
    setChannels((prev) => (prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]));
  };

  const sendReminders = async () => {
    if (!selectedStudentsCount) {
      await alert('Select at least one student to send reminder.', { title: 'No Student Selected', type: 'warning' });
      return;
    }
    if (!channels.length) {
      await alert('Choose at least one channel (SMS, WhatsApp, Email, In App).', { title: 'No Channel Selected', type: 'warning' });
      return;
    }
    if (!message.trim()) {
      await alert('Reminder message cannot be empty.', { title: 'Missing Message', type: 'warning' });
      return;
    }

    setSending(true);
    try {
      // Placeholder until communication API integration is added.
      await new Promise((resolve) => setTimeout(resolve, 500));
      await alert(
        `Reminder queued for ${selectedStudentsCount} students via ${channels
          .map((c) => c.toUpperCase())
          .join(', ')}.`,
        { title: 'Reminders Sent', type: 'success' },
      );
      setSelectedIds([]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <FeesPageHeader
        title="Send Reminders"
        description="Send pending fee reminders to students and parents using your preferred channels."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student, admission no, class, or section..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <FeesClassSectionFilters
              classes={classes}
              sections={sections}
              classId={classId}
              sectionId={sectionId}
              onClassChange={setClassId}
              onSectionChange={setSectionId}
              loadingSections={loadingSections}
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <p className="text-gray-600">
              {dueStudents.length} students with dues | Total due {formatFeeCurrency(totalDueAmount)}
            </p>
            <div className="flex items-center gap-3">
              {selectedStudentsCount > 1 && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-gray-600 hover:text-gray-900 hover:underline"
                >
                  Clear selection
                </button>
              )}
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-primary-700 hover:underline"
                disabled={!dueStudents.length}
              >
                {selectedStudentsCount === dueStudents.length && dueStudents.length > 0 ? 'Unselect All' : 'Select All'}
              </button>
            </div>
          </div>

          <div className="max-h-[460px] overflow-auto rounded-lg border border-gray-100">
            {loading ? (
              <p className="p-6 text-sm text-gray-500 text-center">Loading students...</p>
            ) : dueStudents.length === 0 ? (
              <p className="p-6 text-sm text-gray-500 text-center">
                {hasActiveFilters || search ? 'No students match these filters.' : 'No pending students found.'}
              </p>
            ) : (
              <>
                <div
                  className={`grid ${STUDENT_LIST_GRID} gap-2 px-3 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide items-center`}
                >
                  <span className="text-center">S.N.</span>
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={allStudentsSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someStudentsSelected;
                      }}
                      onChange={toggleSelectAll}
                      disabled={!dueStudents.length}
                      className="h-4 w-4 shrink-0"
                      aria-label="Select all students"
                    />
                  </div>
                  <span>Student</span>
                  <span className="text-right">Due</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {sortedDueStudents.map((student, index) => {
                    const selected = selectedIds.includes(student.id);
                    const guardianName = student.parent_name?.trim() || '—';
                    const guardianPhone = student.parent_phone?.trim();
                    return (
                      <label
                        key={student.id}
                        className={`grid ${STUDENT_LIST_GRID} gap-2 items-center px-3 py-3 cursor-pointer hover:bg-gray-50 ${selected ? 'bg-primary-50' : ''}`}
                      >
                        <span className="text-xs text-gray-500 font-medium tabular-nums text-center">
                          {index + 1}
                        </span>
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleStudent(student.id)}
                            className="h-4 w-4 shrink-0"
                          />
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/fees/ledger/${student.id}`}
                            className="text-sm font-medium text-gray-900 hover:text-primary-700 hover:underline"
                          >
                            {student.first_name} {student.last_name}
                          </Link>
                          <p className="text-xs text-gray-600 mt-0.5">
                            Guardian: {guardianName}
                            {guardianPhone ? (
                              <span className="text-gray-500"> · {guardianPhone}</span>
                            ) : (
                              <span className="text-amber-600"> · No mobile</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {student.admission_number} | {student.class_name || '—'}
                            {student.section_name ? `-${student.section_name}` : ''}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-red-700 whitespace-nowrap text-right">
                          {formatFeeCurrency(student.pendingAmount)}
                        </p>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-900">Reminder Setup</p>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  selectedStudentsCount > 0
                    ? 'bg-primary-100 text-primary-800'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {selectedStudentsCount} selected
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Choose channels and message, then send reminder to selected students.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600">Channels</p>
            <div className="grid grid-cols-2 gap-2">
              {CHANNEL_OPTIONS.map((channel) => {
                const active = channels.includes(channel.id);
                return (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => toggleChannel(channel.id)}
                    className={`text-xs border rounded-md px-2 py-2 ${
                      active
                        ? 'border-primary-200 bg-primary-50 text-primary-700'
                        : 'border-gray-200 bg-white text-gray-600'
                    }`}
                  >
                    {channel.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600">Message</p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={7}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm resize-none"
              placeholder="Type reminder message..."
            />
            <p className="text-[11px] text-gray-500">
              Tip: Keep the message short and include due date and payment mode details.
            </p>
          </div>

          <button
            type="button"
            onClick={sendReminders}
            disabled={sending}
            className="w-full inline-flex items-center justify-center gap-2 bg-primary-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-primary-700 disabled:opacity-60"
          >
            <FiSend size={14} />
            {sending ? 'Sending...' : `Send Reminder (${selectedStudentsCount})`}
          </button>
        </div>
      </div>
    </div>
  );
}
