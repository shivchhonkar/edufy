'use client';

import { useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import {
  DEFAULT_BULK_SUBJECTS_PRESET,
  subjectCodeFromName,
} from '@/features/subjects/utils/subject-utils';

interface QuickAddSubjectsPanelProps {
  onSubjectsAdded: () => void | Promise<void>;
  onNotify: (message: string, type: 'success' | 'error' | 'warning') => void | Promise<void>;
}

export default function QuickAddSubjectsPanel({
  onSubjectsAdded,
  onNotify,
}: QuickAddSubjectsPanelProps) {
  const [quickName, setQuickName] = useState('');
  const [bulkText, setBulkText] = useState(DEFAULT_BULK_SUBJECTS_PRESET);
  const [saving, setSaving] = useState(false);

  const postSubject = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return { success: false, error: 'Empty name' };

    const response = await fetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: trimmed,
        code: subjectCodeFromName(trimmed),
        description: '',
      }),
    });
    return response.json();
  };

  const addQuickSubject = async () => {
    if (!quickName.trim()) return;

    setSaving(true);
    try {
      const data = await postSubject(quickName);
      if (data.success) {
        setQuickName('');
        await onNotify(`Added "${data.data.name}"`, 'success');
        await onSubjectsAdded();
      } else {
        await onNotify(data.error || 'Failed to add subject', 'error');
      }
    } catch {
      await onNotify('Failed to add subject', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addBulkSubjects = async () => {
    const names = bulkText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (names.length === 0) {
      await onNotify('Enter at least one subject name', 'warning');
      return;
    }

    setSaving(true);
    try {
      let added = 0;
      let skipped = 0;

      for (const name of names) {
        const data = await postSubject(name);
        if (data.success) added += 1;
        else skipped += 1;
      }

      if (added > 0) await onSubjectsAdded();

      if (skipped > 0) {
        await onNotify(
          `Added ${added} subject(s). ${skipped} skipped (may already exist).`,
          added > 0 ? 'success' : 'warning'
        );
      } else {
        await onNotify(`Added ${added} subject(s)`, 'success');
      }
    } catch {
      await onNotify('Failed to add subjects', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-gray-900">Quick add subjects</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Add one subject at a time or paste multiple names — codes are generated automatically.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={quickName}
          onChange={(e) => setQuickName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && quickName.trim() && !saving) {
              e.preventDefault();
              addQuickSubject();
            }
          }}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-primary-500"
          placeholder="Add single subject e.g. Mathematics"
          disabled={saving}
        />
        <button
          type="button"
          onClick={addQuickSubject}
          disabled={saving || !quickName.trim()}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-white disabled:opacity-50"
        >
          <FiPlus size={15} />
          Add
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Or add multiple (one per line)
        </label>
        <textarea
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          rows={5}
          disabled={saving}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-primary-500 resize-y"
        />
      </div>

      <button
        type="button"
        onClick={addBulkSubjects}
        disabled={saving}
        className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-white disabled:opacity-50"
      >
        <FiPlus size={15} />
        {saving ? 'Adding...' : 'Add all subjects'}
      </button>
    </div>
  );
}
