'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { useSettings } from '@/shared/SettingsContext';
import {
  getDefaultAcademicYearConfig,
  formatAcademicYearDates,
} from '@/lib/academic-year-utils';
import {
  DEFAULT_REPORT_SETTINGS,
  buildFullSchoolAddress,
  extractStreetFromSchoolAddress,
  mergeReportSettings,
  type ReportSettings,
} from '@/lib/report-settings';
import {
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiChevronUp,
  FiEdit2,
  FiPlay,
  FiPlus,
  FiTrash2,
  FiUpload,
  FiX,
} from 'react-icons/fi';

const STEPS = [
  { id: 'school_profile', title: 'School Profile', description: 'Name, address, contact' },
  { id: 'academic_year', title: 'Academic Year', description: 'Active session' },
];

const INPUT =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none';
const LABEL = 'block text-xs font-medium text-gray-600 mb-1';
const BTN_PRIMARY =
  'inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
const BTN_SECONDARY =
  'inline-flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors';

function CollapsibleProfileSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wide">{title}</h3>
        {open ? (
          <FiChevronUp size={14} className="text-gray-500 shrink-0" />
        ) : (
          <FiChevronDown size={14} className="text-gray-500 shrink-0" />
        )}
      </button>
      {open && <div className="p-3 border-t border-gray-100">{children}</div>}
    </div>
  );
}

async function uploadProfileFile(file: File, folder: string): Promise<string | null> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`/api/upload?folder=${folder}`, { method: 'POST', body: form });
  const data = await res.json();
  return data.success ? data.data.url : null;
}

interface AcademicYearItem {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  associations?: string[];
  is_deletable?: boolean;
}

export default function SetupWizardPage() {
  const router = useRouter();
  const { refreshSettings } = useSettings();
  const [step, setStep] = useState(0);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const [profile, setProfile] = useState({
    school_name: '',
    school_code: '',
    board_name: 'CBSE',
    affiliation_number: '',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    date_format: 'DD/MM/YYYY',
    school_phone: '',
    school_email: '',
    website: '',
    school_address: '',
    city: '',
    state: '',
    pincode: '',
    logo_url: '',
    primary_color: '#2563eb',
    footer_note: '',
    send_notifications: true,
    auto_assign_fees: true,
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [reportSettingsBase, setReportSettingsBase] = useState<ReportSettings>({
    ...DEFAULT_REPORT_SETTINGS,
  });
  const [openProfileSections, setOpenProfileSections] = useState({
    basic: true,
    contact: false,
    address: false,
    branding: false,
    communication: false,
  });
  const [academicYearsList, setAcademicYearsList] = useState<AcademicYearItem[]>([]);
  const [newYear, setNewYear] = useState({
    name: '',
    start_date: '',
    end_date: '',
    set_active: true,
  });
  const [editingYear, setEditingYear] = useState<AcademicYearItem | null>(null);
  const [editYearForm, setEditYearForm] = useState({ name: '', start_date: '', end_date: '' });

  const [activeYearName, setActiveYearName] = useState('');

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage(text);
    setMessageType(type);
  };

  const fetchAcademicYears = useCallback(async () => {
    const res = await fetch('/api/academic-years?include_usage=true');
    const data = await res.json();
    if (data.success) {
      setAcademicYearsList(data.data);
      const active = data.data.find((y: AcademicYearItem) => y.is_active);
      if (active) setActiveYearName(active.name);
    }
  }, []);

  const fetchProgress = useCallback(async () => {
    const [progressRes, settingsRes, yearsRes, reportsRes] = await Promise.all([
      fetch('/api/setup/progress'),
      fetch('/api/settings'),
      fetch('/api/academic-years?include_usage=true'),
      fetch('/api/settings/reports'),
    ]);
    const [progressData, settingsData, yearsData, reportsData] = await Promise.all([
      progressRes.json(),
      settingsRes.json(),
      yearsRes.json(),
      reportsRes.json(),
    ]);

    if (settingsData.success) {
      const s = settingsData.data;
      const rs = reportsData.success ? mergeReportSettings(reportsData.data) : { ...DEFAULT_REPORT_SETTINGS };
      setReportSettingsBase(rs);
      setProfile({
        school_name: s.school_name || '',
        school_code: rs.school_code || '',
        board_name: rs.board_name || 'CBSE',
        affiliation_number: rs.affiliation_number || '',
        currency: s.currency || 'INR',
        timezone: s.timezone || 'Asia/Kolkata',
        date_format: s.date_format || 'DD/MM/YYYY',
        school_phone: s.school_phone || '',
        school_email: s.school_email || '',
        website: rs.website || '',
        school_address: extractStreetFromSchoolAddress(
          s.school_address || '',
          rs.city || '',
          rs.state || '',
          rs.pincode || '',
        ),
        city: rs.city || '',
        state: rs.state || '',
        pincode: rs.pincode || '',
        logo_url: rs.logo_url || '',
        primary_color: rs.primary_color || '#2563eb',
        footer_note: rs.footer_note || '',
        send_notifications: s.send_notifications !== false,
        auto_assign_fees: s.auto_assign_fees !== false,
      });
    }

    if (yearsData.success) {
      setAcademicYearsList(yearsData.data);
      const active = yearsData.data?.find((y: AcademicYearItem) => y.is_active);
      if (active) setActiveYearName(active.name);
      setNewYear((prev) => {
        if (prev.name) return prev;
        const def = getDefaultAcademicYearConfig();
        return {
          name: def.name,
          start_date: def.start_date,
          end_date: def.end_date,
          set_active: !yearsData.data.some((y: AcademicYearItem) => y.is_active),
        };
      });
    }

    if (progressData.success) {
      setChecklist(progressData.data.checklist);
      const idx = STEPS.findIndex((s) => !progressData.data.checklist[s.id]);
      setStep(idx >= 0 ? idx : STEPS.length - 1);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const completeStep = async (stepId: string, nextStep?: number) => {
    await fetch('/api/setup/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed_step: stepId, current_step: (nextStep ?? step) + 2 }),
    });
    await fetchProgress();
    if (nextStep !== undefined) setStep(nextStep + 1);
  };

  const toggleProfileSection = (key: keyof typeof openProfileSections) => {
    setOpenProfileSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveProfile = async () => {
    if (!profile.school_name.trim()) {
      showMsg('School name is required', 'error');
      return;
    }
    setSaving(true);
    showMsg('');

    const fullAddress = buildFullSchoolAddress({
      street: profile.school_address,
      city: profile.city,
      state: profile.state,
      pincode: profile.pincode,
    });

    const [settingsRes, reportsRes] = await Promise.all([
      fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_name: profile.school_name.trim(),
          school_address: fullAddress,
          school_phone: profile.school_phone.trim(),
          school_email: profile.school_email.trim(),
          currency: profile.currency,
          timezone: profile.timezone,
          date_format: profile.date_format,
          send_notifications: profile.send_notifications,
          auto_assign_fees: profile.auto_assign_fees,
          academic_year: activeYearName || newYear.name || undefined,
        }),
      }),
      fetch('/api/settings/reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...reportSettingsBase,
          school_code: profile.school_code.trim(),
          affiliation_number: profile.affiliation_number.trim(),
          board_name: profile.board_name.trim(),
          logo_url: profile.logo_url.trim(),
          primary_color: profile.primary_color,
          footer_note: profile.footer_note.trim(),
          website: profile.website.trim(),
          city: profile.city.trim(),
          state: profile.state.trim(),
          pincode: profile.pincode.trim(),
        }),
      }),
    ]);

    const settingsData = await settingsRes.json();
    const reportsData = await reportsRes.json();

    if (settingsData.success && reportsData.success) {
      const rs = mergeReportSettings(reportsData.data);
      setProfile((prev) => ({
        ...prev,
        school_address: extractStreetFromSchoolAddress(
          settingsData.data.school_address || fullAddress,
          rs.city || prev.city,
          rs.state || prev.state,
          rs.pincode || prev.pincode,
        ),
        city: rs.city || prev.city,
        state: rs.state || prev.state,
        pincode: rs.pincode || prev.pincode,
      }));
      await completeStep('school_profile', 0);
      await refreshSettings();
      showMsg('School profile saved');
    } else {
      showMsg(settingsData.error || reportsData.error || 'Failed to save profile', 'error');
    }
    setSaving(false);
  };

  const handleLogoUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploadingLogo(true);
    const url = await uploadProfileFile(file, 'reports');
    if (url) {
      setProfile((prev) => ({ ...prev, logo_url: url }));
      showMsg('Logo uploaded');
    } else showMsg('Logo upload failed', 'error');
    setUploadingLogo(false);
  };

  const createAcademicYear = async () => {
    if (!newYear.name || !newYear.start_date || !newYear.end_date) {
      showMsg('Fill in academic year name and dates', 'error');
      return;
    }
    setSaving(true);
    const res = await fetch('/api/academic-years', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newYear.name,
        start_date: newYear.start_date,
        end_date: newYear.end_date,
        is_active: newYear.set_active,
      }),
    });
    const data = await res.json();
    if (data.success) {
      if (newYear.set_active) setActiveYearName(newYear.name);
      const def = getDefaultAcademicYearConfig();
      setNewYear({
        name: def.name,
        start_date: def.start_date,
        end_date: def.end_date,
        set_active: false,
      });
      await fetchAcademicYears();
      await fetchProgress();
      showMsg('Academic year created');
    } else showMsg(data.error || 'Failed', 'error');
    setSaving(false);
  };

  const openEditYear = (year: AcademicYearItem) => {
    setEditingYear(year);
    setEditYearForm({
      name: year.name,
      start_date: year.start_date?.slice(0, 10) || '',
      end_date: year.end_date?.slice(0, 10) || '',
    });
  };

  const saveEditAcademicYear = async () => {
    if (!editingYear || !editYearForm.name || !editYearForm.start_date || !editYearForm.end_date) {
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/academic-years/${editingYear.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editYearForm),
    });
    const data = await res.json();
    if (data.success) {
      if (editingYear.is_active) setActiveYearName(editYearForm.name);
      setEditingYear(null);
      await fetchAcademicYears();
      showMsg('Academic year updated');
    } else showMsg(data.error || 'Failed', 'error');
    setSaving(false);
  };

  const deleteAcademicYear = async (year: AcademicYearItem) => {
    if (year.is_active) {
      showMsg('Cannot delete the active academic year', 'error');
      return;
    }
    if (year.is_deletable === false) {
      showMsg(
        `Cannot delete — linked to ${(year.associations || []).join(', ') || 'school data'}`,
        'error'
      );
      return;
    }
    if (!confirm(`Delete academic year "${year.name}"?`)) return;

    setSaving(true);
    const res = await fetch(`/api/academic-years/${year.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      await fetchAcademicYears();
      await fetchProgress();
      showMsg('Academic year deleted');
    } else showMsg(data.error || 'Failed', 'error');
    setSaving(false);
  };

  const activateAcademicYear = async (yearId: number) => {
    setSaving(true);
    const res = await fetch(`/api/academic-years/${yearId}/activate`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      setActiveYearName(data.data.name);
      await fetchAcademicYears();
      showMsg(`"${data.data.name}" is now active`);
    } else showMsg(data.error || 'Failed', 'error');
    setSaving(false);
  };

  const continueAcademicYear = async () => {
    if (academicYearsList.length === 0) {
      showMsg('Create at least one academic year before continuing', 'error');
      return;
    }
    if (!academicYearsList.some((y) => y.is_active)) {
      showMsg('Activate an academic year before continuing', 'error');
      return;
    }
    await completeStep('academic_year', 1);
    showMsg(
      'Setup complete. Add classes and subjects under Academics, then configure fees under Fees & Accounts.',
    );
    router.push('/fees/setup');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <p className="px-4 py-3 text-sm text-gray-500">Loading setup...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto px-1 space-y-4 min-w-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">School Setup Wizard</h1>
          <p className="text-xs text-gray-500">Configure your school in 2 steps</p>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(i)}
              className={`flex-shrink-0 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                step === i
                  ? 'bg-brand text-white border-brand'
                  : checklist[s.id]
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {checklist[s.id] && <FiCheck className="inline mr-0.5" size={11} />}
              {i + 1}. {s.title}
            </button>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="mb-3 pb-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">{STEPS[step].title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{STEPS[step].description}</p>
          </div>

          {step === 0 && (
            <div className="space-y-3">
              <CollapsibleProfileSection
                title="Basic Information"
                open={openProfileSections.basic}
                onToggle={() => toggleProfileSection('basic')}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className={LABEL}>School name *</label>
                    <input
                      value={profile.school_name}
                      onChange={(e) => setProfile({ ...profile, school_name: e.target.value })}
                      className={INPUT}
                      placeholder="Green Valley Public School"
                    />
                  </div>
                  <div>
                    <label className={LABEL}>School code</label>
                    <input
                      value={profile.school_code}
                      onChange={(e) => setProfile({ ...profile, school_code: e.target.value })}
                      className={INPUT}
                      placeholder="e.g. GVPS001"
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Board name</label>
                    <input
                      value={profile.board_name}
                      onChange={(e) => setProfile({ ...profile, board_name: e.target.value })}
                      className={INPUT}
                      placeholder="CBSE"
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Affiliation number</label>
                    <input
                      value={profile.affiliation_number}
                      onChange={(e) => setProfile({ ...profile, affiliation_number: e.target.value })}
                      className={INPUT}
                      placeholder="Board affiliation no."
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Currency</label>
                    <select
                      value={profile.currency}
                      onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
                      className={INPUT}
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>Timezone</label>
                    <select
                      value={profile.timezone}
                      onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                      className={INPUT}
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>Date format</label>
                    <select
                      value={profile.date_format}
                      onChange={(e) => setProfile({ ...profile, date_format: e.target.value })}
                      className={INPUT}
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>
              </CollapsibleProfileSection>

              <CollapsibleProfileSection
                title="Contact Information"
                open={openProfileSections.contact}
                onToggle={() => toggleProfileSection('contact')}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL}>Phone</label>
                    <input
                      type="tel"
                      value={profile.school_phone}
                      onChange={(e) => setProfile({ ...profile, school_phone: e.target.value })}
                      className={INPUT}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Email</label>
                    <input
                      type="email"
                      value={profile.school_email}
                      onChange={(e) => setProfile({ ...profile, school_email: e.target.value })}
                      className={INPUT}
                      placeholder="admin@school.com"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={LABEL}>Website</label>
                    <input
                      type="url"
                      value={profile.website}
                      onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                      className={INPUT}
                      placeholder="https://www.school.com"
                    />
                  </div>
                </div>
              </CollapsibleProfileSection>

              <CollapsibleProfileSection
                title="Address Information"
                open={openProfileSections.address}
                onToggle={() => toggleProfileSection('address')}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className={LABEL}>Street address</label>
                    <textarea
                      value={profile.school_address}
                      onChange={(e) => setProfile({ ...profile, school_address: e.target.value })}
                      rows={2}
                      className={`${INPUT} resize-y`}
                      placeholder="Building, street, area"
                    />
                  </div>
                  <div>
                    <label className={LABEL}>City</label>
                    <input
                      value={profile.city}
                      onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                      className={INPUT}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className={LABEL}>State</label>
                    <input
                      value={profile.state}
                      onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                      className={INPUT}
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <label className={LABEL}>PIN code</label>
                    <input
                      value={profile.pincode}
                      onChange={(e) => setProfile({ ...profile, pincode: e.target.value })}
                      className={INPUT}
                      placeholder="PIN code"
                    />
                  </div>
                </div>
              </CollapsibleProfileSection>

              <CollapsibleProfileSection
                title="Branding & Documents"
                open={openProfileSections.branding}
                onToggle={() => toggleProfileSection('branding')}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className={LABEL}>School logo</label>
                    <div className="flex flex-wrap items-center gap-3">
                      {profile.logo_url && (
                        <img
                          src={profile.logo_url}
                          alt="School logo"
                          className="h-12 w-12 object-contain border border-gray-200 rounded-lg bg-white p-1"
                        />
                      )}
                      <label className={`${BTN_SECONDARY} cursor-pointer`}>
                        <FiUpload size={13} />
                        {uploadingLogo ? 'Uploading...' : 'Upload logo'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingLogo}
                          onChange={(e) => handleLogoUpload(e.target.files?.[0])}
                        />
                      </label>
                      <input
                        value={profile.logo_url}
                        onChange={(e) => setProfile({ ...profile, logo_url: e.target.value })}
                        className={`${INPUT} flex-1 min-w-[200px]`}
                        placeholder="Or paste logo URL"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={LABEL}>Brand color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={profile.primary_color}
                        onChange={(e) => setProfile({ ...profile, primary_color: e.target.value })}
                        className="h-10 w-12 rounded border border-gray-200 cursor-pointer"
                      />
                      <input
                        value={profile.primary_color}
                        onChange={(e) => setProfile({ ...profile, primary_color: e.target.value })}
                        className={INPUT}
                        placeholder="#2563eb"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={LABEL}>Tagline / footer note</label>
                    <input
                      value={profile.footer_note}
                      onChange={(e) => setProfile({ ...profile, footer_note: e.target.value })}
                      className={INPUT}
                      placeholder="Excellence in education"
                    />
                  </div>
                </div>
              </CollapsibleProfileSection>

              <CollapsibleProfileSection
                title="Communication Settings"
                open={openProfileSections.communication}
                onToggle={() => toggleProfileSection('communication')}
              >
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.send_notifications}
                      onChange={(e) =>
                        setProfile({ ...profile, send_notifications: e.target.checked })
                      }
                      className="rounded border-gray-300 text-brand focus:ring-brand/30"
                    />
                    Send email/SMS notifications to parents and staff
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.auto_assign_fees}
                      onChange={(e) =>
                        setProfile({ ...profile, auto_assign_fees: e.target.checked })
                      }
                      className="rounded border-gray-300 text-brand focus:ring-brand/30"
                    />
                    Automatically assign fees when students are enrolled
                  </label>
                </div>
              </CollapsibleProfileSection>

              <button type="button" onClick={saveProfile} disabled={saving || uploadingLogo} className={BTN_PRIMARY}>
                Save & Continue <FiChevronRight size={14} />
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 space-y-3">
                <p className="text-xs font-medium text-gray-700">Add academic year</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={LABEL}>Academic year</label>
                    <input
                      value={newYear.name}
                      onChange={(e) => setNewYear({ ...newYear, name: e.target.value })}
                      className={INPUT}
                      placeholder="e.g. 2026-27"
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Start date</label>
                    <input
                      type="date"
                      value={newYear.start_date}
                      onChange={(e) => setNewYear({ ...newYear, start_date: e.target.value })}
                      className={INPUT}
                    />
                  </div>
                  <div>
                    <label className={LABEL}>End date</label>
                    <input
                      type="date"
                      value={newYear.end_date}
                      onChange={(e) => setNewYear({ ...newYear, end_date: e.target.value })}
                      className={INPUT}
                    />
                  </div>
                </div>
                {newYear.start_date && newYear.end_date && (
                  <p className="text-xs text-gray-500">
                    Session: {formatAcademicYearDates(newYear.start_date, newYear.end_date)}
                  </p>
                )}
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newYear.set_active}
                    onChange={(e) => setNewYear({ ...newYear, set_active: e.target.checked })}
                    className="rounded border-gray-300 text-brand focus:ring-brand/30"
                  />
                  Set as active session
                </label>
                <button type="button" onClick={createAcademicYear} disabled={saving} className={BTN_PRIMARY}>
                  <FiPlus size={13} /> Add academic year
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-700">
                  All academic years ({academicYearsList.length})
                </p>
                {academicYearsList.length === 0 ? (
                  <p className="text-xs text-gray-500 border border-dashed border-gray-200 rounded-lg px-3 py-4 text-center">
                    No academic years yet. Add one above to get started.
                  </p>
                ) : (
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-72 overflow-y-auto">
                    {academicYearsList.map((year) => (
                      <div
                        key={year.id}
                        className={`px-3 py-2.5 text-sm ${
                          year.is_active ? 'bg-green-50' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-900">{year.name}</span>
                              {year.is_active && (
                                <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-[10px] font-medium rounded">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {formatAcademicYearDates(
                                year.start_date?.slice(0, 10) || year.start_date,
                                year.end_date?.slice(0, 10) || year.end_date
                              )}
                            </p>
                            {year.associations && year.associations.length > 0 && (
                              <p className="text-[10px] text-amber-700 mt-1">
                                Linked: {year.associations.join(', ')}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {!year.is_active && (
                              <button
                                type="button"
                                onClick={() => activateAcademicYear(year.id)}
                                disabled={saving}
                                className="p-1.5 text-gray-500 hover:text-brand rounded"
                                title="Activate"
                              >
                                <FiPlay size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditYear(year)}
                              className="p-1.5 text-gray-500 hover:text-brand rounded"
                              title="Edit"
                            >
                              <FiEdit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteAcademicYear(year)}
                              disabled={saving || year.is_active || year.is_deletable === false}
                              className="p-1.5 text-gray-500 hover:text-red-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                              title={
                                year.is_active
                                  ? 'Cannot delete active year'
                                  : year.is_deletable === false
                                    ? `Linked to ${year.associations?.join(', ')}`
                                    : 'Delete'
                              }
                            >
                              <FiTrash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={continueAcademicYear} disabled={saving} className={BTN_PRIMARY}>
                  Finish & Set Up Fees <FiChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {message && (
            <p
              className={`text-xs mt-3 pt-3 border-t border-gray-100 ${
                messageType === 'error' ? 'text-red-600' : 'text-brand'
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </div>

      {editingYear && (
        <AppModal open={!!editingYear} onClose={() => setEditingYear(null)}>
          <div className={`${APP_MODAL_PANEL} p-6`}>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Edit academic year</h3>
            <div className="space-y-3">
              <div>
                <label className={LABEL}>Academic year</label>
                <input
                  value={editYearForm.name}
                  onChange={(e) => setEditYearForm({ ...editYearForm, name: e.target.value })}
                  className={INPUT}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Start date</label>
                  <input
                    type="date"
                    value={editYearForm.start_date}
                    onChange={(e) => setEditYearForm({ ...editYearForm, start_date: e.target.value })}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className={LABEL}>End date</label>
                  <input
                    type="date"
                    value={editYearForm.end_date}
                    onChange={(e) => setEditYearForm({ ...editYearForm, end_date: e.target.value })}
                    className={INPUT}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setEditingYear(null)} className={`${BTN_SECONDARY} flex-1`}>
                Cancel
              </button>
              <button type="button" onClick={saveEditAcademicYear} disabled={saving} className={`${BTN_PRIMARY} flex-1`}>
                Save
              </button>
            </div>
          </div>
        </AppModal>
      )}
    </DashboardLayout>
  );
}
