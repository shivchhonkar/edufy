'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import HrNav from '@/features/hr/components/HrNav';
import { useDialog } from '@/shared/context/DialogContext';
import { FiPlus, FiCheck, FiX } from 'react-icons/fi';

export default function LeavesPage() {
  const { alert } = useDialog();
  const [leaves, setLeaves] = useState<Record<string, unknown>[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<{ id: number; name: string }[]>([]);
  const [staff, setStaff] = useState<{ id: number; first_name: string; last_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ staff_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const statusParam = filter !== 'all' ? `?status=${filter}` : '';
    const [lRes, tRes, sRes] = await Promise.all([
      fetch(`/api/leaves${statusParam}`),
      fetch('/api/leave-types'),
      fetch('/api/staff?limit=200&status=active'),
    ]);
    const [lData, tData, sData] = await Promise.all([lRes.json(), tRes.json(), sRes.json()]);
    if (lData.success) setLeaves(lData.data);
    if (tData.success) setLeaveTypes(tData.data);
    if (sData.success) setStaff(sData.data);
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const action = async (id: number, act: 'approve' | 'reject') => {
    const res = await fetch(`/api/leaves/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act }),
    });
    const data = await res.json();
    if (data.success) fetchData();
    else await alert(data.error, { title: 'Error', type: 'error' });
  };

  const submit = async () => {
    const res = await fetch('/api/leaves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: parseInt(form.staff_id, 10),
        leave_type_id: parseInt(form.leave_type_id, 10),
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason,
      }),
    });
    const data = await res.json();
    if (data.success) { setShowModal(false); fetchData(); }
    else await alert(data.error, { title: 'Error', type: 'error' });
  };

  const statusColor: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-600',
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <HrNav />
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <h1 className="text-xl">Leave Management</h1>
          <div className="flex gap-2">
            {['pending', 'approved', 'rejected', 'all'].map((s) => (
              <button key={s} type="button" onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm capitalize ${filter === s ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}>{s}</button>
            ))}
            <button type="button" onClick={() => setShowModal(true)} className="flex items-center gap-1 px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm"><FiPlus /> Apply Leave</button>
          </div>
        </div>
        <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-5 py-3">Employee</th>
                <th className="text-left px-5 py-3">Type</th>
                <th className="text-left px-5 py-3">Dates</th>
                <th className="text-left px-5 py-3">Days</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Loading...</td></tr>
              : leaves.length === 0 ? <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No leave requests</td></tr>
              : leaves.map((l) => (
                <tr key={String(l.id)} className="border-b">
                  <td className="px-5 py-3">{String(l.first_name)} {String(l.last_name)}</td>
                  <td className="px-5 py-3">{String(l.leave_type_name)}</td>
                  <td className="px-5 py-3">{String(l.start_date).split('T')[0]} – {String(l.end_date).split('T')[0]}</td>
                  <td className="px-5 py-3">{String(l.days_requested)}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusColor[String(l.status)] || ''}`}>{String(l.status)}</span>
                  </td>
                  <td className="px-5 py-3">
                    {l.status === 'pending' && (
                      <div className="flex gap-1 justify-end">
                        <button type="button" onClick={() => action(Number(l.id), 'approve')} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><FiCheck /></button>
                        <button type="button" onClick={() => action(Number(l.id), 'reject')} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><FiX /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-3">
              <h2 className="text-lg font-bold">Apply Leave</h2>
              <select value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Select staff</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
              </select>
              <select value={form.leave_type_id} onChange={(e) => setForm({ ...form, leave_type_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Leave type</option>
                {leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              </div>
              <textarea placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="button" onClick={submit} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">Submit</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
