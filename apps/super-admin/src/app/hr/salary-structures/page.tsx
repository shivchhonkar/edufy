'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import HrNav from '@/features/hr/components/HrNav';
import { useDialog } from '@/shared/context/DialogContext';
import { FiPlus } from 'react-icons/fi';

export default function SalaryStructuresPage() {
  const { alert } = useDialog();
  const [components, setComponents] = useState<Record<string, unknown>[]>([]);
  const [structures, setStructures] = useState<Record<string, unknown>[]>([]);
  const [designations, setDesignations] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '', designation_id: '', effective_from: new Date().toISOString().split('T')[0],
    lines: [] as { component_id: number; amount: string }[],
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [ssRes, desRes] = await Promise.all([
      fetch('/api/salary-structures'),
      fetch('/api/designations?active_only=true'),
    ]);
    const [ssData, desData] = await Promise.all([ssRes.json(), desRes.json()]);
    if (ssData.success) {
      setComponents(ssData.data.components);
      setStructures(ssData.data.structures);
      if (ssData.data.components.length && form.lines.length === 0) {
        setForm((f) => ({
          ...f,
          lines: ssData.data.components.map((c: { id: number }) => ({ component_id: c.id, amount: '' })),
        }));
      }
    }
    if (desData.success) setDesignations(desData.data);
    setLoading(false);
  }, [form.lines.length]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const save = async () => {
    const lines = form.lines
      .filter((l) => l.amount)
      .map((l) => ({ component_id: l.component_id, amount: parseFloat(l.amount) }));
    const res = await fetch('/api/salary-structures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        designation_id: form.designation_id ? parseInt(form.designation_id, 10) : null,
        effective_from: form.effective_from,
        lines,
      }),
    });
    const data = await res.json();
    if (data.success) { setShowModal(false); fetchData(); }
    else await alert(data.error, { title: 'Error', type: 'error' });
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <HrNav />
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl">Salary Structures</h1>
          <button type="button" onClick={() => setShowModal(true)} className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm"><FiPlus /> New Structure</button>
        </div>
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white border rounded-xl p-4">
            <h3 className="font-semibold mb-3">Salary Components</h3>
            <ul className="space-y-1 text-sm">
              {components.map((c) => (
                <li key={String(c.id)} className="flex justify-between">
                  <span>{String(c.name)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${c.component_type === 'earning' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {String(c.component_type)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <h3 className="font-semibold mb-3">Active Structures</h3>
            {loading ? <p className="text-gray-400 text-sm">Loading...</p>
            : structures.length === 0 ? <p className="text-gray-400 text-sm">No structures yet</p>
            : structures.map((s) => (
              <div key={String(s.id)} className="border-b py-2 text-sm">
                <p className="font-medium">{String(s.name)}</p>
                <p className="text-gray-500">{String(s.designation_name || s.staff_name || 'General')} · from {String(s.effective_from).split('T')[0]}</p>
                <p className="text-xs text-gray-400">{(s.lines as unknown[])?.length || 0} components</p>
              </div>
            ))}
          </div>
        </div>
        {showModal && (
          <AppModal open={showModal} onClose={() => setShowModal(false)}>
      <div className={APP_MODAL_PANEL + " p-6 relative"} >
              <h2 className="text-lg">Create Salary Structure</h2>
              <input placeholder="Structure name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mt-2 mb-2" />
              <select value={form.designation_id} onChange={(e) => setForm({ ...form, designation_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm  mt-2 mb-2">
                <option value="">All designations</option>
                {designations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <input type="date" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm  mt-2 mb-2" />
              <div className="space-y-2 max-h-60 overflow-y-auto  mt-2 mb-2 p-4 border rounded-lg">
                {form.lines.map((line, idx) => {
                  const comp = components.find((c) => c.id === line.component_id);
                  return (
                    <div key={line.component_id} className="flex items-center gap-2">
                      <span className="text-sm flex-1 truncate">{String(comp?.name)}</span>
                      <input type="number" placeholder="Amount" value={line.amount}
                        onChange={(e) => {
                          const lines = [...form.lines];
                          lines[idx] = { ...lines[idx], amount: e.target.value };
                          setForm({ ...form, lines });
                        }}
                        className="w-28 border rounded-lg px-2 py-1 text-sm" />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="button" onClick={save} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">Save</button>
              </div>
            </div>
          </AppModal>
        )}
      </div>
    </DashboardLayout>
  );
}
