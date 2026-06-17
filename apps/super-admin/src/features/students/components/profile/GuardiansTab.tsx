'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiEdit2, FiPlus, FiTrash2, FiUser, FiX } from 'react-icons/fi';
import type { GuardianRelationType, StudentGuardian } from '@/shared/types';
import { GUARDIAN_RELATION_LABELS } from '@/features/students/utils/student-profile';
import { useDialog } from '@/shared/context/DialogContext';

interface GuardiansTabProps {
  studentId: number;
}

const emptyForm = {
  relation_type: 'father' as GuardianRelationType,
  name: '',
  mobile: '',
  alternate_mobile: '',
  email: '',
  occupation: '',
  annual_income: '',
  company_name: '',
  aadhaar_no: '',
  is_primary_contact: false,
};

export default function GuardiansTab({ studentId }: GuardiansTabProps) {
  const { confirm } = useDialog();
  const [guardians, setGuardians] = useState<StudentGuardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchGuardians = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/students/${studentId}/guardians`);
      const data = await res.json();
      if (data.success) setGuardians(data.data);
      else setError(data.error || 'Failed to load guardians');
    } catch {
      setError('Failed to load guardians');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchGuardians();
  }, [fetchGuardians]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError('');
  };

  const openEdit = (g: StudentGuardian) => {
    setEditingId(g.id);
    setForm({
      relation_type: g.relation_type,
      name: g.name,
      mobile: g.mobile || '',
      alternate_mobile: g.alternate_mobile || '',
      email: g.email || '',
      occupation: g.occupation || '',
      annual_income: g.annual_income != null ? String(g.annual_income) : '',
      company_name: g.company_name || '',
      aadhaar_no: g.aadhaar_no || '',
      is_primary_contact: g.is_primary_contact,
    });
    setShowForm(true);
    setError('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        annual_income: form.annual_income ? parseFloat(form.annual_income) : null,
      };
      const url = editingId
        ? `/api/students/${studentId}/guardians/${editingId}`
        : `/api/students/${studentId}/guardians`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);
        fetchGuardians();
      } else {
        setError(data.error || 'Failed to save guardian');
      }
    } catch {
      setError('Failed to save guardian');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm('Delete this guardian record?', {
      title: 'Delete Guardian',
      type: 'danger',
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/students/${studentId}/guardians/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) fetchGuardians();
      else setError(data.error || 'Failed to delete');
    } catch {
      setError('Failed to delete guardian');
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading guardians...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">{guardians.length} guardian record(s)</p>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700"
        >
          <FiPlus /> Add Guardian
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-gray-900">
              {editingId ? 'Edit Guardian' : 'Add Guardian'}
            </h4>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700">
              <FiX />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Relation</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                value={form.relation_type}
                onChange={(e) =>
                  setForm({ ...form, relation_type: e.target.value as GuardianRelationType })
                }
              >
                {Object.entries(GUARDIAN_RELATION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alt. Mobile</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                value={form.alternate_mobile}
                onChange={(e) => setForm({ ...form, alternate_mobile: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                value={form.occupation}
                onChange={(e) => setForm({ ...form, occupation: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar No.</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                value={form.aadhaar_no}
                onChange={(e) => setForm({ ...form, aadhaar_no: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.is_primary_contact}
                  onChange={(e) => setForm({ ...form, is_primary_contact: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600"
                />
                Primary contact
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingId ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      )}

      {guardians.length === 0 ? (
        <div className="text-center py-12 bg-white border border-dashed border-gray-300 rounded-lg">
          <FiUser className="mx-auto w-10 h-10 text-gray-300 mb-2" />
          <p className="text-gray-500 text-sm">No guardians added yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    S.N.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Relationship
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Guardian Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Contact Number
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {guardians.map((g, index) => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 tabular-nums">{index + 1}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold uppercase text-primary-600">
                        {GUARDIAN_RELATION_LABELS[g.relation_type]}
                      </span>
                      {g.is_primary_contact && (
                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                          Primary
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{g.name}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {g.mobile || '—'}
                      {g.alternate_mobile ? (
                        <span className="block text-xs text-gray-500">Alt: {g.alternate_mobile}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(g)}
                          className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-50 rounded"
                          aria-label={`Edit ${g.name}`}
                        >
                          <FiEdit2 size={16} />
                        </button>
                        {g.relation_type === 'guardian' && (
                          <button
                            type="button"
                            onClick={() => handleDelete(g.id)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                            aria-label={`Delete ${g.name}`}
                          >
                            <FiTrash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
