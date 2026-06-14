'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import AddInquiryModal from '@/features/admissions/components/AddInquiryModal';
import InquiryDetailModal, {
  type Inquiry,
} from '@/features/admissions/components/InquiryDetailModal';
import type { InquiryStatus } from '@/lib/admission-inquiry-api';
import {
  PIPELINE_STATUSES,
  STATUS_CARD_STYLES,
  STATUS_COLORS,
  STATUS_LABELS,
  TERMINAL_COLUMN_STYLES,
  TERMINAL_STATUSES,
  inquiryClassDisplay,
  inquiryStudentName,
} from '@/features/admissions/utils/inquiry-labels';
import {
  FiAlertCircle,
  FiClipboard,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiLayout,
  FiList,
} from 'react-icons/fi';

interface Class {
  id: number;
  name: string;
}

interface Stats {
  total: number;
  active: number;
  follow_up_today: number;
  new_this_week: number;
  by_status: Record<string, number>;
}

type ViewMode = 'board' | 'list';

export default function AdmissionsPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedInquiryId, setSelectedInquiryId] = useState<number | null>(null);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch('/api/classes');
      const data = await res.json();
      if (data.success) setClasses(data.data);
    } catch {
      console.error('Failed to fetch classes');
    }
  }, []);

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/admissions/inquiries?${params}`);
      const data = await res.json();
      if (data.success) setInquiries(data.data);
    } catch {
      console.error('Failed to fetch inquiries');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admissions/stats');
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch {
      console.error('Failed to fetch stats');
    }
  }, []);

  const refresh = useCallback(() => {
    fetchInquiries();
    fetchStats();
  }, [fetchInquiries, fetchStats]);

  useEffect(() => {
    fetchClasses();
    fetchStats();
  }, [fetchClasses, fetchStats]);

  useEffect(() => {
    const timer = setTimeout(fetchInquiries, 300);
    return () => clearTimeout(timer);
  }, [fetchInquiries]);

  const boardColumns = useMemo(() => {
    const grouped: Record<string, Inquiry[]> = {};
    for (const status of PIPELINE_STATUSES) {
      grouped[status] = [];
    }
    for (const inquiry of inquiries) {
      if (PIPELINE_STATUSES.includes(inquiry.status)) {
        grouped[inquiry.status].push(inquiry);
      }
    }
    return grouped;
  }, [inquiries]);

  const terminalColumns = useMemo(() => {
    const grouped: Record<string, Inquiry[]> = {};
    for (const status of TERMINAL_STATUSES) {
      grouped[status] = [];
    }
    for (const inquiry of inquiries) {
      if (TERMINAL_STATUSES.includes(inquiry.status)) {
        grouped[inquiry.status].push(inquiry);
      }
    }
    return grouped;
  }, [inquiries]);

  const hasTerminalInquiries = TERMINAL_STATUSES.some(
    (status) => (terminalColumns[status]?.length ?? 0) > 0
  );

  const handleStatusDrop = async (inquiryId: number, newStatus: InquiryStatus) => {
    try {
      const res = await fetch(`/api/admissions/inquiries/${inquiryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) refresh();
    } catch {
      console.error('Status update failed');
    }
  };

  const needsStudentConversion = (inquiry: Inquiry) =>
    inquiry.status === 'registered' && !inquiry.converted_student_id;

  const renderCard = (inquiry: Inquiry, options?: { showStatusBadge?: boolean }) => {
    const isTerminal = TERMINAL_STATUSES.includes(inquiry.status);
    const cardStyle = isTerminal
      ? STATUS_CARD_STYLES[inquiry.status]
      : 'bg-white border-gray-200 hover:bg-gray-50';
    const pendingConversion = needsStudentConversion(inquiry);

    return (
    <button
      key={inquiry.id}
      type="button"
      draggable={viewMode === 'board'}
      onDragStart={(e) => e.dataTransfer.setData('inquiryId', String(inquiry.id))}
      onClick={() => setSelectedInquiryId(inquiry.id)}
      className={`w-full text-left border rounded-lg p-3 shadow-sm hover:shadow-md transition-all ${cardStyle}`}
    >
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="font-medium text-sm text-gray-900">{inquiryStudentName(inquiry)}</p>
          {pendingConversion && (
            <span className="relative shrink-0 group/convert">
              <FiAlertCircle
                className="text-amber-600"
                size={14}
                aria-label="Conversion pending"
              />
              <span
                role="tooltip"
                className="absolute right-full top-1/2 z-50 mr-2 w-max max-w-[200px] -translate-y-1/2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800 shadow-lg opacity-0 pointer-events-none transition-opacity group-hover/convert:opacity-100"
              >
                Still need to convert to student
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {(options?.showStatusBadge || isTerminal) && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[inquiry.status]}`}
            >
              {STATUS_LABELS[inquiry.status]}
            </span>
          )}
          {inquiry.priority === 'high' && (
            <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded">High</span>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-1">{inquiry.parent_name}</p>
      <p className="text-xs text-gray-500">{inquiry.parent_phone}</p>
      {(() => {
        const classInfo = inquiryClassDisplay(inquiry);
        return classInfo.name ? (
          <p className="text-xs text-primary-600 mt-1">
            {classInfo.prefix}: {classInfo.name}
          </p>
        ) : null;
      })()}
      {inquiry.follow_up_date && !isTerminal && (
        <p className="text-xs text-amber-700 mt-1">
          Follow-up: {new Date(inquiry.follow_up_date).toLocaleDateString()}
        </p>
      )}
    </button>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 min-w-0 w-full max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-xl text-gray-900 flex items-center gap-2">
            <h1 className="text-xl text-gray-900 flex items-center gap-2">
              <FiClipboard className="text-primary-600" />
              Admission Inquiries
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Track leads from first contact through enrollment
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              className="p-2 border rounded-lg hover:bg-gray-50"
              title="Refresh"
            >
              <FiRefreshCw size={18} />
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
            >
              <FiPlus size={16} />
              New Inquiry
            </button>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase">Active leads</p>
              <p className="text-xl text-gray-900">{stats.active}</p>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase">Follow-up today</p>
              <p className="text-xl text-amber-600">{stats.follow_up_today}</p>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase">New this week</p>
              <p className="text-xl text-blue-600">{stats.new_this_week}</p>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase">Total inquiries</p>
              <p className="text-xl text-gray-900">{stats.total}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, inquiry #..."
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <div className="flex border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode('board')}
                className={`p-2 ${viewMode === 'board' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-50'}`}
                title="Board view"
              >
                <FiLayout size={18} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-50'}`}
                title="List view"
              >
                <FiList size={18} />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading inquiries...</p>
        ) : viewMode === 'board' && !statusFilter ? (
          <div className="w-full max-w-full min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {PIPELINE_STATUSES.map((status) => (
                <div
                  key={status}
                  className={`min-w-0 bg-gray-50 rounded-lg p-3 ${status === 'registered' ? 'overflow-visible' : ''}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = parseInt(e.dataTransfer.getData('inquiryId'), 10);
                    if (id) handleStatusDrop(id, status);
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-semibold text-gray-700">
                        {STATUS_LABELS[status]}
                      </h3>
                      {status === 'registered' &&
                        (boardColumns.registered?.some(needsStudentConversion) ?? false) && (
                          <span className="relative shrink-0 group/register">
                            <FiAlertCircle
                              className="text-amber-600"
                              size={14}
                              aria-label="Conversion pending"
                            />
                            <span
                              role="tooltip"
                              className="absolute right-full top-1/2 z-50 mr-2 w-max max-w-[240px] -translate-y-1/2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800 shadow-lg opacity-0 pointer-events-none transition-opacity group-hover/register:opacity-100"
                            >
                              Registered leads still need to be converted to students
                            </span>
                          </span>
                        )}
                    </div>
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                      {boardColumns[status]?.length || 0}
                    </span>
                  </div>
                  <div className="space-y-2 min-h-[120px]">
                    {(boardColumns[status] || []).map((inquiry) => renderCard(inquiry))}
                  </div>
                </div>
              ))}
            </div>
            {hasTerminalInquiries && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-600 mb-3">
                  Closed pipeline
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {TERMINAL_STATUSES.map((status) => (
                    <div
                      key={status}
                      className={`min-w-0 rounded-lg p-3 ${TERMINAL_COLUMN_STYLES[status]}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-700">
                          {STATUS_LABELS[status]}
                        </h4>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status]}`}
                        >
                          {terminalColumns[status]?.length || 0}
                        </span>
                      </div>
                      <div className="space-y-2 min-h-[80px]">
                        {(terminalColumns[status] || []).map((inquiry) =>
                          renderCard(inquiry, { showStatusBadge: true })
                        )}
                        {(terminalColumns[status]?.length ?? 0) === 0 && (
                          <p className="text-xs text-gray-400 py-4 text-center">None</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white border rounded-lg overflow-x-auto max-w-full">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Inquiry</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Student</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Parent</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Class</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Follow-up</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map((inquiry) => (
                  <tr
                    key={inquiry.id}
                    onClick={() => setSelectedInquiryId(inquiry.id)}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono text-xs">{inquiry.inquiry_number}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span>{inquiryStudentName(inquiry)}</span>
                        {needsStudentConversion(inquiry) && (
                          <span className="relative shrink-0 group/convert">
                            <FiAlertCircle
                              className="text-amber-600"
                              size={14}
                              aria-label="Conversion pending"
                            />
                            <span
                              role="tooltip"
                              className="absolute right-full top-1/2 z-50 mr-2 w-max max-w-[200px] -translate-y-1/2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800 shadow-lg opacity-0 pointer-events-none transition-opacity group-hover/convert:opacity-100"
                            >
                              Still need to convert to student
                            </span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{inquiry.parent_name}</div>
                      <div className="text-xs text-gray-500">{inquiry.parent_phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const classInfo = inquiryClassDisplay(inquiry);
                        return classInfo.name
                          ? `${classInfo.prefix}: ${classInfo.name}`
                          : '—';
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[inquiry.status]}`}
                      >
                        {STATUS_LABELS[inquiry.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {inquiry.follow_up_date
                        ? new Date(inquiry.follow_up_date).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                ))}
                {inquiries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      No inquiries yet. Create one to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddInquiryModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={refresh}
        classes={classes}
      />

      <InquiryDetailModal
        inquiryId={selectedInquiryId}
        isOpen={selectedInquiryId !== null}
        onClose={() => setSelectedInquiryId(null)}
        onUpdated={refresh}
        classes={classes}
      />
    </DashboardLayout>
  );
}
