'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { useDialog } from '@/shared/context/DialogContext';
import RupeeIcon from '@/shared/components/icons/RupeeIcon';
import {
  FiLock, FiUnlock, FiCheck, FiCheckSquare, FiSquare, FiZap,
} from 'react-icons/fi';

interface StaffMember {
  id: number;
  first_name: string;
  last_name: string;
  department?: string;
  salary?: number;
}

interface PayrollRecord {
  id: number;
  staff_id: number;
  first_name: string;
  last_name: string;
  department: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  status: string;
  payment_date?: string;
  payment_method?: string;
  transaction_id?: string;
  is_advance?: boolean;
  amount_paid?: number;
}

interface PayrollStaffRow {
  staff_id: number;
  payroll_id?: number;
  first_name: string;
  last_name: string;
  department: string;
  net_salary: number;
  status: string;
  payment_date?: string;
  payment_method?: string;
  is_advance?: boolean;
  amount_paid: number;
}

interface PeriodInfo {
  is_frozen?: boolean;
  frozen_at?: string;
  status?: string;
}

interface Summary {
  total: number;
  paid: number;
  pending: number;
  total_net: number;
  paid_amount: number;
}

export default function PayrollPage() {
  const { alert, confirm } = useDialog();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [period, setPeriod] = useState<PeriodInfo | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<number>>(new Set());
  const [showPayModal, setShowPayModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [payTarget, setPayTarget] = useState<'selected' | 'all' | 'single'>('selected');
  const [singlePayrollId, setSinglePayrollId] = useState<number | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    payment_method: 'bank_transfer',
    transaction_id: '',
    remarks: '',
    is_advance: false,
  });
  const [advanceAmounts, setAdvanceAmounts] = useState<Record<number, string>>({});

  const isFrozen = !!period?.is_frozen;
  const monthLabel = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  const rows: PayrollStaffRow[] = useMemo(() => {
    if (!staffList.length) {
      return payroll.map((p) => ({
        staff_id: p.staff_id,
        payroll_id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        department: p.department || '—',
        net_salary: parseFloat(String(p.net_salary || 0)),
        status: p.status,
        payment_date: p.payment_date,
        payment_method: p.payment_method,
        is_advance: p.is_advance,
        amount_paid: parseFloat(String(p.amount_paid || 0)),
      }));
    }
    return staffList.map((s) => {
      const p = payroll.find((r) => r.staff_id === s.id);
      return {
        staff_id: s.id,
        payroll_id: p?.id,
        first_name: s.first_name,
        last_name: s.last_name,
        department: p?.department || s.department || '—',
        net_salary: p ? parseFloat(String(p.net_salary || 0)) : parseFloat(String(s.salary || 0)),
        status: p?.status || 'not_generated',
        payment_date: p?.payment_date,
        payment_method: p?.payment_method,
        is_advance: p?.is_advance,
        amount_paid: p ? parseFloat(String(p.amount_paid || 0)) : 0,
      };
    });
  }, [staffList, payroll]);

  const pendingRows = useMemo(
    () => rows.filter((r) => r.payroll_id && r.status !== 'paid'),
    [rows]
  );
  const selectedPendingPayrollIds = useMemo(
    () => rows.filter((r) => selectedStaffIds.has(r.staff_id) && r.payroll_id && r.status !== 'paid').map((r) => r.payroll_id!),
    [rows, selectedStaffIds]
  );
  const allStaffSelected = rows.length > 0 && rows.every((r) => selectedStaffIds.has(r.staff_id));

  const fetchPayroll = useCallback(async () => {
    setLoading(true);
    const [payrollRes, staffRes] = await Promise.all([
      fetch(`/api/payroll?month=${month}&year=${year}`),
      fetch('/api/staff?limit=200&status=active'),
    ]);
    const [payrollData, staffData] = await Promise.all([payrollRes.json(), staffRes.json()]);
    if (payrollData.success) {
      setPayroll(payrollData.data.payroll);
      setPeriod(payrollData.data.period);
      setSummary(payrollData.data.summary);
    }
    if (staffData.success) setStaffList(staffData.data);
    setSelectedStaffIds(new Set());
    setLoading(false);
  }, [month, year]);

  useEffect(() => { fetchPayroll(); }, [fetchPayroll]);

  const postAction = async (payload: Record<string, unknown>) => {
    setActionLoading(true);
    const res = await fetch('/api/payroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year, ...payload }),
    });
    const data = await res.json();
    setActionLoading(false);
    if (data.success) {
      await fetchPayroll();
      return data;
    }
    await alert(data.error || 'Action failed', { title: 'Error', type: 'error' });
    return null;
  };

  const generatePayroll = async () => {
    if (isFrozen) {
      await alert('This period is frozen. Unfreeze it first.', { title: 'Frozen', type: 'warning' });
      return;
    }
    const ok = await confirm(`Generate payroll for ${monthLabel}?`, { title: 'Generate Payroll', type: 'info' });
    if (!ok) return;
    const data = await postAction({ action: 'generate' });
    if (data) await alert(data.message, { title: 'Success', type: 'success' });
  };

  const toggleFreeze = async () => {
    if (isFrozen) {
      const ok = await confirm('Unfreeze this payroll period? You can edit and pay again.', { title: 'Unfreeze', type: 'warning' });
      if (!ok) return;
      const data = await postAction({ action: 'unfreeze' });
      if (data) await alert(data.message, { title: 'Unfrozen', type: 'success' });
    } else {
      const ok = await confirm(
        `Freeze payroll for ${monthLabel}? No generate, pay, or edit actions will be allowed until unfrozen.`,
        { title: 'Freeze Period', type: 'warning' }
      );
      if (!ok) return;
      const data = await postAction({ action: 'freeze', remarks: `Frozen on ${new Date().toLocaleDateString()}` });
      if (data) await alert(data.message, { title: 'Frozen', type: 'success' });
    }
  };

  const openPayModal = (target: 'selected' | 'all' | 'single', payrollId?: number) => {
    setPayTarget(target);
    setSinglePayrollId(payrollId ?? null);
    setPaymentForm({ payment_method: 'bank_transfer', transaction_id: '', remarks: '', is_advance: false });
    setShowPayModal(true);
  };

  const submitPayment = async () => {
    if (payTarget === 'single' && singlePayrollId) {
      setActionLoading(true);
      const res = await fetch(`/api/payroll/${singlePayrollId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_paid', ...paymentForm }),
      });
      const data = await res.json();
      setActionLoading(false);
      if (data.success) {
        setShowPayModal(false);
        await fetchPayroll();
        await alert('Payment recorded', { title: 'Success', type: 'success' });
      } else {
        await alert(data.error, { title: 'Error', type: 'error' });
      }
      return;
    }

    const ids = payTarget === 'all'
      ? pendingRows.map((r) => r.payroll_id!)
      : selectedPendingPayrollIds;

    if (!ids.length) {
      await alert('Select staff with pending payroll to mark as paid', { title: 'No pending payroll', type: 'warning' });
      return;
    }

    const data = await postAction({
      action: 'mark_paid',
      payroll_ids: ids,
      payment_method: paymentForm.payment_method,
      transaction_id: paymentForm.transaction_id || null,
      is_advance: paymentForm.is_advance,
    });
    if (data) {
      setShowPayModal(false);
      await alert(data.message, { title: 'Success', type: 'success' });
    }
  };

  const openAdvanceModal = async () => {
    if (isFrozen) {
      await alert('Unfreeze the period first', { title: 'Frozen', type: 'warning' });
      return;
    }
    if (selectedStaffIds.size === 0) {
      await alert('Select one or more staff from the table before paying in advance', { title: 'Select staff', type: 'warning' });
      return;
    }
    const amounts: Record<number, string> = {};
    rows
      .filter((r) => selectedStaffIds.has(r.staff_id))
      .forEach((r) => {
        const balance = Math.max(0, r.net_salary - r.amount_paid);
        amounts[r.staff_id] = balance > 0 ? String(balance) : '';
      });
    setAdvanceAmounts(amounts);
    setPaymentForm({
      payment_method: 'bank_transfer',
      transaction_id: '',
      remarks: `Advance payment for ${monthLabel}`,
      is_advance: true,
    });
    setShowAdvanceModal(true);
  };

  const submitAdvance = async () => {
    const staffIds = Array.from(selectedStaffIds);
    const advance_amounts: Record<number, number> = {};
    for (const id of staffIds) {
      const amount = parseFloat(advanceAmounts[id] || '0');
      if (!amount || amount <= 0) {
        await alert('Enter a valid advance amount for each selected staff member', { title: 'Invalid amount', type: 'warning' });
        return;
      }
      const row = rows.find((r) => r.staff_id === id);
      const balance = row ? row.net_salary - row.amount_paid : amount;
      if (amount > balance + 0.01) {
        await alert(
          `Advance for ${row?.first_name} ${row?.last_name} exceeds balance due (₹${balance.toLocaleString('en-IN')})`,
          { title: 'Invalid amount', type: 'warning' }
        );
        return;
      }
      advance_amounts[id] = amount;
    }

    const totalAdvance = Object.values(advance_amounts).reduce((s, n) => s + n, 0);
    const ok = await confirm(
      `Record advance payment of ₹${totalAdvance.toLocaleString('en-IN')} for ${staffIds.length} staff for ${monthLabel}?`,
      { title: 'Confirm Advance Payment', type: 'warning' }
    );
    if (!ok) return;

    const data = await postAction({
      action: 'pay_advance',
      staff_ids: staffIds,
      advance_amounts,
      payment_method: paymentForm.payment_method,
      transaction_id: paymentForm.transaction_id || null,
      remarks: paymentForm.remarks,
    });
    if (data) {
      setShowAdvanceModal(false);
      await alert(data.message, { title: 'Success', type: 'success' });
    }
  };

  const resetPayment = async (payrollId: number, name: string) => {
    const ok = await confirm(
      `Reset payment for ${name}? Recorded payments will be cleared and status set to pending.`,
      { title: 'Reset Payment', type: 'warning' }
    );
    if (!ok) return;
    setActionLoading(true);
    const res = await fetch(`/api/payroll/${payrollId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_unpaid' }),
    });
    const data = await res.json();
    setActionLoading(false);
    if (data.success) {
      await fetchPayroll();
      await alert('Payment reset', { title: 'Success', type: 'success' });
    } else {
      await alert(data.error || 'Failed to reset', { title: 'Error', type: 'error' });
    }
  };

  const toggleSelectStaff = (staffId: number) => {
    if (isFrozen) return;
    setSelectedStaffIds((prev) => {
      const next = new Set(prev);
      if (next.has(staffId)) next.delete(staffId);
      else next.add(staffId);
      return next;
    });
  };

  const toggleSelectAllStaff = () => {
    if (isFrozen) return;
    if (allStaffSelected) {
      setSelectedStaffIds(new Set());
    } else {
      setSelectedStaffIds(new Set(rows.map((r) => r.staff_id)));
    }
  };

  const statusBadge = (status: string, isAdvance?: boolean, amountPaid?: number, netSalary?: number) => {
    const base = 'text-xs px-2 py-0.5 rounded-full font-medium';
    if (status === 'partial_advance') {
      return (
        <span className={`${base} bg-purple-100 text-purple-700`}>
          Partial Advance
          {amountPaid != null && netSalary != null && (
            <span className="block text-[10px] font-normal mt-0.5">
              ₹{amountPaid.toLocaleString('en-IN')} / ₹{netSalary.toLocaleString('en-IN')}
            </span>
          )}
        </span>
      );
    }
    if (status === 'paid') {
      return (
        <span className={`${base} ${isAdvance ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
          {isAdvance ? 'Paid (Advance)' : 'Paid'}
        </span>
      );
    }
    if (status === 'not_generated') {
      return <span className={`${base} bg-gray-100 text-gray-600`}>Not Generated</span>;
    }
    return <span className={`${base} bg-amber-100 text-amber-700 capitalize`}>{status.replace(/_/g, ' ')}</span>;
  };

  const selectedStaffRows = rows.filter((r) => selectedStaffIds.has(r.staff_id));

  return (
    <DashboardLayout>
      <div className="space-y-6 min-w-0 max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-xl text-gray-900 flex items-center gap-2">
              <RupeeIcon className="text-primary-600" /> Payroll
            </h1>
            <p className="text-gray-600 mt-1">of month {monthLabel}</p>
          </div>
          {isFrozen && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm">
              <FiLock className="w-4 h-4 shrink-0" />
              Period frozen — unlock to make changes
            </div>
          )}
        </div>

        <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value, 10))}
              className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24"
            />
            <button
              type="button"
              onClick={generatePayroll}
              disabled={actionLoading || isFrozen}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              Generate Payroll
            </button>
            <button
              type="button"
              onClick={() => openPayModal('all')}
              disabled={actionLoading || isFrozen || pendingRows.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              <FiCheck className="w-4 h-4" /> Mark All Paid ({pendingRows.length})
            </button>
            <button
              type="button"
              onClick={() => openPayModal('selected')}
              disabled={actionLoading || isFrozen || selectedPendingPayrollIds.length === 0}
              className="px-4 py-2 border border-green-600 text-green-700 rounded-lg text-sm font-medium hover:bg-green-50 disabled:opacity-50"
            >
              Mark Selected Paid ({selectedPendingPayrollIds.length})
            </button>
            <button
              type="button"
              onClick={openAdvanceModal}
              disabled={actionLoading || isFrozen || selectedStaffIds.size === 0}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              <FiZap className="w-4 h-4" /> Pay in Advance ({selectedStaffIds.size})
            </button>
            <button
              type="button"
              onClick={toggleFreeze}
              disabled={actionLoading}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 sm:ml-auto ${
                isFrozen
                  ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {isFrozen ? <><FiUnlock className="w-4 h-4" /> Unfreeze</> : <><FiLock className="w-4 h-4" /> Freeze Period</>}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Select staff using the checkboxes in the table, then use <strong>Pay in Advance</strong> or <strong>Mark Selected Paid</strong>.
          </p>
        </div>

        {selectedStaffIds.size > 0 && (
          <div className="bg-primary-50 border border-primary-200 rounded-xl px-4 py-3 text-sm text-primary-800">
            <span className="font-medium">{selectedStaffIds.size} staff selected:</span>{' '}
            {selectedStaffRows.map((r) => `${r.first_name} ${r.last_name}`).join(', ')}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">Staff</p>
            <p className="text-2xl text-gray-900">{summary?.total ?? rows.length}</p>
          </div>
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">Paid</p>
            <p className="text-2xl text-green-600">{summary?.paid ?? 0}</p>
          </div>
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">Pending</p>
            <p className="text-2xl text-amber-600">{summary?.pending ?? pendingRows.length}</p>
          </div>
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">Total Net</p>
            <p className="text-2xl text-gray-900">₹{(summary?.total_net ?? 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">Paid Amount</p>
            <p className="text-2xl text-green-700">₹{(summary?.paid_amount ?? 0).toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-gray-50 border-b sticky top-0 z-10 shrink-0">
              <tr>
                <th className="px-5 py-3 w-12">
                  <button
                    type="button"
                    onClick={toggleSelectAllStaff}
                    disabled={rows.length === 0 || isFrozen}
                    className="text-gray-500 hover:text-primary-600 disabled:opacity-30"
                    title="Select all staff"
                  >
                    {allStaffSelected ? <FiCheckSquare className="w-4 h-4 text-primary-600" /> : <FiSquare className="w-4 h-4" />}
                  </button>
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Employee</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Department</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Net Salary</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Paid</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Balance</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Paid On</th>
                <th className="px-5 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-5 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-8 text-center text-gray-400">No active staff found.</td></tr>
              ) : rows.map((r) => {
                const isSelected = selectedStaffIds.has(r.staff_id);
                const canMarkPaid = r.payroll_id && r.status !== 'paid' && !isFrozen;
                const canResetPayment = r.payroll_id && (r.status === 'paid' || r.status === 'partial_advance') && !isFrozen;
                return (
                  <tr
                    key={r.staff_id}
                    className={`border-b last:border-0 transition-colors ${
                      isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => toggleSelectStaff(r.staff_id)}
                        disabled={isFrozen}
                        className="text-gray-500 hover:text-primary-600 disabled:opacity-30"
                      >
                        {isSelected ? <FiCheckSquare className="w-4 h-4 text-primary-600" /> : <FiSquare className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">{r.first_name} {r.last_name}</td>
                    <td className="px-5 py-3 text-gray-600">{r.department}</td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">
                      ₹{r.net_salary.toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700">
                      {r.amount_paid > 0 ? `₹${r.amount_paid.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700">
                      {r.net_salary - r.amount_paid > 0
                        ? `₹${(r.net_salary - r.amount_paid).toLocaleString('en-IN')}`
                        : r.status === 'paid' ? '—' : `₹${r.net_salary.toLocaleString('en-IN')}`}
                    </td>
                    <td className="px-5 py-3">{statusBadge(r.status, r.is_advance, r.amount_paid, r.net_salary)}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {r.payment_date ? String(r.payment_date).split('T')[0] : '—'}
                      {r.payment_method && (
                        <span className="block capitalize">{r.payment_method.replace(/_/g, ' ')}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {canMarkPaid && (
                          <button
                            type="button"
                            onClick={() => openPayModal('single', r.payroll_id)}
                            className="px-2.5 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            Mark Paid
                          </button>
                        )}
                        {canResetPayment && (
                          <button
                            type="button"
                            onClick={() => resetPayment(r.payroll_id!, `${r.first_name} ${r.last_name}`)}
                            className="px-2.5 py-1 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                          >
                            Reset
                          </button>
                        )}
                        {r.payroll_id && (
                          <a
                            href={`/api/payroll/payslip/${r.staff_id}?month=${month}&year=${year}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary-600 hover:underline font-medium"
                          >
                            Payslip
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {showPayModal && (
          <AppModal open={showPayModal} onClose={() => setShowPayModal(false)}>
      <div className={APP_MODAL_PANEL}>
              <h2 className="text-lg font-bold text-gray-900">
                {payTarget === 'all' ? 'Mark All as Paid' : payTarget === 'selected' ? `Mark ${selectedPendingPayrollIds.length} as Paid` : 'Record Payment'}
              </h2>
              <select
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="upi">UPI</option>
              </select>
              <input
                placeholder="Transaction / reference ID (optional)"
                value={paymentForm.transaction_id}
                onChange={(e) => setPaymentForm({ ...paymentForm, transaction_id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowPayModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button
                  type="button"
                  onClick={submitPayment}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Confirm Payment'}
                </button>
              </div>
            </div>
          </AppModal>
        )}

        {showAdvanceModal && (
          <AppModal open={showAdvanceModal} onClose={() => setShowAdvanceModal(false)}>
      <div className={APP_MODAL_PANEL}>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FiZap className="text-purple-600" /> Pay in Advance
              </h2>
              <p className="text-sm text-gray-600">
                Enter the advance amount for each staff member for <strong>{monthLabel}</strong>.
              </p>
              <div className="text-sm bg-gray-50 border rounded-lg px-3 py-2 max-h-48 overflow-y-auto space-y-3">
                {selectedStaffRows.map((r) => {
                  const balance = Math.max(0, r.net_salary - r.amount_paid);
                  return (
                    <div key={r.staff_id} className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-gray-900">{r.first_name} {r.last_name}</p>
                        <p className="text-xs text-gray-500">
                          Net ₹{r.net_salary.toLocaleString('en-IN')}
                          {r.amount_paid > 0 && ` · Paid ₹${r.amount_paid.toLocaleString('en-IN')} · Balance ₹${balance.toLocaleString('en-IN')}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">₹</span>
                        <input
                          type="number"
                          min={1}
                          max={balance}
                          step={1}
                          value={advanceAmounts[r.staff_id] ?? ''}
                          onChange={(e) => setAdvanceAmounts({ ...advanceAmounts, [r.staff_id]: e.target.value })}
                          className="w-28 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right"
                          placeholder="Amount"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <select
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="upi">UPI</option>
              </select>
              <input
                placeholder="Transaction / reference ID (optional)"
                value={paymentForm.transaction_id}
                onChange={(e) => setPaymentForm({ ...paymentForm, transaction_id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowAdvanceModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button
                  type="button"
                  onClick={submitAdvance}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : `Confirm Advance (${selectedStaffIds.size})`}
                </button>
              </div>
            </div>
          </AppModal>
        )}
      </div>
    </DashboardLayout>
  );
}
