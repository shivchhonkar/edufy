'use client';

import { Fragment } from 'react';
import { FiX, FiSave } from 'react-icons/fi';

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
  if (!show || !exam) return null;

  const examSubjects: ExamSubject[] = exam.subjects?.length
    ? exam.subjects
    : [{
        subject_id: 0,
        subject_name: exam.subject_name || 'Subject',
        total_marks: exam.total_marks,
        passing_marks: exam.passing_marks,
      }];

  const isMultiSubject = examSubjects.length > 1;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
      style={{ left: 160 }}
    >
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-xl">Upload Results</h3>
            <p className="text-sm text-gray-600 mt-1">
              {exam.name} — {exam.class_name}
              {isMultiSubject
                ? ` — ${examSubjects.length} subjects`
                : ` — ${examSubjects[0].subject_name}`}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX className="text-2xl" />
          </button>
        </div>
        <div className="p-6">
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50">
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
                  <th className="sticky left-0 bg-gray-50" />
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
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 sticky left-0 bg-white">
                      <div className="font-medium">{student.first_name} {student.last_name}</div>
                      <div className="text-xs text-gray-500">{student.roll_number || student.admission_number}</div>
                    </td>
                    {examSubjects.map((sub) => {
                      const sid = sub.subject_id || 0;
                      const input = resultInputs[student.id]?.[sid] || { marks: '', absent: false, remarks: '' };
                      return isMultiSubject ? (
                        <Fragment key={`${student.id}-${sid}`}>
                          <td className="px-2 py-3 border-l">
                            <input
                              type="number"
                              value={input.marks}
                              onChange={(e) => onUpdateInput(student.id, sid, 'marks', e.target.value)}
                              disabled={input.absent}
                              className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
                              min="0"
                              max={sub.total_marks}
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
                              onChange={(e) => onUpdateInput(student.id, sid, 'marks', e.target.value)}
                              disabled={input.absent}
                              className="w-24 px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                              min="0"
                              max={sub.total_marks}
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
                              className="w-32 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
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
        <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={onSave} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
            <FiSave /> Save Results
          </button>
        </div>
      </div>
    </div>
  );
}
