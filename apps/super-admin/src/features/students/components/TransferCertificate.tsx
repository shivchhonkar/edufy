'use client';

import { useMemo } from 'react';
import DocumentWatermark from '@/shared/components/documents/DocumentWatermark';
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

function InfoLine({ label, value }: { label: string; value?: string | null }) {
  return (
    <p className="text-sm leading-relaxed text-gray-900">
      <span className="font-semibold">{label}:</span>{' '}
      <span>{value?.trim() || ''}</span>
    </p>
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

  return (
    <div className="tc-sheet break-after-page bg-white text-gray-900">
      <div className="tc-page relative mx-auto min-h-[277mm] max-w-[210mm] border border-gray-300 px-10 py-12 print:border-0 print:px-[15mm] print:py-[12mm]">
        <DocumentWatermark
          show={school.showWatermark !== false}
          imageUrl={school.watermarkUrl}
          text={school.watermarkText}
          schoolName={school.name}
          color={school.watermarkColor}
        />

        <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start gap-5 border-b-2 border-primary-700 pb-5">
          {school.logoUrl ? (
            <img
              src={school.logoUrl}
              alt=""
              className="h-[72px] w-[72px] shrink-0 rounded-lg border border-gray-200 object-contain p-1.5"
            />
          ) : (
            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-lg bg-primary-50 text-xs font-bold text-primary-700">
              LOGO
            </div>
          )}
          <div className="min-w-0 flex-1 text-center">
            <h1 className="text-2xl font-bold uppercase tracking-wide text-primary-800 leading-tight">
              {school.name}
            </h1>
            {school.academicYear ? (
              <p className="mt-2 text-sm font-medium text-gray-600">{school.academicYear}</p>
            ) : null}
            {addressLine1 || addressLine2 ? (
              <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-gray-600">
                {addressLine1}
                {addressLine2 ? (
                  <>
                    <br />
                    {addressLine2}
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
        </div>
        <p className="mt-4 flex justify-end whitespace-nowrap text-sm text-gray-900">
          <span className="font-semibold">TC No.</span>
          <span className="ml-2 font-mono text-[13px] font-semibold tracking-tight text-primary-800">
            {options.tcNumber}
          </span>
        </p>

        <h2 className="mt-8 text-center text-lg font-bold uppercase tracking-[0.2em] text-gray-900 underline decoration-primary-600 decoration-2 underline-offset-[6px]">
          Transfer Certificate
        </h2>

        <div className="mt-10 space-y-5 text-sm leading-8 text-gray-800">
          <p>
            This is to certify that{' '}
            {relation ? (
              <>
                <strong>{relation}</strong> of
              </>
            ) : (
              'ward of'
            )}{' '}
            <strong>{student.parent_name?.trim() || ''}</strong>, named{' '}
            <strong>{fullName || ''}</strong>, bearing Admission No.{' '}
            <strong>{student.admission_number?.trim() || ''}</strong>
            {student.roll_number ? (
              <>
                {' '}
                and Roll No. <strong>{student.roll_number}</strong>
              </>
            ) : null}
            , was a bonafide student of this institution
            {classPhrase ? (
              <>
                {' '}
                in <strong>{classPhrase}</strong>
              </>
            ) : null}
            .
          </p>

          <div className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-5 py-4">
            <InfoLine label="Date of Birth" value={formatStudentDate(student.date_of_birth)} />
            <InfoLine label="Gender" value={student.gender} />
            <InfoLine
              label="Date of Admission"
              value={formatStudentDate(student.admission_date)}
            />
            <InfoLine label="Date of Leaving" value={formatStudentDate(options.dateOfLeaving)} />
            <InfoLine
              label="Qualified for promotion to higher class"
              value={options.qualifiedForPromotion}
            />
            <InfoLine label="Conduct and Character" value={options.conduct} />
            <InfoLine label="Reason for leaving" value={options.reasonForLeaving} />
          </div>

          <p>
            {fullName ? fullName : 'The student'} has no dues pending against him/her in this
            school. His/Her character and conduct during the stay were{' '}
            <strong>{options.conduct || 'satisfactory'}</strong>.
          </p>

          <p>
            This certificate is issued at the request of the parent/guardian for the purpose of
            admission to another school.
          </p>
        </div>

        <div className="mt-16 flex items-end justify-between gap-8">
          <div className="text-sm text-gray-700">
            <p>
              <span className="font-semibold">Date of Issue:</span>{' '}
              {formatStudentDate(options.issueDate)}
            </p>
            <p className="mt-1">
              <span className="font-semibold">Place:</span>{' '}
              {student.city?.trim() || school.address?.split(',').pop()?.trim() || ''}
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            {school.signatureUrl ? (
              <img
                src={school.signatureUrl}
                alt="Principal signature"
                className="mb-1 max-h-12 max-w-[140px] object-contain"
              />
            ) : school.principalName ? (
              <p
                className="mb-1 text-lg text-primary-700"
                style={{ fontFamily: '"Segoe Script", "Brush Script MT", cursive' }}
              >
                {school.principalName}
              </p>
            ) : null}
            <div className="w-40 border-t border-gray-400" />
            <p className="mt-1 text-sm font-semibold text-gray-900">Principal</p>
            <p className="text-xs text-gray-500">{school.name}</p>
          </div>
        </div>
        </div>

        {student.photo_url ? (
          <div className="absolute right-10 top-36 hidden print:block">
            <img
              src={student.photo_url}
              alt=""
              className="h-24 w-20 rounded border object-cover"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
