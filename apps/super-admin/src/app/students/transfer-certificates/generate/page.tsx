'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Suspense } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import VirtualizedStudentSelectTable from '@/features/students/components/VirtualizedStudentSelectTable';
import { usePreselectStudentIdsFromUrl } from '@/features/students/hooks/usePreselectStudentFromUrl';
import TransferCertificateModal from '@/features/students/components/TransferCertificateModal';
import type { TransferCertificateSchoolInfo } from '@/features/students/components/TransferCertificate';
import { useSettings } from '@/shared/SettingsContext';
import { useDialog } from '@/shared/context/DialogContext';
import type { Student } from '@/shared/types';
import {
  FiArrowLeft,
  FiChevronDown,
  FiChevronUp,
  FiFileText,
  FiFilter,
  FiClock,
  FiSearch,
  FiX,
} from 'react-icons/fi';

const STUDENTS_FETCH_LIMIT = 50000;
const UNASSIGNED_CLASS_FILTER = 'unassigned';

interface Class {
  id: number;
  name: string;
}

interface Section {
  id: number;
  class_id: number;
  name: string;
}

export default function GenerateTransferCertificatePage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center py-16 text-gray-500">Loading…</div>
        </DashboardLayout>
      }
    >
      <GenerateTransferCertificatePageContent />
    </Suspense>
  );
}

function GenerateTransferCertificatePageContent() {
  const { alert } = useDialog();
  const { settings } = useSettings();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [showTcModal, setShowTcModal] = useState(false);
  const [reportSettings, setReportSettings] = useState<{
    counsellor_name?: string;
    counsellor_signature_url?: string;
  }>({});

  useEffect(() => {
    fetch('/api/settings/reports')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setReportSettings(d.data);
      })
      .catch(console.error);
  }, []);

  const tcSchoolInfo: TransferCertificateSchoolInfo = useMemo(
    () => ({
      name: settings.school_name || 'School',
      address: settings.school_address || undefined,
      logoUrl: settings.logo_url || undefined,
      academicYear: settings.academic_year
        ? `Academic Year ${settings.academic_year}`
        : undefined,
      phone: settings.school_phone || undefined,
      email: settings.school_email || undefined,
      principalName: reportSettings.counsellor_name || undefined,
      signatureUrl: reportSettings.counsellor_signature_url || undefined,
    }),
    [settings, reportSettings]
  );

  const selectedStudents = useMemo(
    () => students.filter((s) => selectedIds.has(s.id)),
    [students, selectedIds]
  );

  usePreselectStudentIdsFromUrl(students, setSelectedIds);

  useEffect(() => {
    fetch('/api/classes')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setClasses(d.data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (classFilter && classFilter !== UNASSIGNED_CLASS_FILTER) {
      fetch(`/api/sections?class_id=${classFilter}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setSections(d.data);
        })
        .catch(console.error);
    } else {
      setSections([]);
      setSectionFilter('');
    }
  }, [classFilter]);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          search,
          limit: String(STUDENTS_FETCH_LIMIT),
          page: '1',
        });
        if (classFilter) params.set('class_id', classFilter);
        if (sectionFilter && classFilter !== UNASSIGNED_CLASS_FILTER) {
          params.set('section_id', sectionFilter);
        }

        const response = await fetch(`/api/students?${params}`);
        const data = await response.json();
        if (data.success) {
          setStudents(data.data);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [search, classFilter, sectionFilter]);

  const toggleStudent = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (ids: number[], select: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (select) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const handleGenerateTc = async () => {
    if (selectedStudents.length === 0) {
      await alert('Select at least one student to generate a Transfer Certificate.', {
        title: 'No selection',
        type: 'warning',
      });
      return;
    }
    setShowTcModal(true);
  };

  const hasActiveFilters = Boolean(search || classFilter || sectionFilter);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href="/students"
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-1"
            >
              <FiArrowLeft size={14} /> Students
            </Link>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FiFileText className="text-primary-600" />
              Generate Transfer Certificate
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Select students, configure TC details, and print official transfer certificates.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/students/transfer-certificates"
              className="border px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
            >
              <FiClock size={16} />
              TC History
            </Link>
            <button
              type="button"
              onClick={handleGenerateTc}
              disabled={selectedStudents.length === 0}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm disabled:opacity-40"
            >
              <FiFileText size={16} />
              Generate TC
              {selectedStudents.length > 0 ? ` (${selectedStudents.length})` : ''}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setFiltersExpanded((p) => !p)}
            className={`border px-3 py-2 rounded-lg flex items-center gap-2 text-sm ${
              hasActiveFilters
                ? 'border-primary-300 bg-primary-50 text-primary-700'
                : 'hover:bg-gray-50'
            }`}
          >
            <FiFilter size={15} />
            Filters
            {filtersExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
          </button>

          {filtersExpanded && (
            <div className="bg-white border rounded-lg px-4 py-3 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2 relative">
                <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search name or admission no..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm text-gray-900"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="border rounded-lg px-3 py-2 text-sm text-gray-900"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              >
                <option value="">All Classes</option>
                <option value={UNASSIGNED_CLASS_FILTER}>Unassigned</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                className="border rounded-lg px-3 py-2 text-sm text-gray-900"
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                disabled={!classFilter || classFilter === UNASSIGNED_CLASS_FILTER}
              >
                <option value="">All Sections</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setClassFilter('');
                    setSectionFilter('');
                  }}
                  className="md:col-span-4 text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
                >
                  <FiX size={14} /> Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
            </div>
          ) : (
            <VirtualizedStudentSelectTable
              students={students}
              selectedIds={selectedIds}
              onToggle={toggleStudent}
              onToggleAll={toggleAll}
            />
          )}
        </div>
      </div>

      <TransferCertificateModal
        isOpen={showTcModal}
        onClose={() => setShowTcModal(false)}
        students={selectedStudents}
        school={tcSchoolInfo}
      />
    </DashboardLayout>
  );
}
