'use client';

import { useEffect, useState } from 'react';
import { notifySchoolsListUpdated } from '@/lib/client-auth';

export default function OrgSchoolsPage() {
  const [schools, setSchools] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    city: '',
    admin_email: '',
    admin_password: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    const res = await fetch('/api/org/schools');
    const data = await res.json();
    if (data.success) setSchools(data.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    const res = await fetch('/api/org/schools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) {
      setMessage('School created successfully.');
      setForm({ name: '', slug: '', city: '', admin_email: '', admin_password: '' });
      await load();
      notifySchoolsListUpdated();
    } else {
      setMessage(data.error || 'Failed to create school');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl text-gray-900">Schools</h1>
        <p className="text-sm text-gray-500">Manage campuses under your organization</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Add school</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            placeholder="School name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            required
          />
          <input
            placeholder="Slug (e.g. dps-noida)"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            required
          />
          <input
            placeholder="City"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            placeholder="Admin email"
            type="email"
            value={form.admin_email}
            onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            required
          />
          <input
            placeholder="Admin password"
            type="password"
            value={form.admin_password}
            onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            required
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Add School'}
          </button>
        </form>
        {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Slug</th>
              <th className="px-3 py-2 text-left">City</th>
              <th className="px-3 py-2 text-left">Primary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : schools.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                  No schools
                </td>
              </tr>
            ) : (
              schools.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-2 font-medium">{s.name}</td>
                  <td className="px-3 py-2">{s.slug}</td>
                  <td className="px-3 py-2">{s.city || '—'}</td>
                  <td className="px-3 py-2">{s.is_primary ? 'Yes' : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
