'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import AddInquiryModal from '@/features/admissions/components/AddInquiryModal';
import InquiryDetailModal, {
  type Inquiry,
} from '@/features/admissions/components/InquiryDetailModal';
import InquiryKanbanBoard from '@/features/admissions/components/InquiryKanbanBoard';
import InquiryStatStrip from '@/features/admissions/components/InquiryStatStrip';
import type { InquiryStatus } from '@/lib/admission-inquiry-api';
import {
  PIPELINE_STATUSES,
  STATUS_COLORS,
  STATUS_LABELS,
  TERMINAL_STATUSES,
  formatInquiryNumber,
  inquiryClassDisplay,
  inquiryStudentName,
} from '@/features/admissions/utils/inquiry-labels';
import {
  FiAlertCircle,
  FiClipboard,
  FiFilter,
  FiInfo,
  FiLayout,
  FiList,
  FiPlus,
  FiRefreshCw,
  FiSearch,
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
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalStatus, setAddModalStatus] = useState<InquiryStatus>('new');
  const [selectedInquiryId, setSelectedInquiryId] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<InquiryStatus | null>(null);

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
      if (priorityFilter) params.set('priority', priorityFilter);
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/admissions/inquiries?${params}`);
      const data = await res.json();
      if (data.success) setInquiries(data.data);
    } catch {
      console.error('Failed to fetch inquiries');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, priorityFilter]);

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
    for (const status of PIPELINE_STATUSES) grouped[status] = [];
    for (const inquiry of inquiries) {
      if (PIPELINE_STATUSES.includes(inquiry.status)) {
        grouped[inquiry.status].push(inquiry);
      }
    }
    return grouped;
  }, [inquiries]);

  const terminalColumns = useMemo(() => {
    const grouped: Record<string, Inquiry[]> = {};
    for (const status of TERMINAL_STATUSES) grouped[status] = [];
    for (const inquiry of inquiries) {
      if (TERMINAL_STATUSES.includes(inquiry.status)) {
        grouped[inquiry.status].push(inquiry);
      }
    }
    return grouped;
  }, [inquiries]);

  const handleStatusDrop = async (inquiryId: number, newStatus: InquiryStatus) => {
    setDraggingId(null);
    setDragOverColumn(null);

    const inquiry = inquiries.find((item) => item.id === inquiryId);
    if (!inquiry || inquiry.status === newStatus) return;

    setInquiries((prev) =>
      prev.map((item) => (item.id === inquiryId ? { ...item, status: newStatus } : item)),
    );

    try {
      const res = await fetch(`/api/admissions/inquiries/${inquiryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchStats();
      } else {
        refresh();
      }
    } catch {
      refresh();
    }
  };

  const needsStudentConversion = (inquiry: Inquiry) =>
    inquiry.status === 'registered' && !inquiry.converted_student_id;

  const openAddModal = (status: InquiryStatus = 'new') => {
    setAddModalStatus(status);
    setShowAddModal(true);
  };

  const handleStatClick = (status: InquiryStatus | '') => {
    setStatusFilter((prev) => (prev === status ? '' : status));
    if (
      status &&
      TERMINAL_STATUSES.includes(status as (typeof TERMINAL_STATUSES)[number])
    ) {
      setViewMode('list');
    }
  };

  const handleViewAllClosed = (status: InquiryStatus) => {
    setStatusFilter(status);
    setViewMode('list');
  };

  const showBoard = viewMode === 'board' && !statusFilter && !priorityFilter;

  return (
    <DashboardLayout>
      <div className="space-y-3 min-w-0 w-full max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FiClipboard className="text-primary-600 shrink-0" size={20} />
              Admission Inquiries
              <span
                className="text-gray-400 cursor-help"
                title="Drag cards between columns to update pipeline status"
              >
                <FiInfo size={14} />
              </span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Track leads from first contact through enrollment
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={refresh}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
              title="Refresh"
            >
              <FiRefreshCw size={16} />
            </button>
            <button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-medium transition-colors ${
                showFilters || priorityFilter
                  ? 'border-primary-300 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FiFilter size={14} />
              Filters
            </button>
            <button
              type="button"
              onClick={() => openAddModal('new')}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-xs font-semibold"
            >
              <FiPlus size={14} />
              New Inquiry
            </button>
          </div>
        </div>

        {stats && (
          <InquiryStatStrip
            stats={stats}
            activeStatus={statusFilter}
            onStatusClick={handleStatClick}
          />
        )}

        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative flex-1">
              <FiSearch
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                size={14}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone, inquiry #..."
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs bg-white min-w-[8rem]"
              >
                <option value="">All statuses</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setViewMode('board')}
                  className={`p-2 ${viewMode === 'board' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-50 text-gray-600'}`}
                  title="Board view"
                >
                  <FiLayout size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-50 text-gray-600'}`}
                  title="List view"
                >
                  <FiList size={15} />
                </button>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2">
              <span className="text-[10px] font-semibold uppercase text-gray-500">Priority</span>
              {['', 'high', 'normal', 'low'].map((value) => (
                <button
                  key={value || 'all'}
                  type="button"
                  onClick={() => setPriorityFilter(value)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    priorityFilter === value
                      ? 'bg-primary-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {value === '' ? 'All' : value.charAt(0).toUpperCase() + value.slice(1)}
                </button>
              ))}
              {(statusFilter || priorityFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('');
                    setPriorityFilter('');
                  }}
                  className="ml-auto text-[11px] text-primary-600 hover:text-primary-800 font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-xs text-gray-500">Loading inquiries...</p>
          </div>
        ) : showBoard ? (
          <InquiryKanbanBoard
            boardColumns={boardColumns}
            terminalColumns={terminalColumns}
            draggingId={draggingId}
            dragOverColumn={dragOverColumn}
            onDragStart={setDraggingId}
            onDragEnd={() => {
              setDraggingId(null);
              setDragOverColumn(null);
            }}
            onDragOverColumn={setDragOverColumn}
            onDrop={handleStatusDrop}
            onOpenInquiry={setSelectedInquiryId}
            onAddInquiry={openAddModal}
            onViewAllClosed={handleViewAllClosed}
            needsStudentConversion={needsStudentConversion}
          />
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full text-xs min-w-[720px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Inquiry</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Student</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Parent</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Class</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Follow-up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {inquiries.map((inquiry) => (
                  <tr
                    key={inquiry.id}
                    onClick={() => setSelectedInquiryId(inquiry.id)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-3 py-2 font-mono text-[11px] text-gray-500">
                      {formatInquiryNumber(inquiry.inquiry_number)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-gray-900">
                          {inquiryStudentName(inquiry)}
                        </span>
                        {needsStudentConversion(inquiry) && (
                          <FiAlertCircle className="text-amber-500 shrink-0" size={13} />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-gray-800">{inquiry.parent_name}</div>
                      <div className="text-[11px] text-gray-500">{inquiry.parent_phone}</div>
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {(() => {
                        const classInfo = inquiryClassDisplay(inquiry);
                        return classInfo.name ? classInfo.name : '—';
                      })()}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[inquiry.status]}`}
                      >
                        {STATUS_LABELS[inquiry.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">
                      {inquiry.follow_up_date
                        ? new Date(inquiry.follow_up_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                  </tr>
                ))}
                {inquiries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-gray-400">
                      No inquiries match your filters.
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
        defaultStatus={addModalStatus}
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
