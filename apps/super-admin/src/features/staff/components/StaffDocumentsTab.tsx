'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiUpload, FiTrash2, FiFile } from 'react-icons/fi';
import { useDialog } from '@/shared/context/DialogContext';

interface StaffDocumentsTabProps {
  staffId: number;
}

const DOC_TYPES = [
  { value: 'id_proof', label: 'ID Proof' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'contract', label: 'Contract' },
  { value: 'resume', label: 'Resume' },
  { value: 'other', label: 'Other' },
];

export default function StaffDocumentsTab({ staffId }: StaffDocumentsTabProps) {
  const { alert, confirm } = useDialog();
  const [documents, setDocuments] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('id_proof');

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/staff/${staffId}/documents`);
    const data = await res.json();
    if (data.success) setDocuments(data.data);
    setLoading(false);
  }, [staffId]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/upload?folder=staff-documents', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadData.success) {
        await alert(uploadData.error || 'Upload failed', { title: 'Error', type: 'error' });
        return;
      }
      const saveRes = await fetch(`/api/staff/${staffId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_type: docType,
          file_name: file.name,
          file_path: uploadData.data.url,
        }),
      });
      const saveData = await saveRes.json();
      if (saveData.success) fetchDocuments();
      else await alert(saveData.error, { title: 'Error', type: 'error' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const remove = async (docId: number) => {
    const ok = await confirm('Delete this document?', { title: 'Confirm', type: 'warning' });
    if (!ok) return;
    const res = await fetch(`/api/staff/${staffId}/documents/${docId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) fetchDocuments();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={docType} onChange={(e) => setDocType(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <label className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm cursor-pointer">
          <FiUpload /> {uploading ? 'Uploading...' : 'Upload Document'}
          <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>
      {loading ? <p className="text-gray-400 text-sm">Loading documents...</p> : documents.length === 0 ? (
        <p className="text-gray-400 text-sm">No documents uploaded</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={String(doc.id)} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <FiFile className="text-gray-400" />
                <div>
                  <p className="text-sm font-medium">{String(doc.file_name)}</p>
                  <p className="text-xs text-gray-500 capitalize">{String(doc.document_type).replace('_', ' ')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={String(doc.file_path)} target="_blank" rel="noreferrer" className="text-xs text-primary-600 hover:underline">View</a>
                <button type="button" onClick={() => remove(Number(doc.id))} className="p-1 text-red-500 hover:bg-red-50 rounded"><FiTrash2 /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
