'use client';

import { Fragment, useMemo } from 'react';
import { FiX, FiSave } from 'react-icons/fi';
import ContentAreaModal from '@/shared/components/common/ContentAreaModal';
import { useDialog } from '@/shared/context/DialogContext';

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

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  roll_number: string;
  admission_number: string;
}

interface ResultInput {
  marks: string;
  absent: boolean;
  remarks: string;
}

interface UploadResultsModalProps {
  show: boolean;
  exam: Exam | null;
  students: Student[];
  resultInputs: Record<number, Record<number, ResultInput>>;
  onClose: () => void;
  onSave: () => void;
  onUpdateInput: (studentId: number, subjectId: number, field: 'marks' | 'absent' | 'remarks', value: string | boolean) => void;
}

export default function UploadResultsModal({
  show,
  exam,
  students,
  resultInputs,
  onClose,
  onSave,
  onUpdateInput,
}: UploadResultsModalProps) {
  const { confirm } = useDialog();

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

  const isMarksMissing = (input: ResultInput) => !input.absent && input.marks.trim() === '';

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
