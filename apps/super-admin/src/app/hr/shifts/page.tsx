'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import HrNav from '@/features/hr/components/HrNav';
import { useDialog } from '@/shared/context/DialogContext';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';

interface Shift {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
}

const defaultShiftForm = { name: '', start_time: '09:00', end_time: '17:00', break_minutes: '60' };

function formatTimeForInput(value: string) {
  return String(value).slice(0, 5);
}

export default function ShiftsPage() {
  const { alert, confirm } = useDialog();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [staff, setStaff] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [shiftForm, setShiftForm] = useState(defaultShiftForm);
  const [assignForm, setAssignForm] = useState({ staff_id: '', shift_id: '', effective_from: new Date().toISOString().split('T')[0] });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [shRes, stRes] = await Promise.all([fetch('/api/shifts'), fetch('/api/staff?limit=200&status=active')]);
    const [shData, stData] = await Promise.all([shRes.json(), stRes.json()]);
    if (shData.success) setShifts(shData.data);
    if (stData.success) setStaff(stData.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreateShift = () => {
    setEditingShift(null);
    setShiftForm(defaultShiftForm);
    setShowShiftModal(true);
  };

  const openEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setShiftForm({
      name: shift.name,
      start_time: formatTimeForInput(shift.start_time),
      end_time: formatTimeForInput(shift.end_time),
      break_minutes: String(shift.break_minutes),
    });
    setShowShiftModal(true);
  };

  const saveShift = async () => {
    if (!shiftForm.name.trim()) {
      await alert('Shift name is required', { title: 'Validation', type: 'warning' });
      return;
    }
    const payload = { ...shiftForm, break_minutes: parseInt(shiftForm.break_minutes, 10) };
    const url = editingShift ? `/api/shifts/${editingShift.id}` : '/api/shifts';
    const res = await fetch(url, {
      method: editingShift ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) { setShowShiftModal(false); setEditingShift(null); fetchData(); }
    else await alert(data.error, { title: 'Error', type: 'error' });
  };

  const assignShift = async () => {
    const res = await fetch(`/api/staff/${assignForm.staff_id}/shift`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shift_id: parseInt(assignForm.shift_id, 10), effective_from: assignForm.effective_from }),
    });
    const data = await res.json();
    if (data.success) { setShowAssignModal(false); await alert('Shift assigned', { title: 'Success', type: 'success' }); }
    else await alert(data.error, { title: 'Error', type: 'error' });
  };

  const removeShift = async (id: number) => {
    const ok = await confirm('Delete this shift?', { title: 'Confirm', type: 'warning' });
    if (!ok) return;
    const res = await fetch(`/api/shifts/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) fetchData();
    else await alert(data.error, { title: 'Error', type: 'error' });
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <HrNav />
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl">Shift Management</h1>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowAssignModal(true)} className="px-4 py-2 border rounded-lg text-sm">Assign to Staff</button>
            <button type="button" onClick={openCreateShift} className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm"><FiPlus /> Add Shift</button>
          </div>
        </div>
        <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Start</th>
                <th className="text-left px-5 py-3">End</th>
                <th className="text-left px-5 py-3">Break (min)</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Loading...</td></tr>
              : shifts.map((s) => (
                <tr key={s.id} className="border-b">
                  <td className="px-5 py-3 font-medium">{s.name}</td>
                  <td className="px-5 py-3">{formatTimeForInput(s.start_time)}</td>
                  <td className="px-5 py-3">{formatTimeForInput(s.end_time)}</td>
                  <td className="px-5 py-3">{s.break_minutes}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => openEditShift(s)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Edit shift"><FiEdit2 /></button>
                      <button type="button" onClick={() => removeShift(s.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Delete shift"><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {showShiftModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-3">
              <h2 className="font-bold">{editingShift ? 'Edit Shift' : 'Add Shift'}</h2>
              <input placeholder="Name" value={shiftForm.name} onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input type="time" value={shiftForm.start_time} onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                <input type="time" value={shiftForm.end_time} onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              </div>
              <input type="number" placeholder="Break minutes" value={shiftForm.break_minutes} onChange={(e) => setShiftForm({ ...shiftForm, break_minutes: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setShowShiftModal(false); setEditingShift(null); }} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="button" onClick={saveShift} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">{editingShift ? 'Update' : 'Save'}</button>
              </div>
            </div>
          </div>
        )}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-3">
              <h2 className="font-bold">Assign Shift</h2>
              <select value={assignForm.staff_id} onChange={(e) => setAssignForm({ ...assignForm, staff_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Select staff</option>
                {staff.map((s) => <option key={String(s.id)} value={String(s.id)}>{String(s.first_name)} {String(s.last_name)}</option>)}
              </select>
              <select value={assignForm.shift_id} onChange={(e) => setAssignForm({ ...assignForm, shift_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Select shift</option>
                {shifts.map((s) => <option key={String(s.id)} value={String(s.id)}>{String(s.name)}</option>)}
              </select>
              <input type="date" value={assignForm.effective_from} onChange={(e) => setAssignForm({ ...assignForm, effective_from: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowAssignModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="button" onClick={assignShift} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">Assign</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
