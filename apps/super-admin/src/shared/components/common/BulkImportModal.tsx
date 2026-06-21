'use client';

import AppModal from '@/shared/components/common/AppModal';
import { useState } from 'react';
import { FiUpload, FiX, FiDownload } from 'react-icons/fi';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title: string;
  templateType: 'students' | 'staff';
  importUrl: string;
}

export default function BulkImportModal({
  isOpen,
  onClose,
  onSuccess,
  title,
  templateType,
  importUrl,
}: BulkImportModalProps) {
  const [csv, setCsv] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ created: number; failed: number; errors: string[] } | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setCsv((e.target?.result as string) || '');
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setSubmitting(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(importUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        onSuccess();
      } else {
        setError(data.error || 'Import failed');
      }
    } catch {
      setError('Import failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppModal open={isOpen} onClose={onClose}>
      <div className="flex flex-col h-full w-full min-h-0 min-w-0 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <FiX size={20} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <a
            href={`/api/import/template?type=${templateType}`}
            className="inline-flex items-center gap-2 text-sm text-primary-600 hover:underline"
          >
            <FiDownload size={14} /> Download CSV template
          </a>
          <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-gray-50">
            <FiUpload className="text-gray-400 mb-2" size={24} />
            <span className="text-sm text-gray-600">Upload CSV file</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={6}
            placeholder="Or paste CSV content here..."
            className="w-full border rounded-lg p-3 text-sm font-mono"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {result && (
            <div className="text-sm bg-green-50 text-green-800 p-3 rounded">
              Imported {result.created} record(s). {result.failed > 0 && `${result.failed} failed.`}
              {result.errors?.slice(0, 3).map((e) => (
                <div key={e} className="text-red-600 text-xs mt-1">{e}</div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
          <button
            type="button"
            onClick={handleImport}
            disabled={submitting || !csv.trim()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50"
          >
            {submitting ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </AppModal>
  );
}
