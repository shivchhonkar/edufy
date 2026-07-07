'use client';

import { useEffect, useState } from 'react';

export default function OrgUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'org_admin',
  });
  const [message, setMessage] = useState('');

  const load = () =>
    fetch('/api/org/users')
      .then((r) => r.json())
      .then((d) => d.success && setUsers(d.data));

  useEffect(() => {
    load();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/org/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.success) {
      setMessage('User invited successfully.');
      setForm({ full_name: '', email: '', password: '', role: 'org_admin' });
      load();
    } else {
      setMessage(data.error || 'Failed to invite user');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl text-gray-900">Organization Users</h1>
        <p className="text-sm text-gray-500">Invite HQ staff and assign school access</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold mb-3">Invite user</h2>
        <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            placeholder="Full name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="rounded-lg border px-3 py-2 text-sm"
            required
          />
          <input
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-lg border px-3 py-2 text-sm"
            required
          />
          <input
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="rounded-lg border px-3 py-2 text-sm"
            required
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="org_admin">Org Admin</option>
            <option value="org_viewer">Org Viewer</option>
            <option value="org_owner">Org Owner</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700"
          >
            Invite
          </button>
        </form>
        {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-3 py-2">{u.full_name}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
