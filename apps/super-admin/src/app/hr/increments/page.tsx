'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import HrNav from '@/features/hr/components/HrNav';
import { useDialog } from '@/shared/context/DialogContext';
import { FiPlus } from 'react-icons/fi';

export default function IncrementsPage() {
  const { alert } = useDialog();
  const [increments, setIncrements] = useState<Record<string, unknown>[]>([]);
  const [staff, setStaff] = useState<Record<string, unknown>[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ staff_id: '', new_salary: '', effective_date: '', reason: '', increment_type: 'annual' });

  const fetchData = useCallback(async () => {
    const [iRes, sRes] = await Promise.all([
      fetch('/api/increments'),
      fetch('/api/staff?limit=200&status=active'),
    ]);
    const [iData, sData] = await Promise.all([iRes.json(), sRes.json()]);
    if (iData.success) setIncrements(iData.data);
    if (sData.success) setStaff(sData.data);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const submit = async () => {
    const res = await fetch('/api/increments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: parseInt(form.staff_id, 10),
        new_salary: parseFloat(form.new_salary),
        effective_date: form.effective_date,
        reason: form.reason,
        increment_type: form.increment_type,
      }),
    });
    const data = await res.json();
    if (data.success) { setShowModal(false); fetchData(); await alert('Increment recorded', { title: 'Success', type: 'success' }); }
    else await alert(data.error, { title: 'Error', type: 'error' });
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <HrNav />
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl">Salary Increments</h1>
          <button type="button" onClick={() => setShowModal(true)} className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm"><FiPlus /> Record Increment</button>
        </div>
        <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-5 py-3">Employee</th>
                <th className="text-left px-5 py-3">Previous</th>
                <th className="text-left px-5 py-3">New</th>
                <th className="text-left px-5 py-3">Change</th>
                <th className="text-left px-5 py-3">Effective</th>
                <th className="text-left px-5 py-3">Type</th>
              </tr>
            </thead>
            <tbody>
              {increments.length === 0 ? <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No increments recorded</td></tr>
              : increments.map((i) => {
                const prev = parseFloat(String(i.previous_salary || 0));
                const next = parseFloat(String(i.new_salary || 0));
                const pct = prev > 0 ? (((next - prev) / prev) * 100).toFixed(1) : '0';
                return (
                  <tr key={String(i.id)} className="border-b">
                    <td className="px-5 py-3">{String(i.first_name)} {String(i.last_name)}</td>
                    <td className="px-5 py-3">₹{prev.toLocaleString()}</td>
                    <td className="px-5 py-3">₹{next.toLocaleString()}</td>
                    <td className="px-5 py-3 text-green-600">+{pct}%</td>
                    <td className="px-5 py-3">{String(i.effective_date).split('T')[0]}</td>
                    <td className="px-5 py-3 capitalize">{String(i.increment_type)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {showModal && (
          <AppModal open={showModal} onClose={() => setShowModal(false)}>
      <div className="flex flex-col h-full w-full min-h-0 min-w-0 bg-white shadow-2xl overflow-hidden">
              <h2 className="font-bold">Record Increment</h2>
              <select value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Select staff</option>
                {staff.map((s) => <option key={String(s.id)} value={String(s.id)}>{String(s.first_name)} {String(s.last_name)} — ₹{String(s.salary || 0)}</option>)}
              </select>
              <input type="number" placeholder="New salary *" value={form.new_salary} onChange={(e) => setForm({ ...form, new_salary: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input type="date" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <select value={form.increment_type} onChange={(e) => setForm({ ...form, increment_type: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="annual">Annual</option>
                <option value="promotion">Promotion</option>
                <option value="special">Special</option>
              </select>
              <textarea placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="button" onClick={submit} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">Save</button>
              </div>
            </div>
          </AppModal>
        )}
      </div>
    </DashboardLayout>
  );
}
