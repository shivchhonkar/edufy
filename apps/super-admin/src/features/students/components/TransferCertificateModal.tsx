'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useEffect, useState } from 'react';
import { FiPrinter, FiX } from 'react-icons/fi';
import type { Student } from '@/shared/types';
import TransferCertificate, {
  defaultTcOptions,
  type TransferCertificateOptions,
  type TransferCertificateSchoolInfo,
} from '@/features/students/components/TransferCertificate';
import { studentFullName } from '@/features/students/utils/student-profile';
import { buildStudentSnapshot } from '@/features/students/utils/transfer-certificate-record';
import { printTransferCertificatesViaIframe } from '@/features/students/utils/transfer-certificate-print';
import { useDialog } from '@/shared/context/DialogContext';
interface TransferCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  school: TransferCertificateSchoolInfo;
}

export default function TransferCertificateModal({
  isOpen,
  onClose,
  students,
  school,
}: TransferCertificateModalProps) {
  const { alert } = useDialog();
  const [optionsByStudent, setOptionsByStudent] = useState<
    Record<number, TransferCertificateOptions>
  >({});
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const next: Record<number, TransferCertificateOptions> = {};
    for (const student of students) {
      next[student.id] = defaultTcOptions(student);
    }
    setOptionsByStudent(next);
  }, [isOpen, students]);

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const entries = students.map((student) => {
        const options = optionsByStudent[student.id] ?? defaultTcOptions(student);
        return {
          student_id: student.id,
          tc_number: options.tcNumber,
          options,
          student_snapshot: buildStudentSnapshot(student),
          school_snapshot: school,
        };
      });

      const res = await fetch('/api/students/transfer-certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries,
          academic_year: school.academicYear?.replace(/^Academic Year\s+/i, '') || null,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        await alert(json.error || 'Failed to save transfer certificate history', {
          title: 'Error',
          type: 'error',
        });
        return;
      }

      printTransferCertificatesViaIframe(students, school, optionsByStudent);
    } catch {
      await alert('Failed to save transfer certificate history', {
        title: 'Error',
        type: 'error',
      });
    } finally {
      setPrinting(false);
    }
  };

  const updateOption = (
    studentId: number,
    field: keyof TransferCertificateOptions,
    value: string
  ) => {
    setOptionsByStudent((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  };

  if (students.length === 0) return null;

  return (
    <>
      <AppModal open={isOpen} onClose={onClose}>
        <div className={APP_MODAL_PANEL}>
          <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Transfer Certificate</h2>
              <p className="text-sm text-gray-500">
                {students.length} student{students.length !== 1 ? 's' : ''} selected
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                disabled={printing}
                className="flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-60"
              >
                <FiPrinter size={16} />
                {printing ? 'Saving...' : 'Print'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Close"
              >
                <FiX size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-8">
            {students.map((student) => {
              const options = optionsByStudent[student.id] ?? defaultTcOptions(student);
              return (
                <div key={student.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3 print:hidden">
                    <p className="col-span-full text-sm font-semibold text-gray-900">
                      {studentFullName(student)} · {student.admission_number}
                    </p>
                    <label className="text-xs text-gray-600">
                      TC Number
                      <input
                        value={options.tcNumber}
                        onChange={(e) => updateOption(student.id, 'tcNumber', e.target.value)}
                        className="mt-1 w-full rounded border px-2 py-1.5 text-sm text-gray-900"
                      />
                    </label>
                    <label className="text-xs text-gray-600">
                      Date of Leaving
                      <input
                        type="date"
                        value={options.dateOfLeaving?.split('T')[0] || ''}
                        onChange={(e) => updateOption(student.id, 'dateOfLeaving', e.target.value)}
                        className="mt-1 w-full rounded border px-2 py-1.5 text-sm text-gray-900"
                      />
                    </label>
                    <label className="text-xs text-gray-600">
                      Date of Issue
                      <input
                        type="date"
                        value={options.issueDate?.split('T')[0] || ''}
                        onChange={(e) => updateOption(student.id, 'issueDate', e.target.value)}
                        className="mt-1 w-full rounded border px-2 py-1.5 text-sm text-gray-900"
                      />
                    </label>
                    <label className="text-xs text-gray-600">
                      Reason for Leaving
                      <input
                        value={options.reasonForLeaving}
                        onChange={(e) =>
                          updateOption(student.id, 'reasonForLeaving', e.target.value)
                        }
                        className="mt-1 w-full rounded border px-2 py-1.5 text-sm text-gray-900"
                      />
                    </label>
                    <label className="text-xs text-gray-600">
                      Conduct
                      <input
                        value={options.conduct}
                        onChange={(e) => updateOption(student.id, 'conduct', e.target.value)}
                        className="mt-1 w-full rounded border px-2 py-1.5 text-sm text-gray-900"
                      />
                    </label>
                    <label className="text-xs text-gray-600">
                      Qualified for Promotion
                      <select
                        value={options.qualifiedForPromotion}
                        onChange={(e) =>
                          updateOption(student.id, 'qualifiedForPromotion', e.target.value)
                        }
                        className="mt-1 w-full rounded border px-2 py-1.5 text-sm text-gray-900"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="N/A">N/A</option>
                      </select>
                    </label>
                  </div>

                  <div className="overflow-x-auto rounded border border-gray-200 bg-white shadow-sm">
                    <TransferCertificate student={student} school={school} options={options} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </AppModal>

    </>
  );
}
