'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  FiArrowLeft,
  FiCalendar,
  FiMapPin,
  FiPhone,
  FiTruck,
  FiUser,
} from 'react-icons/fi';
import { formatCurrency, formatDate } from '@edulakhya/utils';
import RupeeIcon from '@/shared/components/icons/RupeeIcon';
import TransportPageHeader from '@/features/transport/components/TransportPageHeader';

interface PaymentScheduleRow {
  id: number;
  month: number;
  month_label: string;
  period_label: string;
  monthly_charges: number;
  paid_amount: number;
  balance: number;
  status: 'paid' | 'due' | 'pending' | 'exempted';
  due_date: string | null;
  payment_date: string | null;
}

interface TransportStudentDetail {
  student: {
    id: number;
    first_name: string;
    last_name: string;
    admission_number: string;
    roll_number?: string | null;
    photo_url?: string | null;
    parent_phone?: string | null;
    class_name?: string | null;
    section_name?: string | null;
  };
  academic_year: string;
  transport: {
    assignment_id: number;
    status: string;
    route_name: string;
    route_number?: string | null;
    stop_name?: string | null;
    stop_code?: string | null;
    arrival_time?: string | null;
    transport_fee: number;
    start_date: string;
    end_date?: string | null;
  };
  vehicle: {
    id: number;
    vehicle_number: string;
    vehicle_type?: string | null;
    model?: string | null;
  } | null;
  driver: {
    name: string;
    phone?: string | null;
  } | null;
  payment_overview: {
    total_charges: number;
    total_months: number;
    paid_amount: number;
    paid_months: number;
    pending_amount: number;
    pending_months: number;
    due_status: 'due' | 'clear' | 'upcoming';
    due_month_label: string | null;
  };
  payment_schedule: PaymentScheduleRow[];
}

function formatTime(value: string | null | undefined) {
  if (!value) return '—';
  const parts = String(value).split(':');
  if (parts.length < 2) return value;
  const hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (Number.isNaN(hours)) return value;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes} ${period}`;
}

function formatRelativePast(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return 'Today';
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`;
}

function transportStatusClass(status: string) {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'suspended':
      return 'bg-red-100 text-red-800';
    case 'inactive':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function paymentStatusClass(status: PaymentScheduleRow['status']) {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'due':
      return 'bg-orange-100 text-orange-800';
    case 'exempted':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-amber-100 text-amber-800';
  }
}

function paymentStatusLabel(status: PaymentScheduleRow['status']) {
  switch (status) {
    case 'paid':
      return 'Paid';
    case 'due':
      return 'Due';
    case 'exempted':
      return 'Exempted';
    default:
      return 'Pending';
  }
}

function dueOverviewClass(status: TransportStudentDetail['payment_overview']['due_status']) {
  switch (status) {
    case 'due':
      return 'bg-orange-100 text-orange-800';
    case 'upcoming':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-green-100 text-green-800';
  }
}

function dueOverviewLabel(status: TransportStudentDetail['payment_overview']['due_status']) {
  switch (status) {
    case 'due':
      return 'Due';
    case 'upcoming':
      return 'Upcoming';
    default:
      return 'Clear';
  }
}

export default function TransportStudentDetailView({ studentId }: { studentId: number }) {
  const [detail, setDetail] = useState<TransportStudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/transport/students/${studentId}`);
      const data = await response.json();
      if (!data.success) {
        setError(data.error || 'Failed to load transport details');
        setDetail(null);
        return;
      }
      setDetail(data.data);
    } catch {
      setError('Failed to load transport details');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 text-sm">
        Loading student transport details...
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="p-8 space-y-4 text-center">
        <p className="text-gray-600">{error || 'Transport details not found'}</p>
        <Link
          href="/transport/students"
          className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
        >
          <FiArrowLeft size={14} />
          Back to Transport Students
        </Link>
      </div>
    );
  }

  const { student, transport, vehicle, driver, payment_overview, payment_schedule } = detail;
  const initials = `${student.first_name?.charAt(0) || ''}${student.last_name?.charAt(0) || ''}`;
  const classSection = [student.class_name, student.section_name ? `(${student.section_name})` : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <nav className="text-xs text-gray-500 mb-2 flex items-center gap-1.5">
            <Link href="/transport/dashboard" className="hover:text-gray-700">
              Transport
            </Link>
            <span>/</span>
            <Link href="/transport/students" className="hover:text-gray-700">
              Students
            </Link>
            <span>/</span>
            <span className="text-gray-700">Student Transport Details</span>
          </nav>
          <TransportPageHeader
            title="Student Transport Details"
            description="View transport information and payment status for the student."
          />
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/transport/students"
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            <FiArrowLeft size={14} />
            Back to Students
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="h-14 w-14 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-lg font-semibold shrink-0 overflow-hidden">
              {student.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={student.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {student.first_name} {student.last_name}
              </h2>
              <p className="text-sm text-gray-500">{student.admission_number}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div>
              <p className="text-xs text-gray-500">Class</p>
              <p className="font-medium text-gray-900">{classSection || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Roll No.</p>
              <p className="font-medium text-gray-900">{student.roll_number || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Route</p>
              <p className="font-medium text-gray-900">
                {transport.route_number || transport.route_name}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Transport Status</p>
              <span
                className={`inline-flex mt-1 px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${transportStatusClass(transport.status)}`}
              >
                {transport.status}
              </span>
            </div>
          </div>
        </div>

        {student.parent_phone && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-700">
            <FiPhone className="text-gray-400 shrink-0" size={16} />
            <span>
              Parent Contact: <strong className="text-gray-900">{student.parent_phone}</strong>
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <InfoCard
          icon={<FiMapPin className="text-blue-600" />}
          iconBg="bg-blue-50"
          label="Pickup Point"
          value={transport.stop_name || '—'}
          sub={
            [
              transport.stop_code ? `Stop Code: ${transport.stop_code}` : null,
              transport.arrival_time ? `Pickup Time: ${formatTime(transport.arrival_time)}` : null,
            ]
              .filter(Boolean)
              .join(' · ') || undefined
          }
        />
        <InfoCard
          icon={<FiTruck className="text-purple-600" />}
          iconBg="bg-purple-50"
          label="Vehicle"
          value={vehicle?.vehicle_number || '—'}
          sub={vehicle ? `Bus No. ${vehicle.id}` : 'Not assigned'}
        />
        <InfoCard
          icon={<FiUser className="text-orange-600" />}
          iconBg="bg-orange-50"
          label="Driver"
          value={driver?.name || '—'}
          sub={driver?.phone || undefined}
        />
        <InfoCard
          icon={<FiCalendar className="text-green-600" />}
          iconBg="bg-green-50"
          label="Start Date"
          value={transport.start_date ? formatDate(new Date(transport.start_date)) : '—'}
          sub={formatRelativePast(transport.start_date)}
        />
        <InfoCard
          icon={<RupeeIcon size={18} className="text-indigo-600" />}
          iconBg="bg-indigo-50"
          label="Monthly Charges"
          value={formatCurrency(transport.transport_fee)}
          sub="Per Month"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Transport Payment Overview</h3>
          <Link
            href={`/fees/ledger/${student.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            <RupeeIcon size={14} />
            Record Payment
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 p-5 border-b border-gray-100">
          <OverviewStat
            label="Total Charges"
            value={formatCurrency(payment_overview.total_charges)}
            sub={`${payment_overview.total_months} Month${payment_overview.total_months === 1 ? '' : 's'}`}
            valueClass="text-blue-700"
          />
          <OverviewStat
            label="Paid Amount"
            value={formatCurrency(payment_overview.paid_amount)}
            sub={`${payment_overview.paid_months} Month${payment_overview.paid_months === 1 ? '' : 's'}`}
            valueClass="text-green-700"
          />
          <OverviewStat
            label="Pending Amount"
            value={formatCurrency(payment_overview.pending_amount)}
            sub={`${payment_overview.pending_months} Month${payment_overview.pending_months === 1 ? '' : 's'}`}
            valueClass="text-red-700"
          />
          <div>
            <p className="text-xs font-medium text-gray-500">Due Status</p>
            <span
              className={`inline-flex mt-2 px-2.5 py-1 text-xs font-semibold rounded-full ${dueOverviewClass(payment_overview.due_status)}`}
            >
              {dueOverviewLabel(payment_overview.due_status)}
            </span>
            {payment_overview.due_month_label && (
              <p className="text-sm text-gray-700 mt-2">{payment_overview.due_month_label}</p>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-b border-gray-100">
          <h4 className="text-sm font-semibold text-gray-900">Payment Schedule</h4>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 text-left font-semibold">Month</th>
                <th className="px-4 py-3 text-left font-semibold">Period</th>
                <th className="px-4 py-3 text-right font-semibold">Monthly Charges</th>
                <th className="px-4 py-3 text-right font-semibold">Paid Amount</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Due Date</th>
                <th className="px-4 py-3 text-left font-semibold">Payment Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payment_schedule.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No transport fee schedule found for this academic year.
                  </td>
                </tr>
              ) : (
                payment_schedule.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.month_label}</td>
                    <td className="px-4 py-3 text-gray-600">{row.period_label}</td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {formatCurrency(row.monthly_charges)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        row.paid_amount > 0 ? 'text-green-700' : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(row.paid_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${paymentStatusClass(row.status)}`}
                      >
                        {paymentStatusLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {row.due_date ? formatDate(new Date(row.due_date)) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {row.payment_date ? formatDate(new Date(row.payment_date)) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  iconBg,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className={`h-10 w-10 rounded-lg ${iconBg} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="text-base font-semibold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function OverviewStat({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  sub: string;
  valueClass: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${valueClass}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}
