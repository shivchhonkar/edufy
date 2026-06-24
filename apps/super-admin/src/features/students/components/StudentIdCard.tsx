'use client';

import { useMemo } from 'react';
import { FiMapPin } from 'react-icons/fi';
import { QRCodeSVG } from 'qrcode.react';
import type { Student } from '@/shared/types';
import { studentFullName, studentInitials } from '@/features/students/utils/student-profile';
import { darkenBrandColor, normalizeBrandColor } from '@/features/students/utils/student-id-card-school-info';

export interface StudentIdCardSchoolInfo {
  name: string;
  logoUrl?: string;
  phone?: string;
  address?: string;
  academicYear?: string;
  principalName?: string;
  signatureUrl?: string;
  /** School brand color from setup branding (primary_color) */
  brandColor?: string;
  /** Optional watermark image (uploaded in Report Settings) */
  stampUrl?: string;
  showWatermark?: boolean;
}

interface StudentIdCardProps {
  student: Student;
  school: StudentIdCardSchoolInfo;
}

function buildQrPayload(student: Student): string {
  return JSON.stringify({
    type: 'student_id',
    id: student.id,
    admission_number: student.admission_number,
  });
}

function splitIntoTwoLines(text?: string | null): [string, string] {
  const trimmed = text?.trim();
  if (!trimmed) return ['', ''];

  const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const mid = Math.ceil(parts.length / 2);
    return [parts.slice(0, mid).join(', '), parts.slice(mid).join(', ')];
  }

  const mid = Math.ceil(trimmed.length / 2);
  const splitAt = trimmed.lastIndexOf(' ', mid);
  if (splitAt > 8) {
    return [trimmed.slice(0, splitAt).trim(), trimmed.slice(splitAt).trim()];
  }

  return [trimmed, ''];
}

function formatDob(dob: Date | string | undefined | null): string {
  if (!dob) return '';
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatFullAddress(student: Student): string {
  const line = [student.address, student.city].filter((part) => part?.trim()).join(', ');
  if (student.pincode?.trim()) {
    return line ? `${line} - ${student.pincode.trim()}` : student.pincode.trim();
  }
  return line;
}

function validUptoFromAcademicYear(academicYear?: string): string {
  if (!academicYear) return '';
  const match = academicYear.match(/(\d{4})\s*[-–]\s*(\d{2,4})/);
  if (!match) return '';
  const endYear = match[2].length === 2 ? `20${match[2]}` : match[2];
  return `31 MAR ${endYear}`;
}

function studentCardId(student: Student): string {
  if (student.student_code?.trim()) return student.student_code.trim();
  const year = new Date().getFullYear().toString().slice(-2);
  return `GPS${year}-${String(student.id).padStart(7, '0')}`;
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
        gridTemplateColumns: '20mm 1fr',
        columnGap: '1.5mm',
        fontSize: '5.5px',
        lineHeight: '7px',
      }}
    >
      <span className="font-semibold" style={{ color: brandColor }}>
        {label} :
      </span>
      <span className="text-gray-900">{value?.trim() || ''}</span>
    </div>
  );
}

function FieldRowMultiline({
  label,
  line1,
  line2,
  brandColor,
}: {
  label: string;
  line1: string;
  line2: string;
  brandColor: string;
}) {
  return (
    <div
      className="grid items-start"
      style={{
        gridTemplateColumns: '20mm 1fr',
        columnGap: '1.5mm',
        fontSize: '5.5px',
        lineHeight: '7px',
      }}
    >
      <span className="font-semibold" style={{ color: brandColor }}>
        {label} :
      </span>
      <span className="text-gray-900">
        {line1}
        {line2 ? (
          <>
            <br />
            {line2}
          </>
        ) : null}
      </span>
    </div>
  );
}

function CardBackgroundStamp({ stampUrl }: { stampUrl?: string }) {
  const src = stampUrl?.trim();
  if (!src) return null;

  return (
    <img
      src={src}
      alt=""
      aria-hidden
      className="pointer-events-none absolute object-contain"
      style={{
        left: '34%',
        top: '50%',
        width: '26mm',
        height: '26mm',
        transform: 'translate(-50%, -50%)',
        opacity: 0.12,
      }}
    />
  );
}

export default function StudentIdCard({ student, school }: StudentIdCardProps) {
  const brandColor = normalizeBrandColor(school.brandColor);
  const brandColorDark = darkenBrandColor(brandColor);

  const fullName = studentFullName(student);
  const qrValue = useMemo(() => buildQrPayload(student), [student.id, student.admission_number]);
  const validUpto = validUptoFromAcademicYear(school.academicYear);
  const cardId = studentCardId(student);
  const principalName = school.principalName?.trim() || '';
  const signatureUrl = school.signatureUrl?.trim() || '';
  const [schoolAddressLine1, schoolAddressLine2] = useMemo(
    () => splitIntoTwoLines(school.address),
    [school.address],
  );
  const [studentAddressLine1, studentAddressLine2] = useMemo(
    () => splitIntoTwoLines(formatFullAddress(student)),
    [student.address, student.city, student.pincode],
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
                className="text-white/80"
                style={{ fontSize: '5.5px', lineHeight: '7px', marginTop: '0.4mm' }}
              >
                {school.academicYear || '\u00A0'}
              </p>
              <div
                className="flex items-start gap-[0.8mm] text-white/90"
                style={{ marginTop: '0.6mm', fontSize: '4.8px', lineHeight: '6px' }}
              >
                <FiMapPin
                  className="shrink-0"
                  size={7}
                  strokeWidth={2.5}
                  aria-hidden
                  style={{ marginTop: '0.2mm' }}
                />
                <span>
                  {schoolAddressLine1}
                  {schoolAddressLine2 ? (
                    <>
                      <br />
                      {schoolAddressLine2}
                    </>
                  ) : null}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Photo + right column */}
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
            STUDENT
          </div>
          <div className="w-full text-center" style={{ marginTop: '0.6mm' }}>
            <p className="font-semibold uppercase" style={{ color: brandColor, fontSize: '4.5px' }}>
              Valid Upto
            </p>
            <p className="font-bold leading-tight text-gray-900" style={{ fontSize: '6.5px' }}>
              {validUpto}
            </p>
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

        {/* Body */}
        <div
          className="relative z-10"
          style={{
            height: 'calc(53.98mm - 14.5mm - 7mm)',
            padding: '1.2mm 2mm 0.8mm',
            paddingRight: '20.5mm',
          }}
        >
          {school.showWatermark !== false && school.stampUrl && (
            <CardBackgroundStamp stampUrl={school.stampUrl} />
          )}
          <p
            className="relative z-10 font-bold text-gray-900"
            style={{ fontSize: '9px', lineHeight: '10px', marginBottom: '0.8mm' }}
          >
            {fullName}
          </p>
          <div className="relative z-10 flex flex-col" style={{ gap: '0.5mm' }}>
            <FieldRow label="Class" value={student.class_name} brandColor={brandColor} />
            <FieldRow label="Section" value={student.section_name} brandColor={brandColor} />
            <FieldRow label="Admission No." value={student.admission_number} brandColor={brandColor} />
            <FieldRow label="Date of Birth" value={formatDob(student.date_of_birth)} brandColor={brandColor} />
            <FieldRow label="Blood Group" value={student.blood_group} brandColor={brandColor} />
            <FieldRow label="Emergency Contact" value={student.emergency_contact} brandColor={brandColor} />
            <FieldRowMultiline
              label="Address"
              line1={studentAddressLine1}
              line2={studentAddressLine2}
              brandColor={brandColor}
            />
            <FieldRow label="Parent / Guardian" value={student.parent_name} brandColor={brandColor} />
            <FieldRow label="Contact" value={student.parent_phone} brandColor={brandColor} />
          </div>
        </div>

        {/* Footer bar with signature notch */}
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
            {signatureUrl ? (
              <img
                src={signatureUrl}
                alt="Principal signature"
                className="object-contain"
                style={{ maxHeight: '3.5mm', maxWidth: '18mm' }}
              />
            ) : principalName ? (
              <p
                className="leading-none"
                style={{
                  color: brandColor,
                  fontSize: '7.5px',
                  fontFamily: '"Segoe Script", "Brush Script MT", cursive',
                }}
              >
                {principalName}
              </p>
            ) : null}
            <div
              style={{
                width: '16mm',
                borderTop: '0.5px solid #4b5563',
                marginTop: '0.4mm',
              }}
            />
            <p
              className="font-semibold text-gray-900"
              style={{ fontSize: '5.5px', marginTop: '0.3mm' }}
            >
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
            In case of emergency, contact school office
          </div>
        </div>
      </div>
    </div>
  );
}
