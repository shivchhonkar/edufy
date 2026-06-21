'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import HrNav from '@/features/hr/components/HrNav';
import { useDialog } from '@/shared/context/DialogContext';
import { FiPlus, FiCheck, FiX } from 'react-icons/fi';

export default function ResignationsPage() {
  const { alert } = useDialog();
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [staff, setStaff] = useState<Record<string, unknown>[]>([]);
  const [filter, setFilter] = useState('pending');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ staff_id: '', resignation_date: '', last_working_day: '', notice_period_days: '30', reason: '' });

  const fetchData = useCallback(async () => {
    const statusParam = filter !== 'all' ? `?status=${filter}` : '';
    const [rRes, sRes] = await Promise.all([
      fetch(`/api/resignations${statusParam}`),
      fetch('/api/staff?limit=200&status=active'),
    ]);
    const [rData, sData] = await Promise.all([rRes.json(), sRes.json()]);
    if (rData.success) setItems(rData.data);
    if (sData.success) setStaff(sData.data);
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const action = async (id: number, act: 'approve' | 'reject' | 'clearance') => {
    const body = act === 'clearance'
      ? { action: 'clearance', clearance_status: 'completed' }
      : { action: act };
    const res = await fetch(`/api/resignations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.success) fetchData();
    else await alert(data.error, { title: 'Error', type: 'error' });
  };

  const submit = async () => {
    const res = await fetch('/api/resignations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: parseInt(form.staff_id, 10),
        resignation_date: form.resignation_date,
        last_working_day: form.last_working_day,
        notice_period_days: parseInt(form.notice_period_days, 10),
        reason: form.reason,
      }),
    });
    const data = await res.json();
    if (data.success) { setShowModal(false); fetchData(); }
    else await alert(data.error, { title: 'Error', type: 'error' });
  };

  const statusColor: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-blue-100 text-blue-700',
    cleared: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <HrNav />
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <h1 className="text-xl">Resignation Management</h1>
          <div className="flex gap-2">
            {['pending', 'approved', 'cleared', 'all'].map((s) => (
              <button key={s} type="button" onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm capitalize ${filter === s ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}>{s}</button>
            ))}
            <button type="button" onClick={() => setShowModal(true)} className="flex items-center gap-1 px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm"><FiPlus /> New</button>
          </div>
        </div>
        <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-5 py-3">Employee</th>
                <th className="text-left px-5 py-3">Resignation</th>
                <th className="text-left px-5 py-3">Last Day</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Clearance</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No resignations</td></tr>
              : items.map((r) => (
                <tr key={String(r.id)} className="border-b">
                  <td className="px-5 py-3">{String(r.first_name)} {String(r.last_name)}</td>
                  <td className="px-5 py-3">{String(r.resignation_date).split('T')[0]}</td>
                  <td className="px-5 py-3">{String(r.last_working_day).split('T')[0]}</td>
                  <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${statusColor[String(r.status)]}`}>{String(r.status)}</span></td>
                  <td className="px-5 py-3 capitalize">{String(r.clearance_status)}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1 justify-end">
                      {r.status === 'pending' && (
                        <>
                          <button type="button" onClick={() => action(Number(r.id), 'approve')} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><FiCheck /></button>
                          <button type="button" onClick={() => action(Number(r.id), 'reject')} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><FiX /></button>
                        </>
                      )}
                      {r.status === 'approved' && r.clearance_status !== 'completed' && (
                        <button type="button" onClick={() => action(Number(r.id), 'clearance')} className="px-2 py-1 text-xs bg-green-600 text-white rounded">Clear Exit</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {showModal && (
          <AppModal open={showModal} onClose={() => setShowModal(false)}>
      <div className="flex flex-col h-full w-full min-h-0 min-w-0 bg-white shadow-2xl overflow-hidden">
              <h2 className="font-bold">Record Resignation</h2>
              <select value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Select staff</option>
                {staff.map((s) => <option key={String(s.id)} value={String(s.id)}>{String(s.first_name)} {String(s.last_name)}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={form.resignation_date} onChange={(e) => setForm({ ...form, resignation_date: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                <input type="date" value={form.last_working_day} onChange={(e) => setForm({ ...form, last_working_day: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              </div>
              <input type="number" placeholder="Notice period (days)" value={form.notice_period_days} onChange={(e) => setForm({ ...form, notice_period_days: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <textarea placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="button" onClick={submit} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">Submit</button>
              </div>
            </div>
          </AppModal>
        )}
      </div>
    </DashboardLayout>
  );
}
