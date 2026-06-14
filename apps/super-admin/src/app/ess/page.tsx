'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import RupeeIcon from '@/shared/components/icons/RupeeIcon';
import { FiUser, FiCalendar, FiClock } from 'react-icons/fi';

export default function EssPage() {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [tab, setTab] = useState<'attendance' | 'leaves' | 'payslips'>('attendance');
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<{ id: number; name: string }[]>([]);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ leave_type_id: '', start_date: '', end_date: '', reason: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/ess/profile').then((r) => r.json()).then((d) => { if (d.success) setProfile(d.data); });
    fetch('/api/leave-types').then((r) => r.json()).then((d) => { if (d.success) setLeaveTypes(d.data); });
  }, []);

  const fetchTab = useCallback(async () => {
    const res = await fetch(`/api/ess?type=${tab}`);
    const data = await res.json();
    if (data.success) setItems(data.data);
  }, [tab]);

  useEffect(() => { fetchTab(); }, [fetchTab]);

  const submitLeave = async () => {
    const res = await fetch('/api/ess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leaveForm),
    });
    const data = await res.json();
    if (data.success) {
      setShowLeaveForm(false);
      setMessage('Leave request submitted');
      fetchTab();
    } else {
      setMessage(data.error || 'Failed');
    }
  };

  const now = new Date();

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl">Employee Self Service</h1>
          <p className="text-gray-600 mt-1">View your profile, attendance, leaves, and payslips</p>
        </div>

        {profile && (
          <div className="bg-white border rounded-xl p-6 flex items-center gap-4">
            <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center">
              <FiUser className="w-7 h-7 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{String(profile.first_name)} {String(profile.last_name)}</h2>
              <p className="text-sm text-gray-500">{String(profile.employee_id)} · {String(profile.designation_name || profile.designation || 'Staff')}</p>
              <p className="text-sm text-gray-500">{String(profile.department_name || profile.department || '')}</p>
            </div>
          </div>
        )}

        <div className="flex gap-2 border-b pb-2">
          {[
            { id: 'attendance' as const, label: 'Attendance', icon: FiClock },
            { id: 'leaves' as const, label: 'Leaves', icon: FiCalendar },
            { id: 'payslips' as const, label: 'Payslips', icon: RupeeIcon },
          ].map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${tab === t.id ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {message && <p className="text-sm text-primary-700 bg-primary-50 px-4 py-2 rounded-lg">{message}</p>}

        {tab === 'leaves' && (
          <button type="button" onClick={() => setShowLeaveForm(true)} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">Apply for Leave</button>
        )}

        <div className="bg-white border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {tab === 'attendance' && <><th className="text-left px-5 py-3">Date</th><th className="text-left px-5 py-3">Status</th><th className="text-left px-5 py-3">Check In</th><th className="text-left px-5 py-3">Check Out</th></>}
                {tab === 'leaves' && <><th className="text-left px-5 py-3">Type</th><th className="text-left px-5 py-3">Dates</th><th className="text-left px-5 py-3">Days</th><th className="text-left px-5 py-3">Status</th></>}
                {tab === 'payslips' && <><th className="text-left px-5 py-3">Period</th><th className="text-right px-5 py-3">Net Salary</th><th className="text-left px-5 py-3">Status</th><th className="px-5 py-3">Payslip</th></>}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">No records</td></tr>
              ) : items.map((item) => (
                <tr key={String(item.id)} className="border-b">
                  {tab === 'attendance' && (
                    <>
                      <td className="px-5 py-3">{String(item.attendance_date).split('T')[0]}</td>
                      <td className="px-5 py-3 capitalize">{String(item.status)}</td>
                      <td className="px-5 py-3">{item.check_in_time ? String(item.check_in_time).slice(0, 5) : '—'}</td>
                      <td className="px-5 py-3">{item.check_out_time ? String(item.check_out_time).slice(0, 5) : '—'}</td>
                    </>
                  )}
                  {tab === 'leaves' && (
                    <>
                      <td className="px-5 py-3">{String(item.leave_type_name)}</td>
                      <td className="px-5 py-3">{String(item.start_date).split('T')[0]} – {String(item.end_date).split('T')[0]}</td>
                      <td className="px-5 py-3">{String(item.days_requested)}</td>
                      <td className="px-5 py-3 capitalize">{String(item.status)}</td>
                    </>
                  )}
                  {tab === 'payslips' && (
                    <>
                      <td className="px-5 py-3">{new Date(Number(item.year), Number(item.month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</td>
                      <td className="px-5 py-3 text-right">₹{parseFloat(String(item.net_salary)).toLocaleString()}</td>
                      <td className="px-5 py-3 capitalize">{String(item.status)}</td>
                      <td className="px-5 py-3 text-right">
                        <a href={`/api/payroll/payslip/${profile?.id}?month=${item.month}&year=${item.year}`} target="_blank" rel="noreferrer"
                          className="text-primary-600 hover:underline text-xs">View</a>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showLeaveForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-3">
              <h2 className="font-bold">Apply for Leave</h2>
              <select value={leaveForm.leave_type_id} onChange={(e) => setLeaveForm({ ...leaveForm, leave_type_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Leave type</option>
                {leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={leaveForm.start_date} onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                <input type="date" value={leaveForm.end_date} onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              </div>
              <textarea placeholder="Reason" value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowLeaveForm(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="button" onClick={submitLeave} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">Submit</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
