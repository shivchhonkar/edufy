'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import RupeeIcon from '@/shared/components/icons/RupeeIcon';
import { FiUser, FiCalendar, FiClock } from 'react-icons/fi';
import type { PortalPermissionMap } from '@/lib/portal-access';

type EssTab = 'attendance' | 'leaves' | 'payslips';

const TAB_CONFIG: { id: EssTab; label: string; icon: typeof FiClock; moduleKey: string }[] = [
  { id: 'attendance', label: 'Attendance', icon: FiClock, moduleKey: 'attendance' },
  { id: 'leaves', label: 'Leaves', icon: FiCalendar, moduleKey: 'leaves' },
  { id: 'payslips', label: 'Payslips', icon: RupeeIcon, moduleKey: 'payslips' },
];

export default function EssPage() {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [tab, setTab] = useState<EssTab>('attendance');
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<{ id: number; name: string }[]>([]);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ leave_type_id: '', start_date: '', end_date: '', reason: '' });
  const [message, setMessage] = useState('');

  const permissions = profile?.effective_permissions as PortalPermissionMap | undefined;
  const portalEnabled = profile?.portal_access_enabled !== false;

  const allowedTabs = useMemo(
    () =>
      TAB_CONFIG.filter(
        (t) => portalEnabled && permissions && permissions[t.moduleKey] !== false,
      ),
    [portalEnabled, permissions],
  );

  useEffect(() => {
    fetch('/api/ess/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setProfile(d.data);
      });
    fetch('/api/leave-types')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setLeaveTypes(d.data);
      });
  }, []);

  useEffect(() => {
    if (allowedTabs.length && !allowedTabs.some((t) => t.id === tab)) {
      setTab(allowedTabs[0].id);
    }
  }, [allowedTabs, tab]);

  const fetchTab = useCallback(async () => {
    if (!portalEnabled || !allowedTabs.some((t) => t.id === tab)) {
      setItems([]);
      return;
    }
    const res = await fetch(`/api/ess?type=${tab}`);
    const data = await res.json();
    if (data.success) setItems(data.data);
    else if (data.error) setMessage(data.error);
  }, [tab, portalEnabled, allowedTabs]);

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

        {profile && !portalEnabled && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 px-4 py-3 rounded-lg">
            Staff portal access has been disabled. Contact school administration.
          </p>
        )}

        {profile && portalEnabled && allowedTabs.length > 0 && (
          <div className="flex gap-2 border-b pb-2">
            {allowedTabs.map((t) => (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${tab === t.id ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}>
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>
        )}

        {profile && portalEnabled && allowedTabs.length === 0 && (
          <p className="text-sm text-gray-600 bg-gray-50 border px-4 py-3 rounded-lg">
            No ESS modules are enabled for your account.
          </p>
        )}

        {message && <p className="text-sm text-primary-700 bg-primary-50 px-4 py-2 rounded-lg">{message}</p>}

        {tab === 'leaves' && portalEnabled && permissions?.leaves !== false && (
          <button type="button" onClick={() => setShowLeaveForm(true)} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">Apply for Leave</button>
        )}

        {portalEnabled && allowedTabs.length > 0 && (
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
        )}

        {showLeaveForm && (
          <AppModal open={showLeaveForm} onClose={() => setShowLeaveForm(false)}>
      <div className="flex flex-col h-full w-full min-h-0 min-w-0 bg-white shadow-2xl overflow-hidden">
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
          </AppModal>
        )}
      </div>
    </DashboardLayout>
  );
}
