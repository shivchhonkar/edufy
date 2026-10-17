'use client';

import { useMemo } from 'react';
import DocumentWatermark from '@/shared/components/common/DocumentWatermark';
import type { Student } from '@/shared/types';
import { formatStudentDate, studentFullName } from '@/features/students/utils/student-profile';
import { splitAddressIntoTwoLines } from '@/features/students/utils/school-document-utils';

export interface TransferCertificateSchoolInfo {
  name: string;
  address?: string;
  logoUrl?: string;
  academicYear?: string;
  phone?: string;
  email?: string;
  principalName?: string;
  signatureUrl?: string;
  showWatermark?: boolean;
  watermarkUrl?: string;
  watermarkText?: string;
  watermarkColor?: string;
}

export interface TransferCertificateOptions {
  tcNumber: string;
  issueDate: string;
  dateOfLeaving: string;
  reasonForLeaving: string;
  conduct: string;
  qualifiedForPromotion: string;
}

interface TransferCertificateProps {
  student: Student;
  school: TransferCertificateSchoolInfo;
  options: TransferCertificateOptions;
}

function ParticularsRow({ index, label, value }: { index: number; label: string; value?: string | null }) {
  return (
    <tr className="border-b border-slate-200 last:border-b-0">
      <td className="w-8 px-3 py-2 text-center text-xs text-slate-500">{index}</td>
      <td className="w-[46%] px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-600">{label}</td>
      <td className="px-3 py-2 text-sm text-slate-900">{value?.trim() || '—'}</td>
    </tr>
  );
}

function formatClassPhrase(className?: string | null, sectionName?: string | null): string {
  const classSection = [className, sectionName].filter(Boolean).join(' - ').trim();
  if (!classSection) return '';
  if (/^class\b/i.test(classSection)) return classSection;
  return `Class ${classSection}`;
}

function genderLabel(gender?: string | null): string {
  if (!gender) return '';
  if (gender === 'Male') return 'Son';
  if (gender === 'Female') return 'Daughter';
  return 'Child';
}

export function buildTcNumber(student: Student): string {
  const year = new Date().getFullYear();
  return `TC/${year}/${student.admission_number || student.id}`;
}

export function defaultTcOptions(student: Student): TransferCertificateOptions {
  const today = new Date().toISOString().split('T')[0];
  return {
    tcNumber: buildTcNumber(student),
    issueDate: today,
    dateOfLeaving: today,
    reasonForLeaving: "Parent's request",
    conduct: 'Good',
    qualifiedForPromotion: 'Yes',
  };
}

export default function TransferCertificate({
  student,
  school,
  options,
}: TransferCertificateProps) {
  const fullName = studentFullName(student);
  const relation = genderLabel(student.gender);
  const classPhrase = formatClassPhrase(student.class_name, student.section_name);
  const [addressLine1, addressLine2] = useMemo(
    () => splitAddressIntoTwoLines(school.address),
    [school.address],
  );

  const place = student.city?.trim() || school.address?.split(',').pop()?.trim() || '';
  const contact = [school.phone, school.email].filter(Boolean).join('  ·  ');
  const particulars = [
    ['Date of birth', formatStudentDate(student.date_of_birth)],
    ['Gender', student.gender],
    ['Admission number', student.admission_number],
    ['Date of admission', formatStudentDate(student.admission_date)],
    ['Class last attended', classPhrase],
    ['Date of leaving', formatStudentDate(options.dateOfLeaving)],
    ['Qualified for promotion', options.qualifiedForPromotion],
    ['Conduct and character', options.conduct],
    ['Reason for leaving', options.reasonForLeaving],
  ] as const;

  return (
    <div className="tc-sheet break-after-page bg-white font-serif text-slate-900">
      <div className="relative mx-auto max-w-[210mm] bg-white p-2">
        <div className="relative border-[2.5px] border-slate-900 px-8 py-7 print:min-h-[270mm] print:px-[12mm] print:py-[10mm]">
          <div className="pointer-events-none absolute inset-[5px] border border-slate-400" />
          <DocumentWatermark
            show={school.showWatermark !== false}
            imageUrl={school.watermarkUrl}
            text={school.watermarkText}
            schoolName={school.name}
            color={school.watermarkColor}
          />

          <div className="relative z-10">
            <header className="flex items-start justify-center gap-4 text-center">
              {school.logoUrl ? (
                <img src={school.logoUrl} alt="" className="h-16 w-16 shrink-0 object-contain" />
              ) : null}
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-500">
                  {school.academicYear || 'School record'}
                </p>
                <p className="mt-1 text-[22px] font-bold uppercase leading-tight tracking-[0.08em] text-slate-900">
                  {school.name}
                </p>
                {addressLine1 || addressLine2 ? (
                  <p className="mx-auto mt-1 max-w-md text-[11px] leading-relaxed text-slate-600">
                    {addressLine1}
                    {addressLine2 ? <><br />{addressLine2}</> : null}
                  </p>
                ) : null}
                {contact ? <p className="mt-0.5 text-[11px] text-slate-500">{contact}</p> : null}
              </div>
              {student.photo_url ? (
                <img
                  src={student.photo_url}
                  alt=""
                  className="h-[72px] w-[58px] shrink-0 border border-slate-300 object-cover"
                />
              ) : (
                <div className="h-16 w-16 shrink-0" />
              )}
            </header>

            <div className="mt-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-800" />
              <h2 className="shrink-0 text-sm font-bold uppercase tracking-[0.28em] text-slate-900">
                Transfer Certificate
              </h2>
              <div className="h-px flex-1 bg-slate-800" />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-y border-slate-200 py-2 text-xs">
              <p>
                <span className="font-semibold uppercase tracking-wide text-slate-500">TC No.</span>{' '}
                <span className="font-mono text-[13px] font-semibold tracking-tight">{options.tcNumber}</span>
              </p>
              <p>
                <span className="font-semibold uppercase tracking-wide text-slate-500">Date of issue</span>{' '}
                <span className="font-semibold">{formatStudentDate(options.issueDate)}</span>
              </p>
            </div>

            <p className="mt-5 text-justify text-[13.5px] leading-7 text-slate-800">
              This is to certify that{' '}
              {relation ? <><strong>{relation}</strong> of</> : 'ward of'}{' '}
              <strong>{student.parent_name?.trim() || '—'}</strong>, named{' '}
              <strong>{fullName || '—'}</strong>
              {student.roll_number ? <> (Roll No. <strong>{student.roll_number}</strong>)</> : null}
              , was a bonafide student of this institution.
            </p>

            <table className="mt-4 w-full border-collapse border border-slate-300 text-left">
              <tbody>
                {particulars.map(([label, value], index) => (
                  <ParticularsRow key={label} index={index + 1} label={label} value={value} />
                ))}
              </tbody>
            </table>

            <p className="mt-5 text-justify text-[13.5px] leading-7 text-slate-800">
              {fullName || 'The student'} has no dues pending against him/her in this school.
              His/Her character and conduct during the stay were{' '}
              <strong>{options.conduct || 'satisfactory'}</strong>. This certificate is issued at
              the request of the parent or guardian for admission to another school.
            </p>

            <div className="mt-12 flex items-end justify-between gap-8">
              <div className="text-xs leading-6 text-slate-700">
                <p><span className="font-semibold uppercase tracking-wide text-slate-500">Place</span> {place || '—'}</p>
                <p><span className="font-semibold uppercase tracking-wide text-slate-500">Date</span> {formatStudentDate(options.issueDate)}</p>
              </div>
              <div className="flex w-44 flex-col items-center text-center">
                {school.signatureUrl ? (
                  <img src={school.signatureUrl} alt="Principal signature" className="mb-1 max-h-12 max-w-[140px] object-contain" />
                ) : school.principalName ? (
                  <p className="mb-1 text-lg text-slate-800" style={{ fontFamily: '"Segoe Script", "Brush Script MT", cursive' }}>
                    {school.principalName}
                  </p>
                ) : (
                  <div className="h-10" />
                )}
                <div className="w-full border-t border-slate-800" />
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em]">Principal</p>
                <p className="text-[11px] text-slate-500">{school.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
