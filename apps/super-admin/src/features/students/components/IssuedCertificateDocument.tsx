'use client';

import { CERTIFICATE_TYPE_LABELS, type IssuedCertificateType } from '@/lib/student-operations-utils';
import { formatStudentDate } from '@/features/students/utils/student-profile';

export interface IssuedCertificateRecord {
  certificate_type: IssuedCertificateType;
  certificate_number: string;
  issue_date: string;
  purpose?: string | null;
  remarks?: string | null;
  academic_year?: string | null;
  student_snapshot?: {
    full_name?: string;
    admission_number?: string;
    class_name?: string;
    section_name?: string;
    date_of_birth?: string;
    parent_name?: string;
    gender?: string;
    admission_date?: string;
  };
  school_snapshot?: {
    name?: string;
    address?: string;
  };
}

function classLabel(snapshot?: IssuedCertificateRecord['student_snapshot']) {
  return [snapshot?.class_name, snapshot?.section_name].filter(Boolean).join(' - ') || '—';
}

export default function IssuedCertificateDocument({ record }: { record: IssuedCertificateRecord }) {
  const student = record.student_snapshot || {};
  const school = record.school_snapshot || {};
  const title = CERTIFICATE_TYPE_LABELS[record.certificate_type];

  const body =
    record.certificate_type === 'dob'
      ? `This is to certify that ${student.full_name || 'the student'} (Admission No. ${
          student.admission_number || '—'
        }), ${student.gender === 'Female' ? 'daughter' : 'son'} of ${
          student.parent_name || '—'
        }, studying in ${classLabel(student)}, was born on ${formatStudentDate(
          student.date_of_birth
        )} as per school records.`
      : record.certificate_type === 'character'
        ? `This is to certify that ${student.full_name || 'the student'} (Admission No. ${
            student.admission_number || '—'
          }), studying in ${classLabel(
            student
          )}, bears a good moral character and has not been involved in any activity that would bring disrepute to the school.`
        : `This is to certify that ${student.full_name || 'the student'} (Admission No. ${
            student.admission_number || '—'
          }) is a bona fide student of this school, studying in ${classLabel(
            student
          )} during the academic year ${record.academic_year || '—'}.`;

  return (
    <div className="cert mx-auto max-w-2xl border-2 border-gray-900 bg-white p-10">
      <h1 className="text-center text-xl font-semibold">{school.name || 'School'}</h1>
      {school.address && <p className="muted mb-4 text-center text-sm text-gray-600">{school.address}</p>}
      <h2 className="mb-6 text-center text-lg font-bold uppercase tracking-wide">{title}</h2>
      <p className="mb-4 text-right text-sm">No. {record.certificate_number}</p>
      <p className="mb-6 text-sm leading-7">{body}</p>
      {record.purpose && <p className="mb-2 text-sm">Purpose: {record.purpose}</p>}
      {record.remarks && <p className="mb-6 text-sm">Remarks: {record.remarks}</p>}
      <p className="text-sm">Date of issue: {formatStudentDate(record.issue_date)}</p>
      <p className="mt-16 text-right text-sm">Principal</p>
    </div>
  );
}

export function issuedCertificateHtml(record: IssuedCertificateRecord): string {
  const student = record.student_snapshot || {};
  const school = record.school_snapshot || {};
  const title = CERTIFICATE_TYPE_LABELS[record.certificate_type];
  const className = [student.class_name, student.section_name].filter(Boolean).join(' - ') || '—';
  const body =
    record.certificate_type === 'dob'
      ? `This is to certify that <strong>${student.full_name || 'the student'}</strong> (Admission No. ${
          student.admission_number || '—'
        }) was born on <strong>${student.date_of_birth || '—'}</strong> as per school records.`
      : record.certificate_type === 'character'
        ? `This is to certify that <strong>${student.full_name || 'the student'}</strong> studying in <strong>${className}</strong> bears a good moral character.`
        : `This is to certify that <strong>${student.full_name || 'the student'}</strong> is a bona fide student of this school studying in <strong>${className}</strong>.`;

  return `<div class="cert">
    <h1>${school.name || 'School'}</h1>
    <p class="muted">${school.address || ''}</p>
    <h2>${title}</h2>
    <p style="text-align:right">No. ${record.certificate_number}</p>
    <p>${body}</p>
    ${record.purpose ? `<p>Purpose: ${record.purpose}</p>` : ''}
    <p>Date of issue: ${record.issue_date}</p>
    <p style="text-align:right;margin-top:64px">Principal</p>
  </div>`;
}
