'use client';

import { useEffect, useMemo, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import type { Staff } from '@/shared/types';
import type { StaffListItem } from './VirtualizedStaffTable';

export interface StaffIdCardSchoolInfo {
  name: string;
  logoUrl?: string;
  phone?: string;
  address?: string;
  website?: string;
  academicYear?: string;
  principalName?: string;
  signatureUrl?: string;
}

interface StaffIdCardProps {
  staff: Staff | StaffListItem;
  school: StaffIdCardSchoolInfo;
}

const CARD_BLUE = '#1e3a8a';
const CARD_BLUE_DARK = '#172554';
const TAB_WIDTH = '8mm';
const CONTENT_RIGHT_PAD = '9.5mm';

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

function formatDateOfJoining(doj: Date | string | undefined | null): string {
  if (!doj) return '';
  const d = new Date(doj);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function validUptoFromAcademicYear(academicYear?: string): string {
  if (!academicYear) return '';
  const match = academicYear.match(/(\d{4})\s*[-–]\s*(\d{2,4})/);
  if (!match) return '';
  const endYear = match[2].length === 2 ? `20${match[2]}` : match[2];
  return `31 May ${endYear}`;
}

function staffFormattedName(staff: Staff | StaffListItem): string {
  const name = `${staff.first_name} ${staff.last_name}`.trim();
  const title =
    staff.gender === 'Female' ? 'Ms.' : staff.gender === 'Male' ? 'Mr.' : '';
  return title ? `${title} ${name}` : name;
}

function staffDesignation(staff: Staff | StaffListItem): string {
  const item = staff as StaffListItem;
  return item.designation_name || staff.designation || '';
}

function staffInitials(staff: Staff | StaffListItem): string {
  return `${staff.first_name.charAt(0)}${staff.last_name.charAt(0)}`.toUpperCase();
}

function StaffBarcode({ value }: { value: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !value.trim()) return;

    svg.innerHTML = '';
    try {
      JsBarcode(svg, value.trim(), {
        format: 'CODE128',
        displayValue: false,
        margin: 0,
        width: 1.35,
        height: 42,
        lineColor: '#111827',
        background: 'transparent',
      });
    } catch {
      svg.innerHTML = '';
    }
  }, [value]);

  return (
    <svg
      ref={svgRef}
      role="img"
      aria-label={`Barcode for ${value}`}
      className="mx-auto block w-full"
      style={{ height: '9.5mm', maxWidth: '100%' }}
    />
  );
}

function FieldRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div
      className="grid items-baseline"
      style={{
        gridTemplateColumns: '26mm 1fr',
        columnGap: '2mm',
        fontSize: '10px',
        lineHeight: '12px',
      }}
    >
      <span className="font-semibold whitespace-nowrap" style={{ color: CARD_BLUE }}>
        {label} :
      </span>
      <span className="font-bold text-gray-900">{value?.trim() || ''}</span>
    </div>
  );
}

function CardBackgroundStamp({ logoUrl }: { logoUrl?: string }) {
  const src = logoUrl?.trim();
  if (!src) return null;

  return (
    <img
      src={src}
      alt=""
      aria-hidden
      className="pointer-events-none absolute object-contain"
      style={{
        right: '14mm',
        top: '42%',
        width: '30mm',
        height: '30mm',
        transform: 'translateY(-50%)',
        opacity: 0.07,
      }}
    />
  );
}

export default function StaffIdCard({ staff, school }: StaffIdCardProps) {
  const fullName = staffFormattedName(staff);
  const designation = staffDesignation(staff);
  const employeeId = staff.employee_id?.trim() || '';
  const validUpto = validUptoFromAcademicYear(school.academicYear);
  const principalName = school.principalName?.trim() || '';
  const signatureUrl = school.signatureUrl?.trim() || '';
  const [schoolAddressLine1, schoolAddressLine2] = useMemo(
    () => splitIntoTwoLines(school.address),
    [school.address],
  );

  const contactLine = [
    school.phone?.trim() ? `Ph: ${school.phone.trim()}` : '',
    school.website?.trim() || '',
  ]
    .filter(Boolean)
    .join(' | ');

  return (
    <div className="staff-id-card-sheet break-inside-avoid">
      <div
        className="staff-id-card relative overflow-hidden bg-white text-gray-900 shadow-md"
        style={{
          width: '106mm',
          height: '66mm',
          borderRadius: '8px',
          border: `2px solid ${CARD_BLUE}`,
        }}
      >
        {/* Vertical STAFF ID tab */}
        <div
          className="absolute z-30 flex items-center justify-center font-bold uppercase text-white"
          style={{
            right: 0,
            top: 0,
            bottom: 0,
            width: TAB_WIDTH,
            backgroundColor: CARD_BLUE_DARK,
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            fontSize: '8px',
            letterSpacing: '1.2px',
          }}
        >
          STAFF ID
        </div>

        {/* Header */}
        <div
          className="relative z-20"
          style={{
            height: '18mm',
            backgroundColor: CARD_BLUE,
            padding: `2.5mm ${CONTENT_RIGHT_PAD} 2mm 3mm`,
          }}
        >
          <div className="flex min-w-0 items-start gap-[2.5mm]">
            <div
              className="flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-white"
              style={{ width: '12mm', height: '12mm' }}
            >
              {school.logoUrl ? (
                <img
                  src={school.logoUrl}
                  alt=""
                  className="h-full w-full object-contain p-[0.6mm]"
                />
              ) : (
                <span className="text-[7px] font-bold" style={{ color: CARD_BLUE }}>
                  EDU
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1 pt-[0.3mm]">
              <p
                className="font-bold uppercase tracking-wide text-white"
                style={{ fontSize: '12.5px', lineHeight: '12px' }}
              >
                {school.name}
              </p>
              {schoolAddressLine1 ? (
                <p
                  className="text-blue-100"
                  style={{ fontSize: '7px', lineHeight: '9px', marginTop: '1mm' }}
                >
                  {schoolAddressLine1}
                  {schoolAddressLine2 ? (
                    <>
                      <br />
                      {schoolAddressLine2}
                    </>
                  ) : null}
                </p>
              ) : null}
              {contactLine ? (
                <p
                  className="text-blue-100"
                  style={{ fontSize: '7px', lineHeight: '9px', marginTop: '0.6mm' }}
                >
                  {contactLine}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Body */}
        <div
          className="relative z-10 flex flex-col"
          style={{
            height: '45mm',
            padding: `3mm ${CONTENT_RIGHT_PAD} 2.5mm 3mm`,
          }}
        >
          <CardBackgroundStamp logoUrl={school.logoUrl} />

          {/* Main details row */}
          <div className="relative z-10 flex min-h-0 flex-1 gap-[4mm]">
            <div className="flex shrink-0 flex-col" style={{ width: '24mm' }}>
              <div
                className="overflow-hidden rounded-md bg-gray-100"
                style={{
                  width: '24mm',
                  height: '26mm',
                  border: `2px solid ${CARD_BLUE}`,
                }}
              >
                {staff.photo_url ? (
                  <img
                    src={staff.photo_url}
                    alt={fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center font-bold text-gray-500"
                    style={{ fontSize: '16px' }}
                  >
                    {staffInitials(staff)}
                  </div>
                )}
              </div>
            </div>

            <div
              className="flex min-w-0 flex-1 flex-col"
              style={{ gap: '2mm', paddingTop: '1mm', paddingRight: '2mm' }}
            >
              <FieldRow label="Name" value={fullName} />
              <FieldRow label="Designation" value={designation} />
              <FieldRow label="Employee ID" value={employeeId} />
              <FieldRow label="Date of Joining" value={formatDateOfJoining(staff.date_of_joining)} />
            </div>
          </div>

          {/* Footer row: signature | barcode | validity */}
          <div
            className="relative z-10 flex shrink-0 items-end gap-[4mm]"
            style={{ marginTop: '2mm', minHeight: '13mm' }}
          >
            <div className="shrink-0 text-center" style={{ width: '24mm' }}>
              {signatureUrl ? (
                <img
                  src={signatureUrl}
                  alt="Authorised signatory"
                  className="mx-auto object-contain"
                  style={{ height: '8mm', maxWidth: '22mm' }}
                />
              ) : principalName ? (
                <p
                  className="font-serif italic text-gray-900"
                  style={{ fontSize: '8px', lineHeight: '9px' }}
                >
                  {principalName}
                </p>
              ) : null}
              <div
                className="mx-auto"
                style={{
                  width: '20mm',
                  marginTop: signatureUrl || principalName ? '0.8mm' : 0,
                  borderTop: `0.75px solid ${CARD_BLUE}`,
                }}
              />
              <p
                className="font-semibold"
                style={{ color: CARD_BLUE, fontSize: '5.5px', marginTop: '0.8mm', lineHeight: '7px' }}
              >
                Authorised Signatory
              </p>
            </div>

            <div className="min-w-0 flex-1 text-center" style={{ paddingBottom: '0.5mm' }}>
              {employeeId ? (
                <>
                  <StaffBarcode value={employeeId} />
                  <p
                    className="font-mono font-semibold tracking-wide text-gray-900"
                    style={{ fontSize: '6.5px', lineHeight: '8px', marginTop: '0.8mm' }}
                  >
                    {employeeId}
                  </p>
                </>
              ) : null}
            </div>

            {validUpto ? (
              <div className="shrink-0 text-right" style={{ width: '16mm', paddingBottom: '0.5mm' }}>
                <div
                  className="inline-block rounded font-bold uppercase text-white"
                  style={{
                    backgroundColor: CARD_BLUE,
                    fontSize: '5.5px',
                    lineHeight: '7px',
                    padding: '0.8mm 1.5mm',
                  }}
                >
                  Valid Upto
                </div>
                <p
                  className="mt-[1mm] font-bold"
                  style={{ color: CARD_BLUE, fontSize: '8px', lineHeight: '10px' }}
                >
                  {validUpto}
                </p>
              </div>
            ) : (
              <div className="shrink-0" style={{ width: '16mm' }} />
            )}
          </div>
        </div>

        {/* Bottom accent */}
        <div
          className="absolute bottom-0 left-0 z-20"
          style={{
            right: TAB_WIDTH,
            height: '1.2mm',
            backgroundColor: CARD_BLUE,
          }}
        />
      </div>
    </div>
  );
}
