'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AlumniIdCard from '@/features/alumni/components/AlumniIdCard';
import { buildStudentIdCardSchoolInfo } from '@/features/students/utils/student-id-card-school-info';
import { useSettings } from '@/shared/SettingsContext';
import { useDialog } from '@/shared/context/DialogContext';
import type { AlumniDirectoryItem } from '@/lib/alumni-utils';
import type { Student } from '@/shared/types';
import { FiCreditCard, FiPrinter, FiSearch, FiX } from 'react-icons/fi';

export default function AlumniIdCardsTab() {
  const { alert } = useDialog();
  const { settings } = useSettings();
  const [items, setItems] = useState<AlumniDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
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

  const schoolInfo = useMemo(
    () => buildStudentIdCardSchoolInfo(settings, reportSettings),
    [settings, reportSettings]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '500' });
      if (search) params.set('search', search);
      const response = await fetch(`/api/alumni?${params}`);
      const data = await response.json();
      if (data.success) setItems(data.data.items);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedAlumni = useMemo(
    () => items.filter((item) => selectedIds.has(item.student_id)),
    [items, selectedIds]
  );

  const toggle = (studentId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else {
        if (next.size >= 10) return prev;
        next.add(studentId);
      }
      return next;
    });
  };

  const toStudent = (item: AlumniDirectoryItem): Student & {
    batch_year?: string | null;
    last_class?: string | null;
    exit_date?: string | null;
  } => ({
    id: item.student_id,
    admission_number: item.admission_number,
    first_name: item.first_name,
    middle_name: item.middle_name,
    last_name: item.last_name,
    date_of_birth: new Date(),
    gender: item.gender || 'Male',
    admission_date: new Date(),
    status: item.student_status as Student['status'],
    photo_url: item.photo_url,
    parent_phone: item.current_phone,
    class_name: item.last_class,
    batch_year: item.batch_year,
    last_class: item.last_class,
    exit_date: item.exit_date,
  });

  const handlePrint = () => {
    if (selectedAlumni.length === 0) return;
    setShowPreview(true);
    window.setTimeout(() => {
      window.print();
    }, 400);
  };

  return (
    <>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #alumni-id-cards-print-root, #alumni-id-cards-print-root * { visibility: visible; }
          #alumni-id-cards-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 10mm;
            display: flex !important;
            flex-wrap: wrap;
            gap: 8mm;
          }
        }
      `}</style>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search alumni for ID cards..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (selectedAlumni.length === 0) {
                void alert('Select at least one alumni', { type: 'warning' });
                return;
              }
              setShowPreview(true);
            }}
            className="border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2"
          >
            <FiCreditCard size={15} />
            Preview ({selectedIds.size})
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={selectedIds.size === 0}
            className="bg-primary-600 text-white px-3 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm flex items-center gap-2"
          >
            <FiPrinter size={15} />
            Print
          </button>
        </div>

        <p className="text-xs text-gray-500">Select up to 10 alumni for ID card preview and print.</p>

        {loading ? (
          <div className="py-12 text-center text-gray-500 text-sm">Loading alumni…</div>
        ) : (
          <div className="border rounded-lg overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 w-10" />
                  <th className="text-left px-4 py-2">Alumni</th>
                  <th className="text-left px-4 py-2">Batch</th>
                  <th className="text-left px-4 py-2">Last Class</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.student_id)}
                        onChange={() => toggle(item.student_id)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <p className="font-medium">{item.full_name}</p>
                      <p className="text-xs text-gray-500">{item.admission_number}</p>
                    </td>
                    <td className="px-4 py-2">{item.batch_year || '—'}</td>
                    <td className="px-4 py-2">{item.last_class || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AppModal open={showPreview} onClose={() => setShowPreview(false)}>
        <div className={APP_MODAL_PANEL}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4 no-print">
            <div>
              <h3 className="text-lg font-medium">Alumni ID Cards</h3>
              <p className="text-sm text-gray-500">{selectedAlumni.length} selected</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handlePrint} className="bg-primary-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                <FiPrinter size={14} /> Print
              </button>
              <button type="button" onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-gray-700">
                <FiX size={18} />
              </button>
            </div>
          </div>
          <div id="alumni-id-cards-print-root" className="flex flex-wrap gap-6 justify-center">
            {selectedAlumni.map((item) => (
              <AlumniIdCard key={item.student_id} student={toStudent(item)} school={schoolInfo} />
            ))}
          </div>
        </div>
        </div>
      </AppModal>
    </>
  );
}
