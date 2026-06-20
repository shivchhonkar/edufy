'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { useDialog } from '@/shared/context/DialogContext';
import { studentFullName } from '@/features/students/utils/student-profile';
import {
  FiArrowRight,
  FiCheckSquare,
  FiRefreshCw,
  FiSearch,
  FiSquare,
  FiUsers,
} from 'react-icons/fi';

interface Class {
  id: number;
  name: string;
  academic_year: string;
}

interface Section {
  id: number;
  class_id: number;
  name: string;
}

interface AcademicYear {
  id: number;
  name: string;
  is_active: boolean;
}

interface EligibleStudent {
  id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  admission_number: string;
  roll_number: string | null;
  class_name: string | null;
  section_name: string | null;
}

type PromotionAction = 'promoted' | 'repeated' | 'transferred';

const PROMOTION_OPTIONS: { value: PromotionAction; label: string }[] = [
  { value: 'promoted', label: 'Promote' },
  { value: 'repeated', label: 'Repeat' },
  { value: 'transferred', label: 'Transfer' },
];

const selectClass =
  'w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500';

function suggestNextClassId(classes: Class[], sourceClassId: string): string {
  const source = classes.find((c) => c.id.toString() === sourceClassId);
  if (!source) return '';
  const match = source.name.match(/(\d+)/);
  if (!match) return '';
  const nextNum = parseInt(match[1], 10) + 1;
  const next = classes.find((c) => /\d+/.test(c.name) && c.name.match(/(\d+)/)?.[1] === String(nextNum));
  return next ? String(next.id) : '';
}

export default function PromotionsPage() {
  const { confirm } = useDialog();
  const [classes, setClasses] = useState<Class[]>([]);
  const [sourceSections, setSourceSections] = useState<Section[]>([]);
  const [targetSections, setTargetSections] = useState<Section[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);

  const [sourceClassId, setSourceClassId] = useState('');
  const [sourceSectionId, setSourceSectionId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [targetSectionId, setTargetSectionId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [promotionAction, setPromotionAction] = useState<PromotionAction>('promoted');
  const [preserveRollNumbers, setPreserveRollNumbers] = useState(true);
  const [studentSearch, setStudentSearch] = useState('');

  const [students, setStudents] = useState<EligibleStudent[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const activeAcademicYear = useMemo(
    () => academicYears.find((y) => y.is_active),
    [academicYears],
  );

  const sourceClass = classes.find((c) => c.id.toString() === sourceClassId);
  const targetClass = classes.find((c) => c.id.toString() === targetClassId);
  const sourceClassName = sourceClass?.name;
  const targetClassName = targetClass?.name;
  const sourceSectionName = sourceSections.find((s) => s.id.toString() === sourceSectionId)?.name;
  const targetSectionName = targetSections.find((s) => s.id.toString() === targetSectionId)?.name;
  const targetYearName =
    academicYears.find((y) => y.id.toString() === academicYearId)?.name ||
    activeAcademicYear?.name;

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const name = studentFullName(s).toLowerCase();
      return (
        name.includes(q) ||
        s.admission_number.toLowerCase().includes(q) ||
        (s.roll_number || '').toLowerCase().includes(q)
      );
    });
  }, [students, studentSearch]);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch('/api/classes');
      const data = await res.json();
      if (data.success) setClasses(data.data);
    } catch {
      console.error('Failed to fetch classes');
    }
  }, []);

  const fetchAcademicYears = useCallback(async () => {
    try {
      const res = await fetch('/api/academic-years');
      const data = await res.json();
      if (data.success) {
        setAcademicYears(data.data);
        const active = data.data.find((y: AcademicYear) => y.is_active);
        if (active) setAcademicYearId(String(active.id));
      }
    } catch {
      console.error('Failed to fetch academic years');
    }
  }, []);

  const fetchSections = useCallback(async (classId: string, target: 'source' | 'target') => {
    if (!classId) {
      if (target === 'source') setSourceSections([]);
      else setTargetSections([]);
      return;
    }
    try {
      const res = await fetch(`/api/sections?class_id=${classId}`);
      const data = await res.json();
      if (data.success) {
        if (target === 'source') setSourceSections(data.data);
        else setTargetSections(data.data);
      }
    } catch {
      console.error('Failed to fetch sections');
    }
  }, []);

  const fetchEligibleStudents = useCallback(async () => {
    if (!sourceClassId) {
      setStudents([]);
      setSelectedIds(new Set());
      return;
    }

    setLoadingStudents(true);
    setError('');
    setSuccessMessage('');
    try {
      let url = `/api/promotions/eligible?class_id=${sourceClassId}`;
      if (sourceSectionId) url += `&section_id=${sourceSectionId}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setStudents(data.data);
        setSelectedIds(new Set(data.data.map((s: EligibleStudent) => s.id)));
      } else {
        setStudents([]);
        setSelectedIds(new Set());
        setError(data.error || 'Failed to load students');
      }
    } catch {
      setError('Failed to load students');
      setStudents([]);
      setSelectedIds(new Set());
    } finally {
      setLoadingStudents(false);
    }
  }, [sourceClassId, sourceSectionId]);

  useEffect(() => {
    fetchClasses();
    fetchAcademicYears();
  }, [fetchClasses, fetchAcademicYears]);

  useEffect(() => {
    fetchSections(sourceClassId, 'source');
    setSourceSectionId('');
  }, [sourceClassId, fetchSections]);

  useEffect(() => {
    fetchSections(targetClassId, 'target');
    setTargetSectionId('');
  }, [targetClassId, fetchSections]);

  useEffect(() => {
    fetchEligibleStudents();
  }, [fetchEligibleStudents]);

  useEffect(() => {
    if (promotionAction === 'repeated' && sourceClassId) {
      setTargetClassId(sourceClassId);
      setTargetSectionId(sourceSectionId);
    }
  }, [promotionAction, sourceClassId, sourceSectionId]);

  useEffect(() => {
    if (promotionAction !== 'promoted' || !sourceClassId) return;
    const suggested = suggestNextClassId(classes, sourceClassId);
    if (suggested) setTargetClassId(suggested);
  }, [sourceClassId, classes, promotionAction]);

  const toggleStudent = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    const visibleIds = filteredStudents.map((s) => s.id);
    const allVisibleSelected = visibleIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const canSubmit =
    sourceClassId && targetClassId && academicYearId && selectedIds.size > 0 && !submitting;

  const actionLabel =
    promotionAction === 'promoted'
      ? 'Promote'
      : promotionAction === 'repeated'
        ? 'Repeat'
        : 'Transfer';

  const buildConfirmMessage = () =>
    `${actionLabel} ${selectedIds.size} student(s) from ${sourceClassName || 'source class'}${sourceSectionName ? `-${sourceSectionName}` : ''} to ${targetClassName || 'target class'}${targetSectionName ? `-${targetSectionName}` : ''} for ${targetYearName || 'selected year'}?\n\nThis updates enrollment history and current class assignments. This action cannot be undone easily.`;

  const requestActionChange = async (next: PromotionAction) => {
    if (next === promotionAction) return;

    if (next === 'promoted' || next === 'transferred') {
      const label = next === 'promoted' ? 'Promote' : 'Transfer';
      const ok = await confirm(
        `Switch to "${label}" action? The target class will be updated based on this choice.`,
        {
          title: `Switch to ${label}?`,
          type: 'warning',
          confirmText: `Yes, use ${label}`,
          cancelText: 'Cancel',
        },
      );
      if (!ok) return;
    }

    setPromotionAction(next);
  };

  const requestSubmit = async () => {
    if (!canSubmit) return;

    const ok = await confirm(buildConfirmMessage(), {
      title: `Confirm ${actionLabel}`,
      type: promotionAction === 'transferred' ? 'danger' : 'warning',
      confirmText: `Yes, ${actionLabel}`,
      cancelText: 'Cancel',
    });
    if (!ok) return;

    await handlePromote();
  };

  const handlePromote = async () => {
    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/promotions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_ids: Array.from(selectedIds),
          source_class_id: parseInt(sourceClassId, 10),
          source_section_id: sourceSectionId ? parseInt(sourceSectionId, 10) : null,
          target_class_id: parseInt(targetClassId, 10),
          target_section_id: targetSectionId ? parseInt(targetSectionId, 10) : null,
          academic_year_id: parseInt(academicYearId, 10),
          promotion_action: promotionAction,
          preserve_roll_numbers: preserveRollNumbers,
        }),
      });

      const data = await res.json();
      if (data.success || data.data?.promoted > 0) {
        setSuccessMessage(data.message || `${actionLabel}d ${data.data.promoted} student(s)`);
        await fetchEligibleStudents();
      } else {
        setError(data.error || 'Promotion failed');
      }
    } catch {
      setError('Promotion failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const allVisibleSelected =
    filteredStudents.length > 0 && filteredStudents.every((s) => selectedIds.has(s.id));

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Promotion Management</h1>
            <p className="text-xs text-gray-500">
              Bulk promote, repeat, or transfer students and update enrollment history.
            </p>
          </div>
          {sourceClassId && students.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                {students.length} students
              </span>
              <span className="rounded-full bg-primary-50 px-2 py-0.5 text-primary-700 font-medium">
                {selectedIds.size} selected
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-md text-xs">
            {successMessage}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,220px)_1fr] divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
            <div className="p-3 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Source
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-gray-500 mb-0.5">Class</label>
                  <select
                    value={sourceClassId}
                    onChange={(e) => setSourceClassId(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-0.5">Section</label>
                  <select
                    value={sourceSectionId}
                    onChange={(e) => setSourceSectionId(e.target.value)}
                    disabled={!sourceClassId}
                    className={selectClass}
                  >
                    <option value="">All sections</option>
                    {sourceSections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {sourceClass && (
                <p className="text-[11px] text-gray-500">
                  Session: {sourceClass.academic_year || '—'}
                  {students.length > 0 && (
                    <span className="ml-2 text-green-700 font-medium">
                      · {students.length} found
                    </span>
                  )}
                </p>
              )}
            </div>

            <div className="p-3 space-y-2 bg-gray-50/60">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Action
              </p>
              <div className="flex rounded-md border border-gray-200 bg-white p-0.5">
                {PROMOTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => requestActionChange(opt.value)}
                    className={`flex-1 rounded px-1 py-1 text-[11px] font-medium transition-colors ${
                      promotionAction === opt.value
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-0.5">Target year</label>
                <select
                  value={academicYearId}
                  onChange={(e) => setAcademicYearId(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select year</option>
                  {academicYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name}
                      {year.is_active ? ' (Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preserveRollNumbers}
                  onChange={(e) => setPreserveRollNumbers(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                Preserve roll numbers
              </label>
            </div>

            <div className="p-3 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Target
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-gray-500 mb-0.5">Class</label>
                  <select
                    value={targetClassId}
                    onChange={(e) => setTargetClassId(e.target.value)}
                    disabled={promotionAction === 'repeated'}
                    className={selectClass}
                  >
                    <option value="">Select class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-0.5">Section</label>
                  <select
                    value={targetSectionId}
                    onChange={(e) => setTargetSectionId(e.target.value)}
                    disabled={!targetClassId || promotionAction === 'repeated'}
                    className={selectClass}
                  >
                    <option value="">No section</option>
                    {targetSections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {sourceClassName && targetClassName && (
                <div className="flex items-center gap-1.5 text-[11px] text-gray-600 bg-primary-50/50 rounded px-2 py-1">
                  <span className="font-medium truncate">
                    {sourceClassName}
                    {sourceSectionName ? `-${sourceSectionName}` : ''}
                  </span>
                  <FiArrowRight className="shrink-0 text-primary-600" size={12} />
                  <span className="font-medium truncate">
                    {targetClassName}
                    {targetSectionName ? `-${targetSectionName}` : ''}
                  </span>
                  {targetYearName && (
                    <span className="ml-auto shrink-0 text-gray-400">{targetYearName}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <FiUsers className="text-primary-600 shrink-0" size={14} />
              <span className="text-sm font-semibold text-gray-900">Students</span>
              <span className="text-xs text-gray-500">
                ({selectedIds.size}/{students.length})
              </span>
            </div>

            <div className="relative flex-1 min-w-[140px] max-w-xs">
              <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search name, admission, roll..."
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <button
                type="button"
                onClick={fetchEligibleStudents}
                disabled={!sourceClassId || loadingStudents}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                <FiRefreshCw size={12} className={loadingStudents ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                type="button"
                onClick={requestSubmit}
                disabled={!canSubmit}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting
                  ? 'Processing...'
                  : `${actionLabel} ${selectedIds.size} student${selectedIds.size === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>

          {!sourceClassId ? (
            <div className="text-center py-10 text-gray-500 text-xs">
              Select a source class to load students.
            </div>
          ) : loadingStudents ? (
            <div className="text-center py-10 text-gray-500 text-xs">Loading students...</div>
          ) : students.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-xs">
              No active students found in the selected class/section.
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-xs">
              No students match your search.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[min(520px,60vh)] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-600 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left w-8">
                      <button type="button" onClick={toggleAllVisible} className="text-gray-600">
                        {allVisibleSelected ? (
                          <FiCheckSquare size={15} className="text-primary-600" />
                        ) : (
                          <FiSquare size={15} />
                        )}
                      </button>
                    </th>
                    <th className="px-3 py-2 text-left font-medium">Student</th>
                    <th className="px-3 py-2 text-left font-medium hidden sm:table-cell">
                      Admission No.
                    </th>
                    <th className="px-3 py-2 text-left font-medium w-16">Roll</th>
                    <th className="px-3 py-2 text-left font-medium hidden md:table-cell">Class</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50/80">
                      <td className="px-3 py-1.5">
                        <button
                          type="button"
                          onClick={() => toggleStudent(student.id)}
                          className="text-gray-600"
                        >
                          {selectedIds.has(student.id) ? (
                            <FiCheckSquare size={15} className="text-primary-600" />
                          ) : (
                            <FiSquare size={15} />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-1.5 font-medium text-gray-900">
                        {studentFullName(student)}
                        <span className="sm:hidden block text-[10px] font-normal text-gray-500">
                          {student.admission_number}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-gray-600 hidden sm:table-cell">
                        {student.admission_number}
                      </td>
                      <td className="px-3 py-1.5 text-gray-600">{student.roll_number || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-600 hidden md:table-cell">
                        {student.class_name || '—'}
                        {student.section_name ? ` · ${student.section_name}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
