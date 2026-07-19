'use client';

import { useState } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import { authFetch } from '@/lib/auth';

type DeleteInactiveSchoolButtonProps = {
  schoolId: number;
  schoolSlug: string;
  schoolName: string;
  isActive: boolean;
  onDeleted?: () => void;
  compact?: boolean;
};

export default function DeleteInactiveSchoolButton({
  schoolId,
  schoolSlug,
  schoolName,
  isActive,
  onDeleted,
  compact = false,
}: DeleteInactiveSchoolButtonProps) {
  const [confirmSlug, setConfirmSlug] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isActive) {
    return null;
  }

  const handleDelete = async () => {
    setError('');
    if (confirmSlug.trim().toLowerCase() !== schoolSlug.toLowerCase()) {
      setError(`Type "${schoolSlug}" to confirm deletion.`);
      return;
    }

    setLoading(true);
    try {
      const response = await authFetch(`/api/platform/schools/${schoolId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm_slug: confirmSlug.trim() }),
      });
      const payload = await response.json();
      if (payload.success) {
        setOpen(false);
        setConfirmSlug('');
        onDeleted?.();
        return;
      }
      setError(payload.error || 'Failed to delete school.');
    } catch {
      setError('Failed to delete school.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? 'inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100'
            : 'inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100'
        }
      >
        <FiTrash2 size={14} />
        Delete school
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-red-800">Delete inactive school permanently?</p>
        <p className="mt-1 text-sm text-red-700/90">
          This removes <span className="font-medium">{schoolName}</span> from the platform and drops
          its database. This cannot be undone.
        </p>
      </div>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-slate-700">
          Type <span className="font-mono text-red-700">{schoolSlug}</span> to confirm
        </span>
        <input
          type="text"
          value={confirmSlug}
          onChange={(e) => setConfirmSlug(e.target.value)}
          className="app-admin-field"
          placeholder={schoolSlug}
          autoComplete="off"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => void handleDelete()}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? 'Deleting…' : 'Delete permanently'}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setOpen(false);
            setConfirmSlug('');
            setError('');
          }}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
