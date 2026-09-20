'use client';

import { useMemo } from 'react';
import { useAdmissionNumberFormat } from '@/shared/context/AdmissionNumberFormatContext';
import type { Student } from '@/shared/types';
import { studentFullName, studentInitials } from '@/features/students/utils/student-profile';
import {
  darkenBrandColor,
  normalizeBrandColor,
} from '@/features/students/utils/student-id-card-school-info';
import type { StudentIdCardSchoolInfo } from '@/features/students/components/StudentIdCard';
import { QRCodeSVG } from 'qrcode.react';

interface AlumniIdCardProps {
  student: Student & {
    batch_year?: string | null;
    last_class?: string | null;
    exit_date?: string | null;
  };
  school: StudentIdCardSchoolInfo;
}

function FieldRow({
  label,
  value,
  brandColor,
}: {
  label: string;
  value?: string | null;
  brandColor: string;
}) {
  return (
    <div
      className="grid items-start"
      style={{
        gridTemplateColumns: '18mm 1fr',
        columnGap: '1mm',
        fontSize: '5.5px',
        lineHeight: '7px',
      }}
    >
      <span className="font-semibold whitespace-nowrap" style={{ color: brandColor }}>
        {label} :
      </span>
      <span className="text-gray-900 break-words">{value?.trim() || ''}</span>
    </div>
  );
}

function alumniCardId(student: Student): string {
  const year = student.batch_year?.slice(0, 4) || new Date().getFullYear().toString();
  return `ALM${year.slice(-2)}-${String(student.id).padStart(6, '0')}`;
}

function formatExitDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AlumniIdCard({ student, school }: AlumniIdCardProps) {
  const formatAdmissionNumber = useAdmissionNumberFormat();
  const brandColor = normalizeBrandColor(school.brandColor);
  const brandColorDark = darkenBrandColor(brandColor);
  const fullName = studentFullName(student);
  const cardId = alumniCardId(student);

  const qrValue = useMemo(
    () =>
      JSON.stringify({
        type: 'alumni_id',
        id: student.id,
        admission_number: student.admission_number,
      }),
    [student.id, student.admission_number]
  );

  return (
    <div className="id-card-sheet break-inside-avoid">
      <div
        className="id-card relative overflow-hidden bg-white text-gray-900 shadow-md"
        style={{
          width: '85.6mm',
          height: '53.98mm',
          borderRadius: '6px',
          border: `2.5px solid ${brandColor}`,
        }}
      >
        {/* Header */}
        <div
          className="relative z-20"
          style={{
            height: '14.5mm',
            backgroundColor: brandColor,
            padding: '1.2mm 2mm 1mm',
          }}
        >
          <div className="flex min-w-0 items-start gap-[1.5mm] pr-[20mm]">
            <div
              className="flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-white shadow-sm"
              style={{ width: '9.5mm', height: '9.5mm' }}
            >
              {school.logoUrl ? (
                <img src={school.logoUrl} alt="" className="h-full w-full object-contain p-[0.5mm]" />
              ) : (
                <span className="text-[5px] font-bold" style={{ color: brandColor }}>
                  EDU
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="font-bold uppercase tracking-wide text-white"
                style={{ fontSize: '7.5px', lineHeight: '8.5px' }}
              >
                {school.name}
              </p>
              <p
                className="font-semibold uppercase tracking-wider text-white/90"
                style={{ fontSize: '5.5px', lineHeight: '7px', marginTop: '0.4mm' }}
              >
                Alumni Identity Card
              </p>
              {student.batch_year && (
                <p className="text-white/80" style={{ fontSize: '5px', lineHeight: '6.5px', marginTop: '0.4mm' }}>
                  Batch {student.batch_year}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Photo + QR — right column */}
        <div
          className="absolute z-30 flex flex-col items-center"
          style={{ width: '18mm', right: '1.2mm', top: '2.2mm' }}
        >
          <div
            className="overflow-hidden bg-gray-100 shadow-md"
            style={{ border: '2px solid white', borderRadius: '4px' }}
          >
            {student.photo_url ? (
              <img
                src={student.photo_url}
                alt={fullName}
                className="object-cover"
                style={{ width: '15mm', height: '17mm' }}
              />
            ) : (
              <div
                className="flex items-center justify-center font-bold text-white"
                style={{ width: '15mm', height: '17mm', backgroundColor: brandColor, fontSize: '10px' }}
              >
                {studentInitials(student)}
              </div>
            )}
          </div>
          <div
            className="w-full py-[0.4mm] text-center font-bold tracking-wider text-white"
            style={{
              backgroundColor: brandColor,
              borderRadius: '3px',
              fontSize: '5.5px',
              marginTop: '0.8mm',
            }}
          >
            ALUMNI
          </div>
          <div
            className="bg-white p-[0.4mm]"
            style={{
              border: `1px solid ${brandColor}`,
              borderRadius: '3px',
              marginTop: '0.6mm',
            }}
          >
            <QRCodeSVG value={qrValue} size={30} level="M" includeMargin={false} />
          </div>
        </div>

        {/* Body — left column with aligned field grid */}
        <div
          className="relative z-10"
          style={{
            height: 'calc(53.98mm - 14.5mm - 7mm)',
            padding: '1.2mm 2mm 0.8mm',
            paddingRight: '20.5mm',
          }}
        >
          <p
            className="font-bold text-gray-900"
            style={{ fontSize: '9px', lineHeight: '10px', marginBottom: '0.8mm' }}
          >
            {fullName}
          </p>
          <div className="flex flex-col" style={{ gap: '0.5mm' }}>
            <FieldRow
              label="Admission No."
              value={formatAdmissionNumber(student.admission_number)}
              brandColor={brandColor}
            />
            <FieldRow label="Last Class" value={student.last_class || student.class_name} brandColor={brandColor} />
            <FieldRow label="Batch" value={student.batch_year} brandColor={brandColor} />
            <FieldRow label="Exit Date" value={formatExitDate(student.exit_date)} brandColor={brandColor} />
            <FieldRow label="Phone" value={student.parent_phone} brandColor={brandColor} />
          </div>
        </div>

        {/* Footer */}
        <div
          className="absolute bottom-0 left-0 right-0 z-20 flex items-stretch"
          style={{ height: '7mm' }}
        >
          <div
            className="flex items-center font-bold text-white"
            style={{
              minWidth: '23mm',
              fontSize: '5px',
              backgroundColor: brandColorDark,
              borderTopRightRadius: '5px',
              padding: '0 1.5mm',
            }}
          >
            ID: {cardId}
          </div>

          <div
            className="relative flex flex-1 flex-col items-center justify-center bg-white"
            style={{ padding: '0.4mm 1mm' }}
          >
            {school.signatureUrl ? (
              <img
                src={school.signatureUrl}
                alt="Principal signature"
                className="object-contain"
                style={{ maxHeight: '3.5mm', maxWidth: '18mm' }}
              />
            ) : school.principalName ? (
              <p
                className="leading-none"
                style={{
                  color: brandColor,
                  fontSize: '7.5px',
                  fontFamily: '"Segoe Script", "Brush Script MT", cursive',
                }}
              >
                {school.principalName}
              </p>
            ) : null}
            <div style={{ width: '16mm', borderTop: '0.5px solid #4b5563', marginTop: '0.4mm' }} />
            <p className="font-semibold text-gray-900" style={{ fontSize: '5.5px', marginTop: '0.3mm' }}>
              Principal
            </p>
          </div>

          <div
            className="flex items-center justify-center text-center font-semibold uppercase leading-tight text-white"
            style={{
              width: '26mm',
              fontSize: '3.6px',
              backgroundColor: brandColorDark,
              borderTopLeftRadius: '5px',
              padding: '0 0.8mm',
            }}
          >
            Proud member of our alumni network
          </div>
        </div>
      </div>
    </div>
  );
}
