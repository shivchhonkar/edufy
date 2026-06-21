'use client';

import { Fragment, useMemo, useRef } from 'react';
import {
  FiX,
  FiSave,
  FiUpload,
  FiDownload,
  FiCopy,
  FiMinusCircle,
  FiTrendingUp,
  FiUserX,
  FiCheckCircle,
} from 'react-icons/fi';
import ContentAreaModal from '@/shared/components/common/ContentAreaModal';
import { useDialog } from '@/shared/context/DialogContext';
import {
  downloadResultsTemplate,
  parseResultsImportCsv,
  type ResultInputRow,
} from '@/features/exams/utils/exam-results-import-export';

interface ExamSubject {
  subject_id: number;
  subject_name: string;
  total_marks: number;
  passing_marks: number;
}

interface Exam {
  id: number;
  name: string;
  class_id: number;
  class_name: string;
  subject_name?: string;
  subject_names?: string;
  subjects?: ExamSubject[];
  exam_type: string;
  exam_date: string;
  total_marks: number;
  passing_marks: number;
}

interface ExamSummary {
  id: number;
  name: string;
  class_id: number;
  exam_date: string;
}

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  roll_number: string;
  admission_number: string;
}

interface UploadResultsModalProps {
  show: boolean;
  exam: Exam | null;
  exams: ExamSummary[];
  students: Student[];
  resultInputs: Record<number, Record<number, ResultInputRow>>;
  onClose: () => void;
  onSave: () => void;
  onUpdateInput: (studentId: number, subjectId: number, field: 'marks' | 'absent' | 'remarks', value: string | boolean) => void;
  onReplaceInputs: (inputs: Record<number, Record<number, ResultInputRow>>) => void;
}

export default function UploadResultsModal({
  show,
  exam,
  exams,
  students,
  resultInputs,
  onClose,
  onSave,
  onUpdateInput,
  onReplaceInputs,
}: UploadResultsModalProps) {
  const { confirm, alert } = useDialog();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const examSubjects = useMemo<ExamSubject[]>(() => {
    if (!exam) return [];
    return exam.subjects?.length
      ? exam.subjects
      : [{
          subject_id: 0,
          subject_name: exam.subject_name || 'Subject',
          total_marks: exam.total_marks,
          passing_marks: exam.passing_marks,
        }];
  }, [exam]);

  const missingMarksCount = useMemo(() => {
    if (!exam) return 0;
    let count = 0;
    for (const student of students) {
      for (const sub of examSubjects) {
        const sid = sub.subject_id || 0;
        const input = resultInputs[student.id]?.[sid] || { marks: '', absent: false, remarks: '' };
        if (!input.absent && input.marks.trim() === '') {
          count += 1;
        }
      }
    }
    return count;
  }, [exam, students, examSubjects, resultInputs]);

  if (!exam) return null;

  const isMultiSubject = examSubjects.length > 1;

  const handleMarksChange = (
    studentId: number,
    subjectId: number,
    raw: string,
    maxMarks: number,
  ) => {
    if (raw === '') {
      onUpdateInput(studentId, subjectId, 'marks', '');
      return;
    }
    if (!/^\d*\.?\d*$/.test(raw)) return;

    const num = parseFloat(raw);
    if (!Number.isNaN(num)) {
      if (num > maxMarks) {
        onUpdateInput(studentId, subjectId, 'marks', String(maxMarks));
        return;
      }
      if (num < 0) {
        onUpdateInput(studentId, subjectId, 'marks', '0');
        return;
      }
    }
    onUpdateInput(studentId, subjectId, 'marks', raw);
  };

  const isMarksOverMax = (marks: string, maxMarks: number) => {
    if (marks === '') return false;
    const num = Number(marks);
    return !Number.isNaN(num) && num > maxMarks;
  };

  const handleAttemptClose = async () => {
    if (missingMarksCount === 0) {
      onClose();
      return;
    }

    const confirmed = await confirm(
      `${missingMarksCount} subject mark${missingMarksCount === 1 ? '' : 's'} ${missingMarksCount === 1 ? 'is' : 'are'} missing (not entered and not marked absent). Close without saving?`,
      {
        title: 'Missing marks',
        type: 'warning',
        confirmText: 'Close anyway',
        cancelText: 'Continue editing',
      },
    );

    if (confirmed) onClose();
  };

  const handleAttemptSave = async () => {
    if (missingMarksCount === 0) {
      onSave();
      return;
    }

    const confirmed = await confirm(
      `${missingMarksCount} subject mark${missingMarksCount === 1 ? '' : 's'} ${missingMarksCount === 1 ? 'is' : 'are'} missing (not entered and not marked absent). Save entered results anyway?`,
      {
        title: 'Missing marks',
        type: 'warning',
        confirmText: 'Save anyway',
        cancelText: 'Continue editing',
      },
    );

    if (confirmed) onSave();
  };

  const isMarksMissing = (input: ResultInputRow) => !input.absent && input.marks.trim() === '';

  const cloneInputs = () => JSON.parse(JSON.stringify(resultInputs)) as Record<
    number,
    Record<number,
    ResultInputRow
  >>;

  const handleMarkAllPresent = () => {
    const next = cloneInputs();
    for (const student of students) {
      for (const sub of examSubjects) {
        const sid = sub.subject_id || 0;
        const existing = next[student.id]?.[sid] || { marks: '', absent: false, remarks: '' };
        next[student.id] = next[student.id] || {};
        next[student.id][sid] = { ...existing, absent: false };
      }
    }
    onReplaceInputs(next);
  };

  const handleMarkAllAbsent = () => {
    const next = cloneInputs();
    for (const student of students) {
      for (const sub of examSubjects) {
        const sid = sub.subject_id || 0;
        const existing = next[student.id]?.[sid] || { marks: '', absent: false, remarks: '' };
        next[student.id] = next[student.id] || {};
        next[student.id][sid] = { ...existing, absent: true, marks: '' };
      }
    }
    onReplaceInputs(next);
  };

  const handleAutoFillZero = () => {
    const next = cloneInputs();
    for (const student of students) {
      for (const sub of examSubjects) {
        const sid = sub.subject_id || 0;
        const existing = next[student.id]?.[sid] || { marks: '', absent: false, remarks: '' };
        if (existing.absent) continue;
        next[student.id] = next[student.id] || {};
        next[student.id][sid] = {
          ...existing,
          marks: existing.marks.trim() === '' ? '0' : existing.marks,
          absent: false,
        };
      }
    }
    onReplaceInputs(next);
  };

  const handleAutoPass = () => {
    const next = cloneInputs();
    for (const student of students) {
      for (const sub of examSubjects) {
        const sid = sub.subject_id || 0;
        const existing = next[student.id]?.[sid] || { marks: '', absent: false, remarks: '' };
        if (existing.absent) continue;
        next[student.id] = next[student.id] || {};
        next[student.id][sid] = {
          ...existing,
          marks: String(sub.passing_marks),
          absent: false,
        };
      }
    }
    onReplaceInputs(next);
  };

  const handleExportTemplate = () => {
    downloadResultsTemplate(exam.name, students, examSubjects);
  };

  const handleImportFile = async (file: File) => {
    const text = await file.text();
    const { inputs, matchedRows, skippedRows } = parseResultsImportCsv(
      text,
      students,
      examSubjects,
      resultInputs,
    );

    if (matchedRows === 0) {
      await alert(
        'No matching students found in the file. Use the exported template and match by Admission Number or Roll Number.',
        { title: 'Import failed', type: 'warning' },
      );
      return;
    }

    onReplaceInputs(inputs);
    await alert(
      `Imported marks for ${matchedRows} student${matchedRows === 1 ? '' : 's'}${skippedRows > 0 ? ` (${skippedRows} row${skippedRows === 1 ? '' : 's'} skipped)` : ''}.`,
      { title: 'Import complete', type: 'success' },
    );
  };

  const handleCopyPreviousMarks = async () => {
    const previousExam = exams
      .filter((e) => e.class_id === exam.class_id && e.id !== exam.id)
      .sort((a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime())[0];

    if (!previousExam) {
      await alert('No previous exam found for this class.', { title: 'Copy marks', type: 'warning' });
      return;
    }

    const confirmed = await confirm(
      `Copy marks from "${previousExam.name}" (${new Date(previousExam.exam_date).toLocaleDateString('en-IN')})? This will overwrite current entries for matching subjects.`,
      {
        title: 'Copy previous marks',
        type: 'warning',
        confirmText: 'Copy marks',
        cancelText: 'Cancel',
      },
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/exams/${previousExam.id}/results`);
      const data = await res.json();
      if (!data.success || !Array.isArray(data.data)) {
        await alert(data.error || 'Failed to load previous exam results.', { title: 'Copy marks', type: 'error' });
        return;
      }

      const next = cloneInputs();
      let copied = 0;

      for (const student of students) {
        for (const sub of examSubjects) {
          const sid = sub.subject_id || 0;
          const prev = data.data.find(
            (r: { student_id: number; subject_id?: number; marks_obtained: number; is_absent: boolean; remarks?: string }) =>
              r.student_id === student.id && (r.subject_id === sid || (!r.subject_id && examSubjects.length === 1)),
          );
          if (!prev) continue;

          copied += 1;
          next[student.id] = next[student.id] || {};
          next[student.id][sid] = {
            marks: prev.is_absent ? '' : String(prev.marks_obtained),
            absent: Boolean(prev.is_absent),
            remarks: prev.remarks || next[student.id][sid]?.remarks || '',
          };
        }
      }

      if (copied === 0) {
        await alert('No matching subject marks found in the previous exam.', { title: 'Copy marks', type: 'warning' });
        return;
      }

      onReplaceInputs(next);
      await alert(`Copied ${copied} mark entries from "${previousExam.name}".`, { title: 'Copy marks', type: 'success' });
    } catch {
      await alert('Failed to copy previous marks.', { title: 'Copy marks', type: 'error' });
    }
  };

  const allMarkedAbsent = useMemo(() => {
    if (students.length === 0 || examSubjects.length === 0) return false;
    for (const student of students) {
      for (const sub of examSubjects) {
        const sid = sub.subject_id || 0;
        const input = resultInputs[student.id]?.[sid];
        if (!input?.absent) return false;
      }
    }
    return true;
  }, [students, examSubjects, resultInputs]);

  const bulkActions = [
    { label: 'Import Excel', icon: FiUpload, onClick: () => fileInputRef.current?.click() },
    { label: 'Export Template', icon: FiDownload, onClick: handleExportTemplate },
    { label: 'Copy Previous Marks', icon: FiCopy, onClick: handleCopyPreviousMarks },
    { label: 'Auto Fill Zero', icon: FiMinusCircle, onClick: handleAutoFillZero },
    { label: 'Auto Pass', icon: FiTrendingUp, onClick: handleAutoPass },
  ];

  return (
    <ContentAreaModal open={show} onClose={handleAttemptClose}>
      <div className="flex flex-col h-full w-full bg-white shadow-2xl">
        <div className="p-4 sm:p-6 border-b flex justify-between items-center shrink-0 bg-white gap-4">
          <div className="min-w-0">
            <h3 className="text-xl">Upload Results</h3>
            <p className="text-sm text-gray-600 mt-1">
              {exam.name} — {exam.class_name}
              {isMultiSubject
                ? ` — ${examSubjects.length} subjects`
                : ` — ${examSubjects[0].subject_name}`}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleAttemptClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleAttemptSave}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
            >
              <FiSave /> Save Results
            </button>
            <button onClick={handleAttemptClose} className="text-gray-500 hover:text-gray-700 p-1" aria-label="Close">
              <FiX className="text-2xl" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
          <div className="mb-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              {isMultiSubject ? (
                <>
                  <strong>Subjects:</strong>{' '}
                  {examSubjects.map((s) => `${s.subject_name} (${s.total_marks} marks)`).join(' · ')}
                </>
              ) : (
                <>
                  <strong>Total Marks:</strong> {examSubjects[0].total_marks} |{' '}
                  <strong className="ml-2">Passing Marks:</strong> {examSubjects[0].passing_marks}
                </>
              )}
            </p>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,text/csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) await handleImportFile(file);
              }}
            />
            <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden shrink-0">
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-r border-gray-300 transition-colors ${
                  !allMarkedAbsent
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FiCheckCircle size={14} className="shrink-0" />
                Mark All Present
              </button>
              <button
                type="button"
                onClick={handleMarkAllAbsent}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                  allMarkedAbsent
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FiUserX size={14} className="shrink-0" />
                Mark All Absent
              </button>
            </div>
            {bulkActions.map(({ label, icon: Icon, onClick }) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50"
              >
                <Icon size={14} className="shrink-0" />
                {label}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto h-full">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-20">
                    Student
                  </th>
                  {examSubjects.map((sub) => (
                    <th
                      key={sub.subject_id}
                      colSpan={isMultiSubject ? 2 : 3}
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-l"
                    >
                      {sub.subject_name}
                      <span className="block text-[10px] font-normal text-gray-400">
                        /{sub.total_marks} (pass {sub.passing_marks})
                      </span>
                    </th>
                  ))}
                </tr>
                <tr className="bg-gray-50">
                  <th className="sticky left-0 bg-gray-50 z-20" />
                  {examSubjects.map((sub) => (
                    isMultiSubject ? (
                      <Fragment key={`hdr-${sub.subject_id}`}>
                        <th className="px-2 py-2 text-xs text-gray-500 border-l">Marks</th>
                        <th className="px-2 py-2 text-xs text-gray-500">Absent</th>
                      </Fragment>
                    ) : (
                      <Fragment key={`hdr-${sub.subject_id}`}>
                        <th className="px-2 py-2 text-xs text-gray-500 border-l">Marks</th>
                        <th className="px-2 py-2 text-xs text-gray-500">Absent</th>
                        <th className="px-2 py-2 text-xs text-gray-500">Remarks</th>
                      </Fragment>
                    )
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 sticky left-0 bg-white z-[1]">
                      <div className="font-medium">{student.first_name} {student.last_name}</div>
                      <div className="text-xs text-gray-500">{student.roll_number || student.admission_number}</div>
                    </td>
                    {examSubjects.map((sub) => {
                      const sid = sub.subject_id || 0;
                      const input = resultInputs[student.id]?.[sid] || { marks: '', absent: false, remarks: '' };
                      const marksInvalid = isMarksOverMax(input.marks, sub.total_marks);
                      const marksMissing = isMarksMissing(input);
                      const marksInputClass = marksMissing
                        ? 'border-amber-500 focus:ring-amber-500 bg-amber-50'
                        : marksInvalid
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500';
                      return isMultiSubject ? (
                        <Fragment key={`${student.id}-${sid}`}>
                          <td className="px-2 py-3 border-l">
                            <input
                              type="number"
                              value={input.marks}
                              onChange={(e) => handleMarksChange(student.id, sid, e.target.value, sub.total_marks)}
                              disabled={input.absent}
                              className={`w-20 px-2 py-1.5 border rounded-lg text-sm disabled:bg-gray-100 ${marksInputClass}`}
                              min="0"
                              max={sub.total_marks}
                              title={
                                marksMissing
                                  ? 'Enter marks or mark absent'
                                  : marksInvalid
                                    ? `Maximum marks is ${sub.total_marks}`
                                    : undefined
                              }
                              placeholder="0"
                            />
                          </td>
                          <td className="px-2 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={input.absent}
                              onChange={(e) => onUpdateInput(student.id, sid, 'absent', e.target.checked)}
                              className="w-4 h-4"
                            />
                          </td>
                        </Fragment>
                      ) : (
                        <Fragment key={`${student.id}-${sid}`}>
                          <td className="px-2 py-3 border-l">
                            <input
                              type="number"
                              value={input.marks}
                              onChange={(e) => handleMarksChange(student.id, sid, e.target.value, sub.total_marks)}
                              disabled={input.absent}
                              className={`w-24 px-3 py-2 border rounded-lg disabled:bg-gray-100 ${marksInputClass}`}
                              min="0"
                              max={sub.total_marks}
                              title={
                                marksMissing
                                  ? 'Enter marks or mark absent'
                                  : marksInvalid
                                    ? `Maximum marks is ${sub.total_marks}`
                                    : undefined
                              }
                              placeholder="0"
                            />
                          </td>
                          <td className="px-2 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={input.absent}
                              onChange={(e) => onUpdateInput(student.id, sid, 'absent', e.target.checked)}
                              className="w-4 h-4"
                            />
                          </td>
                          <td className="px-2 py-3">
                            <input
                              type="text"
                              value={input.remarks}
                              onChange={(e) => onUpdateInput(student.id, sid, 'remarks', e.target.value)}
                              className="w-full min-w-[8rem] px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                              placeholder="Optional"
                            />
                          </td>
                        </Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ContentAreaModal>
  );
}
