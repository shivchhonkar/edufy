'use client';

import { FiMapPin, FiPhone, FiMail } from 'react-icons/fi';
import DocumentWatermark from '@/shared/components/documents/DocumentWatermark';
import { GATE_PASS_APPROVAL_LABELS } from '@/lib/gate-pass-utils';
import type { GatePassGuardianPhoto } from '@/lib/gate-pass-utils';

export interface GatePassSchoolInfo {
  name: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  academicYear?: string;
  showWatermark?: boolean;
  watermarkUrl?: string;
  watermarkText?: string;
  watermarkColor?: string;
}

export interface GatePassDocumentData {
  pass_number: string;
  student_snapshot?: {
    full_name?: string;
    admission_number?: string;
    class_name?: string;
    section_name?: string;
    photo_url?: string | null;
    guardian_photos?: GatePassGuardianPhoto[];
  };
  collector_name: string;
  collector_mobile: string;
  collector_relationship: string;
  collector_photo_url?: string | null;
  reason: string;
  approval_method?: string | null;
  otp_sent_to_mobile?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  exit_at?: string | null;
  status: string;
  created_by_name?: string | null;
  created_at: string;
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function relationshipLabel(value: string) {
  const labels: Record<string, string> = {
    father: 'Father',
    mother: 'Mother',
    guardian: 'Guardian',
    relative: 'Relative',
    other: 'Other',
  };
  return labels[value] || value;
}

function PhotoFrame({
  label,
  sublabel,
  url,
  emptyText = 'Not available',
}: {
  label: string;
  sublabel?: string;
  url?: string | null;
  emptyText?: string;
}) {
  return (
    <div className="flex flex-col items-center min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1 text-center w-full truncate">
        {label}
      </p>
      {sublabel && (
        <p className="text-[10px] text-slate-400 mb-2 text-center w-full truncate">{sublabel}</p>
      )}
      <div className="w-full aspect-[3/4] max-h-[140px] rounded-lg border-2 border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
        {url ? (
          <img src={url} alt={label} className="w-full h-full object-cover" />
        ) : (
          <span className="text-[10px] text-slate-400 text-center px-2">{emptyText}</span>
        )}
      </div>
    </div>
  );
}

function buildPhotoSlots(record: GatePassDocumentData) {
  const slots: Array<{ key: string; label: string; sublabel?: string; url?: string | null; alwaysShow?: boolean }> = [];

  if (record.student_snapshot?.photo_url?.trim()) {
    slots.push({
      key: 'student',
      label: 'Student',
      sublabel: record.student_snapshot.full_name,
      url: record.student_snapshot.photo_url,
    });
  }

  for (const guardian of record.student_snapshot?.guardian_photos || []) {
    if (!guardian.photo_url?.trim()) continue;
    slots.push({
      key: `guardian-${guardian.relation_type}-${guardian.name}`,
      label: relationshipLabel(guardian.relation_type),
      sublabel: guardian.name,
      url: guardian.photo_url,
    });
  }

  slots.push({
    key: 'collector',
    label: 'Collector',
    sublabel: record.collector_name,
    url: record.collector_photo_url,
    alwaysShow: true,
  });

  return slots;
}

interface GatePassDocumentProps {
  record: GatePassDocumentData;
  school: GatePassSchoolInfo;
  className?: string;
  id?: string;
}

export default function GatePassDocument({
  record,
  school,
  className = '',
  id,
}: GatePassDocumentProps) {
  const classSection = [record.student_snapshot?.class_name, record.student_snapshot?.section_name]
    .filter(Boolean)
    .join(' · ');
  const photoSlots = buildPhotoSlots(record);

  return (
    <article
      id={id}
      className={`gate-pass-document relative w-full overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-sm ${className}`}
    >
      <DocumentWatermark
        show={school.showWatermark !== false}
        imageUrl={school.watermarkUrl}
        text={school.watermarkText}
        schoolName={school.name}
        color={school.watermarkColor}
      />
      <div className="relative z-10">
      {/* School header */}
      <header className="border-b-4 border-primary-600 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
        <div className="flex items-start gap-4">
          {school.logoUrl ? (
            <img
              src={school.logoUrl}
              alt=""
              className="h-14 w-14 rounded-lg border border-slate-200 object-contain bg-white p-1 shrink-0"
            />
          ) : (
            <div className="h-14 w-14 rounded-lg bg-primary-600 text-white flex items-center justify-center text-lg font-bold shrink-0">
              {school.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-slate-900 leading-tight">{school.name}</h1>
            {school.academicYear && (
              <p className="text-xs text-primary-700 font-medium mt-0.5">
                Academic Year {school.academicYear}
              </p>
            )}
            <div className="mt-2 space-y-0.5 text-xs text-slate-600">
              {school.address?.trim() && (
                <p className="flex items-start gap-1.5">
                  <FiMapPin className="mt-0.5 shrink-0 text-slate-400" size={12} />
                  <span>{school.address}</span>
                </p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                {school.phone?.trim() && (
                  <span className="flex items-center gap-1">
                    <FiPhone size={11} className="text-slate-400" />
                    {school.phone}
                  </span>
                )}
                {school.email?.trim() && (
                  <span className="flex items-center gap-1">
                    <FiMail size={11} className="text-slate-400" />
                    {school.email}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Title band */}
      <div className="bg-primary-600 px-5 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold tracking-widest text-white uppercase">
          Student Gate Pass
        </h2>
        <span
          className={`text-[10px] font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full border ${
            record.status === 'approved'
              ? 'bg-white/20 text-white border-white/40'
              : record.status === 'pending'
                ? 'bg-amber-300/30 text-amber-50 border-amber-200/50'
                : 'bg-white/15 text-white border-white/30'
          }`}
        >
          {record.status}
        </span>
      </div>

      {/* Pass meta — always 3 columns at document width */}
      <div className="grid grid-cols-3 gap-px bg-slate-200 border-b border-slate-200">
        <div className="bg-white px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
            Pass Number
          </p>
          <p className="text-sm font-mono font-bold text-primary-800 mt-0.5">{record.pass_number}</p>
        </div>
        <div className="bg-white px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
            Issued On
          </p>
          <p className="text-sm font-medium text-slate-900 mt-0.5">
            {formatDateTime(record.created_at)}
          </p>
        </div>
        <div className="bg-white px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
            Exit Date &amp; Time
          </p>
          <p className="text-sm font-medium text-slate-900 mt-0.5">
            {record.exit_at ? formatDateTime(record.exit_at) : 'Pending authorization'}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-primary-700 border-b border-primary-100 pb-1 mb-3">
              Student Details
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-slate-500 text-xs">Name</dt>
                <dd className="font-semibold text-slate-900">
                  {record.student_snapshot?.full_name || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs">Admission No.</dt>
                <dd className="font-medium text-slate-900 font-mono text-xs">
                  {record.student_snapshot?.admission_number || '—'}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-500 text-xs">Class / Section</dt>
                <dd className="font-medium text-slate-900">{classSection || '—'}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-primary-700 border-b border-primary-100 pb-1 mb-3">
              Person Collecting Student
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-slate-500 text-xs">Name</dt>
                <dd className="font-semibold text-slate-900">{record.collector_name}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs">Relationship</dt>
                <dd className="font-medium text-slate-900">
                  {relationshipLabel(record.collector_relationship)}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-500 text-xs">Mobile</dt>
                <dd className="font-medium text-slate-900 font-mono">{record.collector_mobile}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-primary-700 border-b border-primary-100 pb-1 mb-2">
            Reason for Early Departure
          </h3>
          <p className="text-sm text-slate-800 leading-relaxed bg-slate-50 rounded-lg border border-slate-100 px-3 py-2">
            {record.reason}
          </p>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-primary-700 border-b border-primary-100 pb-2 mb-3">
            Photographs
          </h3>
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${Math.min(photoSlots.length, 4)}, minmax(0, 1fr))`,
            }}
          >
            {photoSlots.map((slot) => (
              <PhotoFrame
                key={slot.key}
                label={slot.label}
                sublabel={slot.sublabel}
                url={slot.url}
                emptyText={slot.alwaysShow ? 'Capture at gate' : 'Not available'}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Authorization footer */}
      <footer className="border-t border-slate-200 bg-slate-50 px-5 py-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-3">
          Authorization &amp; Audit
        </h3>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <dt className="text-slate-500">Approval Method</dt>
            <dd className="font-semibold text-slate-900 mt-0.5">
              {record.approval_method
                ? GATE_PASS_APPROVAL_LABELS[record.approval_method] || record.approval_method
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Approved By</dt>
            <dd className="font-medium text-slate-900 mt-0.5">{record.approved_by_name || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Issued By</dt>
            <dd className="font-medium text-slate-900 mt-0.5">{record.created_by_name || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">OTP Sent To</dt>
            <dd className="font-medium text-slate-900 mt-0.5 font-mono">
              {record.otp_sent_to_mobile || '—'}
            </dd>
          </div>
        </dl>
        {record.approved_at && (
          <p className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-slate-200">
            Approved at {formatDateTime(record.approved_at)}
          </p>
        )}
      </footer>
      </div>
    </article>
  );
}
