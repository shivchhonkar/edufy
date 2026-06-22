'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import HrNav from '@/features/hr/components/HrNav';
import { useDialog } from '@/shared/context/DialogContext';
import { FiPlus } from 'react-icons/fi';

export default function StaffPromotionsPage() {
  const { alert } = useDialog();
  const [promotions, setPromotions] = useState<Record<string, unknown>[]>([]);
  const [staff, setStaff] = useState<Record<string, unknown>[]>([]);
  const [designations, setDesignations] = useState<{ id: number; name: string }[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ staff_id: '', to_designation_id: '', to_salary: '', effective_date: '', reason: '' });

  const fetchData = useCallback(async () => {
    const [pRes, sRes, dRes] = await Promise.all([
      fetch('/api/promotions/staff'),
      fetch('/api/staff?limit=200&status=active'),
      fetch('/api/designations?active_only=true'),
    ]);
    const [pData, sData, dData] = await Promise.all([pRes.json(), sRes.json(), dRes.json()]);
    if (pData.success) setPromotions(pData.data);
    if (sData.success) setStaff(sData.data);
    if (dData.success) setDesignations(dData.data);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const submit = async () => {
    const res = await fetch('/api/promotions/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: parseInt(form.staff_id, 10),
        to_designation_id: parseInt(form.to_designation_id, 10),
        to_salary: form.to_salary ? parseFloat(form.to_salary) : undefined,
        effective_date: form.effective_date,
        reason: form.reason,
      }),
    });
    const data = await res.json();
    if (data.success) { setShowModal(false); fetchData(); await alert('Promotion recorded', { title: 'Success', type: 'success' }); }
    else await alert(data.error, { title: 'Error', type: 'error' });
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <HrNav />
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl">Staff Promotions</h1>
          <button type="button" onClick={() => setShowModal(true)} className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm"><FiPlus /> Record Promotion</button>
        </div>
        <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b sticky top-0 z-10 shrink-0">
              <tr>
                <th className="text-left px-5 py-3">Employee</th>
                <th className="text-left px-5 py-3">From</th>
                <th className="text-left px-5 py-3">To</th>
                <th className="text-left px-5 py-3">Salary</th>
                <th className="text-left px-5 py-3">Effective</th>
              </tr>
            </thead>
            <tbody>
              {promotions.length === 0 ? <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">No promotions recorded</td></tr>
              : promotions.map((p) => (
                <tr key={String(p.id)} className="border-b">
                  <td className="px-5 py-3">{String(p.first_name)} {String(p.last_name)}</td>
                  <td className="px-5 py-3">{String(p.from_designation || '—')}</td>
                  <td className="px-5 py-3">{String(p.to_designation)}</td>
                  <td className="px-5 py-3">₹{parseFloat(String(p.from_salary || 0)).toLocaleString()} → ₹{parseFloat(String(p.to_salary || 0)).toLocaleString()}</td>
                  <td className="px-5 py-3">{String(p.effective_date).split('T')[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {showModal && (
          <AppModal open={showModal} onClose={() => setShowModal(false)}>
      <div className={APP_MODAL_PANEL}>
              <h2 className="font-bold">Record Promotion</h2>
              <select value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Select staff</option>
                {staff.map((s) => <option key={String(s.id)} value={String(s.id)}>{String(s.first_name)} {String(s.last_name)}</option>)}
              </select>
              <select value={form.to_designation_id} onChange={(e) => setForm({ ...form, to_designation_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">New designation</option>
                {designations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <input type="number" placeholder="New salary" value={form.to_salary} onChange={(e) => setForm({ ...form, to_salary: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input type="date" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
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
