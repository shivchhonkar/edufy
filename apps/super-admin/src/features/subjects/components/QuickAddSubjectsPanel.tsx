'use client';

import { useEffect, useMemo, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import {
  buildExistingSubjectCodeSet,
  buildExistingSubjectNameSet,
  DEFAULT_BULK_SUBJECTS_PRESET,
  filterPendingSubjectLines,
  generateUniqueSubjectCode,
  normalizeSubjectCode,
} from '@/features/subjects/utils/subject-utils';

interface QuickAddSubjectsPanelProps {
  existingSubjectNames?: string[];
  existingSubjectCodes?: string[];
  onSubjectsAdded: () => void | Promise<void>;
  onNotify: (message: string, type: 'success' | 'error' | 'warning') => void | Promise<void>;
}

export default function QuickAddSubjectsPanel({
  existingSubjectNames = [],
  existingSubjectCodes = [],
  onSubjectsAdded,
  onNotify,
}: QuickAddSubjectsPanelProps) {
  const [quickName, setQuickName] = useState('');
  const [quickCode, setQuickCode] = useState('');
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  const [bulkText, setBulkText] = useState(DEFAULT_BULK_SUBJECTS_PRESET);
  const [saving, setSaving] = useState(false);

  const existingNames = useMemo(
    () => buildExistingSubjectNameSet(existingSubjectNames),
    [existingSubjectNames],
  );

  const existingCodes = useMemo(
    () => buildExistingSubjectCodeSet(existingSubjectCodes),
    [existingSubjectCodes],
  );

  const pendingBulkLines = useMemo(
    () => filterPendingSubjectLines(bulkText, existingNames),
    [bulkText, existingNames],
  );

  const hiddenBulkCount = useMemo(() => {
    const allLines = bulkText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    return allLines.length - pendingBulkLines.length;
  }, [bulkText, pendingBulkLines]);

  useEffect(() => {
    setBulkText((prev) => filterPendingSubjectLines(prev, existingNames).join('\n'));
  }, [existingNames]);

  const postSubject = async (name: string, code: string) => {
    const trimmedName = name.trim();
    const trimmedCode = normalizeSubjectCode(code);
    if (!trimmedName) return { success: false, error: 'Empty name' };
    if (!trimmedCode) return { success: false, error: 'Subject code is required' };

    const response = await fetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: trimmedName,
        code: trimmedCode,
        description: '',
      }),
    });
    return response.json();
  };

  const handleQuickNameChange = (name: string) => {
    setQuickName(name);
    if (!codeManuallyEdited) {
      setQuickCode(generateUniqueSubjectCode(name, existingCodes));
    }
  };

  const handleQuickCodeChange = (code: string) => {
    setCodeManuallyEdited(true);
    setQuickCode(normalizeSubjectCode(code));
  };

  const addQuickSubject = async () => {
    if (!quickName.trim()) return;
    if (!quickCode.trim()) {
      await onNotify('Subject code is required', 'warning');
      return;
    }
    if (existingNames.has(quickName.trim().toLowerCase())) {
      await onNotify('This subject already exists.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const data = await postSubject(quickName, quickCode);
      if (data.success) {
        setQuickName('');
        setQuickCode('');
        setCodeManuallyEdited(false);
        await onNotify(`Added "${data.data.name}" (${data.data.code})`, 'success');
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
    const names = pendingBulkLines;

    if (names.length === 0) {
      await onNotify(
        hiddenBulkCount > 0
          ? 'All listed subjects are already added'
          : 'Enter at least one subject name',
        'warning',
      );
      return;
    }

    setSaving(true);
    try {
      let added = 0;
      let skipped = 0;
      const usedCodes = new Set(existingCodes);

      for (const name of names) {
        const code = generateUniqueSubjectCode(name, usedCodes);
        const data = await postSubject(name, code);
        if (data.success) {
          added += 1;
          usedCodes.add(normalizeSubjectCode(code));
        } else {
          skipped += 1;
        }
      }

      if (added > 0) {
        setBulkText((prev) => filterPendingSubjectLines(prev, existingNames).join('\n'));
        await onSubjectsAdded();
      }

      if (skipped > 0) {
        await onNotify(
          `Added ${added} subject(s). ${skipped} skipped (duplicate name/code or invalid).`,
          added > 0 ? 'success' : 'warning',
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
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm font-medium text-gray-900">Quick add subjects</p>
        <p className="mt-0.5 text-xs text-gray-500">
          Code is suggested from the subject name. A name that already exists is skipped.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={quickName}
          onChange={(e) => handleQuickNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && quickName.trim() && quickCode.trim() && !saving) {
              e.preventDefault();
              addQuickSubject();
            }
          }}
          className="w-full flex-[2] rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          placeholder="Subject name e.g. Science Booster"
          disabled={saving}
        />
        <input
          type="text"
          value={quickCode}
          onChange={(e) => handleQuickCodeChange(e.target.value)}
          maxLength={6}
          className="w-full rounded-md border border-gray-200 px-3 py-1.5 font-mono text-xs uppercase text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 sm:w-32"
          placeholder="Code"
          disabled={saving}
        />
        <button
          type="button"
          onClick={addQuickSubject}
          disabled={saving || !quickName.trim() || !quickCode.trim()}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <FiPlus size={15} />
          Add
        </button>
      </div>
      <p className="text-[11px] text-gray-500">
        Max 6 characters. If the suggested code already exists, a number suffix is added automatically.
        {codeManuallyEdited ? ' Using your custom code.' : ''}
      </p>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <label className="block text-xs font-medium text-gray-600">
            Or add multiple (one per line)
          </label>
          {hiddenBulkCount > 0 && (
            <span className="text-[11px] text-gray-500">
              {hiddenBulkCount} already added — hidden
            </span>
          )}
        </div>
        <textarea
          value={pendingBulkLines.join('\n')}
          onChange={(e) => setBulkText(e.target.value)}
          rows={5}
          disabled={saving}
          placeholder={
            pendingBulkLines.length === 0
              ? 'All preset subjects are already added. Type new subject names here.'
              : undefined
          }
          className="w-full resize-y rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
        {pendingBulkLines.length > 0 && (
          <p className="text-[11px] text-gray-500 mt-1">
            {pendingBulkLines.length} subject(s) ready to add — unique codes generated automatically
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={addBulkSubjects}
        disabled={saving || pendingBulkLines.length === 0}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        <FiPlus size={15} />
        {saving ? 'Adding...' : `Add ${pendingBulkLines.length || 'all'} subject(s)`}
      </button>
    </div>
  );
}
