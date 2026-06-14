'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';
import { studentFullName } from '@/features/students/utils/student-profile';
import { FiArrowRight, FiCheckSquare, FiRefreshCw, FiSquare, FiUsers } from 'react-icons/fi';

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

const PROMOTION_OPTIONS: { value: PromotionAction; label: string; description: string }[] = [
  {
    value: 'promoted',
    label: 'Promote',
    description: 'Move students to the next class for a new session',
  },
  {
    value: 'repeated',
    label: 'Repeat',
    description: 'Keep students in the same class for the new session',
  },
  {
    value: 'transferred',
    label: 'Transfer',
    description: 'Move students to a different class (lateral transfer)',
  },
];

export default function PromotionsPage() {
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

  const [students, setStudents] = useState<EligibleStudent[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const activeAcademicYear = useMemo(
    () => academicYears.find((y) => y.is_active),
    [academicYears]
  );

  const sourceClassName = classes.find((c) => c.id.toString() === sourceClassId)?.name;
  const targetClassName = classes.find((c) => c.id.toString() === targetClassId)?.name;
  const targetYearName =
    academicYears.find((y) => y.id.toString() === academicYearId)?.name ||
    activeAcademicYear?.name;

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

  const toggleStudent = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === students.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map((s) => s.id)));
    }
  };

  const canSubmit =
    sourceClassId &&
    targetClassId &&
    academicYearId &&
    selectedIds.size > 0 &&
    !submitting;

  const handlePromote = async () => {
    setShowConfirm(false);
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
        setSuccessMessage(data.message || `Promoted ${data.data.promoted} student(s)`);
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

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl text-gray-900">Promotion Management</h1>
          <p className="text-gray-600 mt-1">
            Bulk promote, repeat, or transfer students and update academic enrollment history.
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Source */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Source
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <select
                  value={sourceClassId}
                  onChange={(e) => setSourceClassId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section (optional)
                </label>
                <select
                  value={sourceSectionId}
                  onChange={(e) => setSourceSectionId(e.target.value)}
                  disabled={!sourceClassId}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
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
          </div>

          {/* Action */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Action
            </h2>
            <div className="space-y-3">
              {PROMOTION_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    promotionAction === opt.value
                      ? 'border-primary-400 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="promotion_action"
                    value={opt.value}
                    checked={promotionAction === opt.value}
                    onChange={() => setPromotionAction(opt.value)}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                  </div>
                </label>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target academic year
                </label>
                <select
                  value={academicYearId}
                  onChange={(e) => setAcademicYearId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
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
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={preserveRollNumbers}
                  onChange={(e) => setPreserveRollNumbers(e.target.checked)}
                />
                Preserve roll numbers
              </label>
            </div>
          </div>

          {/* Target */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Target
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <select
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  disabled={promotionAction === 'repeated'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section (optional)
                </label>
                <select
                  value={targetSectionId}
                  onChange={(e) => setTargetSectionId(e.target.value)}
                  disabled={!targetClassId || promotionAction === 'repeated'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                >
                  <option value="">No section</option>
                  {targetSections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name}
                    </option>
                  ))}
                </select>
              </div>
              {sourceClassName && targetClassName && (
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                  <span className="font-medium">{sourceClassName}</span>
                  <FiArrowRight className="text-primary-600" />
                  <span className="font-medium">{targetClassName}</span>
                  {targetYearName && (
                    <span className="text-xs text-gray-500 ml-auto">{targetYearName}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Student list */}
        <div className="mt-6 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FiUsers className="text-primary-600" />
              <h2 className="font-semibold text-gray-900">
                Eligible Students
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({selectedIds.size} of {students.length} selected)
                </span>
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchEligibleStudents}
                disabled={!sourceClassId || loadingStudents}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <FiRefreshCw className={loadingStudents ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                disabled={!canSubmit}
                className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Processing...' : `Promote ${selectedIds.size} Student(s)`}
              </button>
            </div>
          </div>

          {!sourceClassId ? (
            <div className="text-center py-16 text-gray-500 text-sm">
              Select a source class to load students.
            </div>
          ) : loadingStudents ? (
            <div className="text-center py-16 text-gray-500 text-sm">Loading students...</div>
          ) : students.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">
              No active students found in the selected class/section.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-5 py-3 text-left w-10">
                      <button type="button" onClick={toggleAll} className="text-gray-600">
                        {selectedIds.size === students.length ? (
                          <FiCheckSquare size={18} />
                        ) : (
                          <FiSquare size={18} />
                        )}
                      </button>
                    </th>
                    <th className="px-5 py-3 text-left">Student</th>
                    <th className="px-5 py-3 text-left">Admission No.</th>
                    <th className="px-5 py-3 text-left">Roll No.</th>
                    <th className="px-5 py-3 text-left">Current Class</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() => toggleStudent(student.id)}
                          className="text-gray-600"
                        >
                          {selectedIds.has(student.id) ? (
                            <FiCheckSquare size={18} className="text-primary-600" />
                          ) : (
                            <FiSquare size={18} />
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {studentFullName(student)}
                      </td>
                      <td className="px-5 py-3 text-gray-600">{student.admission_number}</td>
                      <td className="px-5 py-3 text-gray-600">{student.roll_number || '—'}</td>
                      <td className="px-5 py-3 text-gray-600">
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

        <ConfirmDialog
          isOpen={showConfirm}
          title="Confirm Bulk Promotion"
          message={`Promote ${selectedIds.size} student(s) from ${sourceClassName || 'source class'} to ${targetClassName || 'target class'} for ${targetYearName || 'selected year'}? This updates enrollment history and current class assignments.`}
          confirmText="Yes, Promote"
          cancelText="Cancel"
          type="warning"
          onConfirm={handlePromote}
          onCancel={() => setShowConfirm(false)}
        />
      </div>
    </DashboardLayout>
  );
}
