'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import SettingsNav from '@/features/settings/components/SettingsNav';
import AnnualMarksheet, { type MarksheetData } from '@/features/exams/components/AnnualMarksheet';
import {
  DEFAULT_REPORT_SETTINGS,
  REPORT_HEADER_OPTIONS,
  REPORT_TEMPLATE_OPTIONS,
  type ReportSettings,
} from '@/lib/report-settings';
import { FiCheckCircle, FiImage, FiPrinter, FiSave, FiUpload } from 'react-icons/fi';

const PREVIEW_DATA: MarksheetData = {
  student: {
    first_name: 'Aryan',
    last_name: 'Sharma',
    admission_number: 'ADM20261234',
    roll_number: '1',
    date_of_birth: '2013-06-15',
    mother_name: 'Neha Sharma',
    father_name: 'Rajeev Sharma',
    class_name: 'Class 1',
    section_name: 'A',
    photo_url: null,
  },
  subjects: [
    {
      subject_name: 'English',
      half_yearly: { max_marks: 100, marks_obtained: 88 },
      annual: { max_marks: 100, marks_obtained: 92 },
      total_max: 200,
      total_obtained: 180,
      percentage: 90,
      grade: 'A2',
      remarks: 'VERY GOOD',
    },
    {
      subject_name: 'Mathematics',
      half_yearly: { max_marks: 100, marks_obtained: 90 },
      annual: { max_marks: 100, marks_obtained: 95 },
      total_max: 200,
      total_obtained: 185,
      percentage: 92.5,
      grade: 'A1',
      remarks: 'EXCELLENT',
    },
  ],
  summary: {
    half_yearly_total: { max: 200, obtained: 178 },
    annual_total: { max: 200, obtained: 187 },
    grand_total: { max: 400, obtained: 365 },
    percentage: 91.25,
    overall_grade: 'A1',
    overall_remarks: 'EXCELLENT',
    overall_grade_label: 'A1 (EXCELLENT)',
    result: 'PASS',
  },
};

async function uploadFile(file: File, folder: string): Promise<string | null> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`/api/upload?folder=${folder}`, { method: 'POST', body: form });
  const data = await res.json();
  return data.success ? data.data.url : null;
}

export default function ReportSettingsPage() {
  const [settings, setSettings] = useState<ReportSettings>({ ...DEFAULT_REPORT_SETTINGS });
  const [schoolName, setSchoolName] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploading, setUploading] = useState<'logo' | 'signature' | 'watermark' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/settings/reports');
    const data = await res.json();
    if (data.success) {
      const { school_name, academic_year, ...reportSettings } = data.data;
      setSettings(reportSettings as ReportSettings);
      setSchoolName(school_name || '');
      setAcademicYear(academic_year || '');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = <K extends keyof ReportSettings>(key: K, value: ReportSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const res = await fetch('/api/settings/reports', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (data.success) {
      setMessage({ type: 'success', text: 'Report settings saved successfully.' });
    } else {
      setMessage({ type: 'error', text: data.error || 'Failed to save settings' });
    }
    setSaving(false);
  };

  const handleUpload = async (file: File | undefined, type: 'logo' | 'signature' | 'watermark') => {
    if (!file) return;
    setUploading(type);
    const url = await uploadFile(file, 'reports');
    if (url) {
      if (type === 'logo') update('logo_url', url);
      else if (type === 'signature') update('counsellor_signature_url', url);
      else update('watermark_url', url);

      const labels = {
        logo: 'Logo',
        signature: 'Signature',
        watermark: 'Watermark',
      };
      setMessage({ type: 'success', text: `${labels[type]} uploaded.` });
    } else {
      setMessage({ type: 'error', text: 'Upload failed. Use PNG or JPG under 50MB.' });
    }
    setUploading(null);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="print:hidden">
          {/* <SettingsNav /> */}
          <p className="text-sm text-gray-500">Loading report settings...</p>
        </div>
      </DashboardLayout>
    );
  }

  const previewSchool = {
    school_name: schoolName || 'Your School Name',
    school_address: '',
    academic_year: academicYear || '2025-26',
    school_code: settings.school_code,
    affiliation_number: settings.affiliation_number,
  };

  const previewMarksheet = (
    <AnnualMarksheet
      data={PREVIEW_DATA}
      school={previewSchool}
      annualExamName="Class 1 Annual Exam"
      halfYearlyExamName="Class 1 Half-Yearly Exam"
      reportSettings={settings}
    />
  );

  return (
    <DashboardLayout>
      <div className="space-y-0 min-w-0 max-w-full print:space-y-0">
        <div className="print:hidden">
          {/* <SettingsNav /> */}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-xl text-gray-900">Report Settings</h1>
            <p className="text-sm text-gray-500 mt-1 mb-2">
              Configure report card template, header design, logos, watermarks, and signatures
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50"
          >
            <FiSave size={16} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {message && (
          <div
            className={`print:hidden flex items-center gap-2 p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.type === 'success' && <FiCheckCircle />}
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left: form */}
          <div className="space-y-6 print:hidden xl:col-span-4 2xl:col-span-3">
            {/* Template */}
            <section className="bg-white border rounded-xl p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Report Template</h2>
              <div className="space-y-2">
                {REPORT_TEMPLATE_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      settings.template === opt.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="template"
                      checked={settings.template === opt.id}
                      onChange={() => update('template', opt.id)}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-sm">{opt.label}</p>
                      <p className="text-xs text-gray-500">{opt.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* Header design */}
            <section className="bg-white border rounded-xl p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Report Card Header Design</h2>
              <div className="space-y-2">
                {REPORT_HEADER_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      settings.header_style === opt.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="header_style"
                      checked={settings.header_style === opt.id}
                      onChange={() => update('header_style', opt.id)}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-sm">{opt.label}</p>
                      <p className="text-xs text-gray-500">{opt.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* Board & school details */}
            <section className="bg-white border rounded-xl p-5 space-y-4">
              <h2 className="font-semibold text-gray-900">Board & School Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Board Name</label>
                  <input
                    value={settings.board_name}
                    onChange={(e) => update('board_name', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="CBSE"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">School Code / No.</label>
                  <input
                    value={settings.school_code}
                    onChange={(e) => update('school_code', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="12345"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Affiliation Number</label>
                  <input
                    value={settings.affiliation_number}
                    onChange={(e) => update('affiliation_number', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="2134567"
                  />
                </div>
              </div>
            </section>

            {/* Header text */}
            <section className="bg-white border rounded-xl p-5 space-y-4">
              <h2 className="font-semibold text-gray-900">Header Text</h2>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Header (Hindi)</label>
                <input
                  value={settings.header_hindi}
                  onChange={(e) => update('header_hindi', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Header (English)</label>
                <input
                  value={settings.header_english}
                  onChange={(e) => update('header_english', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Subtitle</label>
                <input
                  value={settings.header_subtitle}
                  onChange={(e) => update('header_subtitle', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Theme Color</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={settings.primary_color}
                    onChange={(e) => update('primary_color', e.target.value)}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <input
                    value={settings.primary_color}
                    onChange={(e) => update('primary_color', e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono"
                  />
                </div>
              </div>
            </section>

            {/* Logo */}
            <section className="bg-white border rounded-xl p-5 space-y-3">
              <h2 className="font-semibold text-gray-900">School / Board Logo</h2>
              <div className="flex items-center gap-4">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="w-16 h-16 object-contain border rounded" />
                ) : (
                  <div className="w-16 h-16 border rounded flex items-center justify-center bg-gray-50">
                    <FiImage className="text-gray-400" />
                  </div>
                )}
                <label className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm cursor-pointer hover:bg-gray-50">
                  <FiUpload size={14} />
                  {uploading === 'logo' ? 'Uploading...' : 'Upload Logo'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading === 'logo'}
                    onChange={(e) => handleUpload(e.target.files?.[0], 'logo')}
                  />
                </label>
                {settings.logo_url && (
                  <button
                    type="button"
                    onClick={() => update('logo_url', '')}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </section>

            {/* Watermark */}
            <section className="bg-white border rounded-xl p-5 space-y-4">
              <div>
                <h2 className="font-semibold text-gray-900">Document Watermark</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Applied to report cards, marksheets, certificates, ID cards, gate passes, and other
                  printed documents.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.show_watermark}
                  onChange={(e) => update('show_watermark', e.target.checked)}
                  className="rounded"
                />
                Show watermark on documents
              </label>
              <div className="flex items-center gap-4">
                {settings.watermark_url ? (
                  <img
                    src={settings.watermark_url}
                    alt="Watermark"
                    className="w-20 h-20 object-contain border rounded bg-gray-50 p-1 opacity-60"
                  />
                ) : (
                  <div className="w-20 h-20 border rounded flex items-center justify-center bg-gray-50">
                    <FiImage className="text-gray-400" />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm cursor-pointer hover:bg-gray-50">
                    <FiUpload size={14} />
                    {uploading === 'watermark' ? 'Uploading...' : 'Upload Watermark'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading === 'watermark'}
                      onChange={(e) => handleUpload(e.target.files?.[0], 'watermark')}
                    />
                  </label>
                  {settings.watermark_url && (
                    <button
                      type="button"
                      onClick={() => update('watermark_url', '')}
                      className="block text-xs text-red-600 hover:underline"
                    >
                      Remove watermark image
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Watermark text (optional, used when no image is uploaded)
                </label>
                <input
                  value={settings.watermark_text}
                  onChange={(e) => update('watermark_text', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. SCHOOL NAME or initials"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  If left blank, school initials are used automatically.
                </p>
              </div>
            </section>

            {/* Counsellor signature */}
            <section className="bg-white border rounded-xl p-5 space-y-4">
              <h2 className="font-semibold text-gray-900">Counsellor / Controller Signature</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Name</label>
                  <input
                    value={settings.counsellor_name}
                    onChange={(e) => update('counsellor_name', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Dr. Joseph Emmanuel"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Designation</label>
                  <input
                    value={settings.counsellor_title}
                    onChange={(e) => update('counsellor_title', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Controller of Examinations"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                {settings.counsellor_signature_url ? (
                  <img
                    src={settings.counsellor_signature_url}
                    alt="Signature"
                    className="h-14 max-w-[160px] object-contain border rounded bg-white"
                  />
                ) : (
                  <div className="h-14 w-40 border rounded flex items-center justify-center bg-gray-50 text-xs text-gray-400">
                    No signature
                  </div>
                )}
                <label className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm cursor-pointer hover:bg-gray-50">
                  <FiUpload size={14} />
                  {uploading === 'signature' ? 'Uploading...' : 'Upload Signature'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading === 'signature'}
                    onChange={(e) => handleUpload(e.target.files?.[0], 'signature')}
                  />
                </label>
                {settings.counsellor_signature_url && (
                  <button
                    type="button"
                    onClick={() => update('counsellor_signature_url', '')}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </section>

            {/* Display options */}
            <section className="bg-white border rounded-xl p-5 space-y-3">
              <h2 className="font-semibold text-gray-900">Display Options</h2>
              {(
                [
                  ['show_qr_code', 'Show QR code on report'],
                  ['show_grading_scale', 'Show grading scale table'],
                  ['show_signature', 'Show counsellor signature block'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings[key]}
                    onChange={(e) => update(key, e.target.checked)}
                    className="rounded"
                  />
                  {label}
                </label>
              ))}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Custom Footer Note (optional)</label>
                <textarea
                  value={settings.footer_note}
                  onChange={(e) => update('footer_note', e.target.value)}
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Additional note printed on the report card"
                />
              </div>
            </section>
          </div>

          {/* Right: live preview */}
          <div className="xl:col-span-8 2xl:col-span-9 xl:sticky xl:top-4 xl:self-start print:static">
            <div className="bg-white border rounded-xl p-4 print:border-0 print:p-0 print:bg-transparent">
              <div className="flex items-center justify-between gap-3 mb-3 print:hidden">
                <h2 className="font-semibold text-gray-900">Live Preview</h2>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <FiPrinter size={16} />
                  Print Template
                </button>
              </div>
              <div className="print:hidden overflow-x-auto border rounded-lg bg-gray-100 p-2 max-h-[80vh] overflow-y-auto">
                <div className="origin-top-left scale-[0.6] sm:scale-[0.72] xl:scale-[0.82] 2xl:scale-[0.92] w-[820px]">
                  {previewMarksheet}
                </div>
              </div>
              <div className="hidden print:block">{previewMarksheet}</div>
              <p className="text-xs text-gray-500 mt-2 print:hidden">
                Print uses the current template, header, logo, watermark, and signature settings shown in the preview.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .marksheet-page,
          .marksheet-page * {
            visibility: visible;
          }
          .marksheet-page {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0 !important;
            box-shadow: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 2mm;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
