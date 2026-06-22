'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiDownload, FiFile, FiTrash2, FiUpload } from 'react-icons/fi';
import type { StudentDocument, StudentDocumentType } from '@/shared/types';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_OPTIONS,
  formatStudentDate,
} from '@/features/students/utils/student-profile';
import { useDialog } from '@/shared/context/DialogContext';

interface DocumentsTabProps {
  studentId: number;
}

interface StudentDocumentRow extends StudentDocument {
  uploaded_by_name?: string;
}

export default function DocumentsTab({ studentId }: DocumentsTabProps) {
  const { confirm } = useDialog();
  const [documents, setDocuments] = useState<StudentDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [documentType, setDocumentType] = useState<StudentDocumentType>('aadhaar_card');
  const [remarks, setRemarks] = useState('');

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/students/${studentId}/documents`);
      const data = await res.json();
      if (data.success) setDocuments(data.data ?? []);
      else setError(data.error || 'Failed to load documents');
    } catch {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/upload?folder=student-documents', {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.success) {
        setError(uploadData.error || 'Upload failed');
        return;
      }

      const saveRes = await fetch(`/api/students/${studentId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_type: documentType,
          file_name: uploadData.data.filename || file.name,
          file_path: uploadData.data.url,
          remarks: remarks || null,
        }),
      });
      const saveData = await saveRes.json();
      if (saveData.success) {
        setRemarks('');
        fetchDocuments();
      } else {
        setError(saveData.error || 'Failed to save document');
      }
    } catch {
      setError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: number) => {
    const confirmed = await confirm('Delete this document record?', {
      title: 'Delete Document',
      type: 'danger',
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/students/${studentId}/documents/${docId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) fetchDocuments();
      else setError(data.error || 'Failed to delete');
    } catch {
      setError('Failed to delete document');
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading documents...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <FiUpload className="text-primary-600" />
          Upload Document
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as StudentDocumentType)}
            >
              {DOCUMENT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (optional)</label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Notes about this file"
            />
          </div>
          <div>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 cursor-pointer">
              <FiUpload />
              {uploading ? 'Uploading...' : 'Choose File'}
              <input
                type="file"
                className="hidden"
                accept=".pdf,image/*"
                disabled={uploading}
                onChange={handleUpload}
              />
            </label>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {documents.length === 0 ? (
        <div className="text-center py-12 bg-white border border-dashed border-gray-300 rounded-lg">
          <FiFile className="mx-auto w-10 h-10 text-gray-300 mb-2" />
          <p className="text-gray-500 text-sm">No documents uploaded yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">File</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Uploaded</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {DOCUMENT_TYPE_LABELS[doc.document_type]}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{doc.file_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatStudentDate(doc.uploaded_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <a
                        href={doc.file_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded"
                        title="Download / View"
                      >
                        <FiDownload size={16} />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
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
  );
}
