import type { Student } from '@/shared/types';
import type {
  TransferCertificateOptions,
  TransferCertificateSchoolInfo,
} from '@/features/students/components/TransferCertificate';
import {
  formatAcademicYearLabel,
  resolveAssetUrl,
  resolveDocumentWatermarkUrl,
  resolveSchoolLogoUrl,
  type SchoolDocumentReportSettings,
} from '@/features/students/utils/school-document-utils';
import { studentFullName } from '@/features/students/utils/student-profile';

export interface TransferCertificateStudentSnapshot {
  id: number;
  admission_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  full_name: string;
  date_of_birth?: string | null;
  gender?: string | null;
  class_name?: string | null;
  section_name?: string | null;
  roll_number?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  admission_date?: string | null;
  city?: string | null;
  photo_url?: string | null;
  address?: string | null;
  state?: string | null;
  pincode?: string | null;
}

export interface TransferCertificateLogEntry {
  student_id: number;
  tc_number: string;
  options: TransferCertificateOptions;
  student_snapshot: TransferCertificateStudentSnapshot;
  school_snapshot: TransferCertificateSchoolInfo;
}

function toIsoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

export function buildStudentSnapshot(student: Student): TransferCertificateStudentSnapshot {
  return {
    id: student.id,
    admission_number: student.admission_number,
    first_name: student.first_name,
    middle_name: student.middle_name,
    last_name: student.last_name,
    full_name: studentFullName(student),
    date_of_birth: toIsoDate(student.date_of_birth),
    gender: student.gender,
    class_name: student.class_name,
    section_name: student.section_name,
    roll_number: student.roll_number,
    parent_name: student.parent_name,
    parent_phone: student.parent_phone,
    admission_date: toIsoDate(student.admission_date),
    city: student.city,
    photo_url: student.photo_url,
    address: student.address,
    state: student.state,
    pincode: student.pincode,
  };
}

export function snapshotToStudent(snapshot: TransferCertificateStudentSnapshot): Student {
  const fallbackDate = new Date();
  return {
    id: snapshot.id,
    admission_number: snapshot.admission_number,
    first_name: snapshot.first_name,
    middle_name: snapshot.middle_name,
    last_name: snapshot.last_name,
    date_of_birth: snapshot.date_of_birth ? new Date(snapshot.date_of_birth) : fallbackDate,
    gender: (snapshot.gender as Student['gender']) || 'Other',
    admission_date: snapshot.admission_date ? new Date(snapshot.admission_date) : fallbackDate,
    class_name: snapshot.class_name ?? undefined,
    section_name: snapshot.section_name ?? undefined,
    roll_number: snapshot.roll_number ?? undefined,
    parent_name: snapshot.parent_name ?? undefined,
    parent_phone: snapshot.parent_phone ?? undefined,
    city: snapshot.city ?? undefined,
    photo_url: snapshot.photo_url ?? undefined,
    address: snapshot.address ?? undefined,
    state: snapshot.state ?? undefined,
    pincode: snapshot.pincode ?? undefined,
    status: 'active',
    created_at: fallbackDate,
    updated_at: fallbackDate,
  };
}

export function parseSchoolSnapshot(
  snapshot: Record<string, unknown> | TransferCertificateSchoolInfo,
): TransferCertificateSchoolInfo {
  const s = snapshot as TransferCertificateSchoolInfo;
  return {
    name: s.name || 'School',
    address: s.address,
    logoUrl: resolveAssetUrl(s.logoUrl),
    academicYear: s.academicYear,
    phone: s.phone,
    email: s.email,
    principalName: s.principalName,
    signatureUrl: resolveAssetUrl(s.signatureUrl),
  };
}

export function buildTransferCertificateSchoolInfo(
  settings: {
    school_name?: string;
    school_address?: string;
    school_phone?: string;
    school_email?: string;
    academic_year?: string;
    logo_url?: string;
  },
  reportSettings?: {
    counsellor_name?: string;
    counsellor_signature_url?: string;
    logo_url?: string;
    show_watermark?: boolean;
    watermark_url?: string;
    watermark_text?: string;
    primary_color?: string;
  },
): TransferCertificateSchoolInfo {
  const mergedReportSettings: SchoolDocumentReportSettings | undefined = reportSettings
    ? {
        logo_url: reportSettings.logo_url,
        counsellor_name: reportSettings.counsellor_name,
        counsellor_signature_url: reportSettings.counsellor_signature_url,
        show_watermark: reportSettings.show_watermark,
        watermark_url: reportSettings.watermark_url,
        watermark_text: reportSettings.watermark_text,
        primary_color: reportSettings.primary_color,
      }
    : undefined;

  return {
    name: settings.school_name?.trim() || 'School',
    address: settings.school_address?.trim() || undefined,
    logoUrl: resolveSchoolLogoUrl(settings, mergedReportSettings),
    academicYear: formatAcademicYearLabel(settings.academic_year),
    phone: settings.school_phone?.trim() || undefined,
    email: settings.school_email?.trim() || undefined,
    principalName: reportSettings?.counsellor_name?.trim() || undefined,
    signatureUrl: resolveAssetUrl(reportSettings?.counsellor_signature_url),
    showWatermark: reportSettings?.show_watermark !== false,
    watermarkUrl: resolveDocumentWatermarkUrl(mergedReportSettings),
    watermarkText: reportSettings?.watermark_text?.trim() || undefined,
    watermarkColor: reportSettings?.primary_color?.trim() || undefined,
  };
}

/** Apply current school settings for letterhead; ignore stale saved snapshot branding. */
export function enrichSchoolSnapshot(
  snapshot: TransferCertificateSchoolInfo,
  fallback?: TransferCertificateSchoolInfo,
): TransferCertificateSchoolInfo {
  if (!fallback) return snapshot;
  return {
    name: fallback.name || snapshot.name?.trim() || 'School',
    address: fallback.address || snapshot.address?.trim() || undefined,
    logoUrl: resolveAssetUrl(fallback.logoUrl || snapshot.logoUrl),
    academicYear: fallback.academicYear || snapshot.academicYear,
    phone: fallback.phone || snapshot.phone,
    email: fallback.email || snapshot.email,
    principalName: fallback.principalName || snapshot.principalName,
    signatureUrl: resolveAssetUrl(fallback.signatureUrl || snapshot.signatureUrl),
    showWatermark: fallback.showWatermark ?? snapshot.showWatermark,
    watermarkUrl: resolveAssetUrl(fallback.watermarkUrl || snapshot.watermarkUrl),
    watermarkText: fallback.watermarkText || snapshot.watermarkText,
    watermarkColor: fallback.watermarkColor || snapshot.watermarkColor,
  };
}

export function parseOptionsSnapshot(
  snapshot: Record<string, unknown> | TransferCertificateOptions
): TransferCertificateOptions {
  const o = snapshot as TransferCertificateOptions;
  return {
    tcNumber: o.tcNumber || '',
    issueDate: o.issueDate || '',
    dateOfLeaving: o.dateOfLeaving || '',
    reasonForLeaving: o.reasonForLeaving || '',
    conduct: o.conduct || '',
    qualifiedForPromotion: o.qualifiedForPromotion || 'Yes',
  };
}

export function parseStudentSnapshot(
  snapshot: Record<string, unknown> | TransferCertificateStudentSnapshot
): TransferCertificateStudentSnapshot {
  return snapshot as TransferCertificateStudentSnapshot;
}
