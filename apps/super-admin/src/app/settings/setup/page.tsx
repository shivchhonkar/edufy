'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { useSettings } from '@/shared/SettingsContext';
import { Class, Section } from '@/shared/types';
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
import RupeeIcon from '@/shared/components/icons/RupeeIcon';
import {
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiChevronUp,
  FiEdit2,
  FiGrid,
  FiLayers,
  FiPlay,
  FiPlus,
  FiTrash2,
  FiUpload,
  FiX,
} from 'react-icons/fi';

const STEPS = [
  { id: 'school_profile', title: 'School Profile', description: 'Name, address, contact' },
  { id: 'academic_year', title: 'Academic Year', description: 'Active session' },
  { id: 'classes_sections', title: 'Classes & Sections', description: 'Grade structure' },
  { id: 'subjects', title: 'Subjects', description: 'Curriculum subjects' },
  { id: 'fee_setup', title: 'Fee Setup', description: 'Tuition & fees per class' },
];

const SETUP_FEE_COLUMNS = [
  { key: 'tuition', label: 'Tuition', fee_type: 'Tuition Fee', frequency: 'monthly', defaultAmount: 3500 },
  { key: 'library', label: 'Library', fee_type: 'Library Fee', frequency: 'yearly', defaultAmount: 200 },
  { key: 'laboratory', label: 'Laboratory', fee_type: 'Laboratory Fee', frequency: 'yearly', defaultAmount: 500 },
  { key: 'sports', label: 'Sports', fee_type: 'Sports Fee', frequency: 'yearly', defaultAmount: 300 },
  { key: 'examination', label: 'Examination', fee_type: 'Examination Fee', frequency: 'yearly', defaultAmount: 100 },
  { key: 'activity', label: 'Activity', fee_type: 'Activity Fee', frequency: 'monthly', defaultAmount: 150 },
] as const;

type FeeColumnKey = (typeof SETUP_FEE_COLUMNS)[number]['key'];

type FeeCell = { amount: string; structureId?: number };

type ClassFeeRow = {
  classId: number;
  className: string;
  fees: Record<FeeColumnKey, FeeCell>;
};

function defaultTuitionForClass(className: string): number {
  if (/class\s*[1-3]|^1$|^2$|^3$/i.test(className) || /\b(1|2|3)\b/.test(className)) return 3000;
  if (/class\s*[4-6]|^4$|^5$|^6$/i.test(className) || /\b(4|5|6)\b/.test(className)) return 3500;
  if (/class\s*[7-9]|^7$|^8$|^9$/i.test(className) || /\b(7|8|9)\b/.test(className)) return 4000;
  return 4500;
}

function buildEmptyFeeRow(cls: Class): ClassFeeRow {
  const fees = {} as Record<FeeColumnKey, FeeCell>;
  for (const col of SETUP_FEE_COLUMNS) {
    const amount =
      col.key === 'tuition'
        ? String(defaultTuitionForClass(cls.name))
        : String(col.defaultAmount);
    fees[col.key] = { amount };
  }
  return { classId: cls.id, className: cls.name, fees };
}

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

interface ClassRow {
  id: string;
  name: string;
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

function buildPresetRows(from: number, to: number): ClassRow[] {
  return Array.from({ length: to - from + 1 }, (_, i) => ({
    id: `preset-${from + i}`,
    name: `Class ${from + i}`,
  }));
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

  const [classes, setClasses] = useState<Class[]>([]);
  const [allSections, setAllSections] = useState<Section[]>([]);
  const [sectionsByClass, setSectionsByClass] = useState<Record<number, Section[]>>({});
  const [activeYearName, setActiveYearName] = useState('');
  const [classSectionSubTab, setClassSectionSubTab] = useState<'classes' | 'sections'>('classes');

  const [bulkRows, setBulkRows] = useState<ClassRow[]>([
    { id: '1', name: 'Class 1' },
    { id: '2', name: 'Class 2' },
    { id: '3', name: 'Class 3' },
  ]);
  const [presetFrom, setPresetFrom] = useState('1');
  const [presetTo, setPresetTo] = useState('12');
  const [newClassName, setNewClassName] = useState('');

  const [bulkSectionNames, setBulkSectionNames] = useState('A, B, C');
  const [assignSectionsToAll, setAssignSectionsToAll] = useState(true);
  const [assignClassId, setAssignClassId] = useState<number | ''>('');
  const [assignSectionIds, setAssignSectionIds] = useState<number[]>([]);
  const [newSectionInput, setNewSectionInput] = useState('');

  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editSectionName, setEditSectionName] = useState('');

  const [subjectName, setSubjectName] = useState('');
  const [bulkSubjects, setBulkSubjects] = useState(
    'English\nHindi\nMathematics\nScience\nSocial Studies\nComputer'
  );

  const [feeCategories, setFeeCategories] = useState<{ id: number; name: string }[]>([]);
  const [feeSetupRows, setFeeSetupRows] = useState<ClassFeeRow[]>([]);
  const [feeSetupLoading, setFeeSetupLoading] = useState(false);
  const [bulkTuition, setBulkTuition] = useState('');

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

  const fetchClassesData = useCallback(async () => {
    const [classesRes, sectionsRes, yearsRes] = await Promise.all([
      fetch('/api/classes'),
      fetch('/api/sections'),
      fetch('/api/academic-years'),
    ]);
    const [classesData, sectionsData, yearsData] = await Promise.all([
      classesRes.json(),
      sectionsRes.json(),
      yearsRes.json(),
    ]);
    if (sectionsData.success) setAllSections(sectionsData.data);
    if (classesData.success) {
      setClasses(classesData.data);
      const map: Record<number, Section[]> = {};
      await Promise.all(
        classesData.data.map(async (cls: Class) => {
          const secRes = await fetch(`/api/sections?class_id=${cls.id}`);
          const secData = await secRes.json();
          if (secData.success) map[cls.id] = secData.data;
        })
      );
      setSectionsByClass(map);
    }
    if (yearsData.success) {
      const active = yearsData.data?.find((y: { is_active: boolean }) => y.is_active);
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

    await fetchClassesData();
    setLoading(false);
  }, [fetchClassesData]);

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
    setStep(2);
    showMsg('Academic year step complete');
  };

  const skipAcademicYear = async () => {
    if (checklist.academic_year) {
      setStep(2);
      showMsg('Academic year already configured');
    }
  };

  const applyPreset = () => {
    const from = parseInt(presetFrom, 10);
    const to = parseInt(presetTo, 10);
    if (isNaN(from) || isNaN(to) || from > to) {
      showMsg('Invalid class range', 'error');
      return;
    }
    setBulkRows(buildPresetRows(from, to));
    showMsg(`Prepared ${to - from + 1} classes — review and click Create All`);
  };

  const addBulkRow = () => {
    setBulkRows((prev) => [...prev, { id: `row-${Date.now()}`, name: '' }]);
  };

  const getClassAcademicYear = () =>
    activeYearName || newYear.name || getDefaultAcademicYearConfig().name;

  const postClass = async (name: string) => {
    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), academic_year: getClassAcademicYear() }),
    });
    return res.json();
  };

  const createSingleClass = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      showMsg('Class name is required', 'error');
      return false;
    }

    setSaving(true);
    const data = await postClass(trimmed);
    if (data.success) {
      await fetchClassesData();
      await fetchProgress();
      showMsg(`Created "${trimmed}"`);
      setSaving(false);
      return true;
    }

    showMsg(data.error || 'Failed to create class', 'error');
    setSaving(false);
    return false;
  };

  const saveNewClass = async () => {
    const ok = await createSingleClass(newClassName);
    if (ok) setNewClassName('');
  };

  const saveBulkRow = async (row: ClassRow) => {
    const ok = await createSingleClass(row.name);
    if (ok) {
      setBulkRows((prev) => prev.filter((r) => r.id !== row.id));
    }
  };

  const createAllClasses = async () => {
    const rows = bulkRows.filter((r) => r.name.trim());
    if (!rows.length) {
      showMsg('Add at least one class', 'error');
      return;
    }

    setSaving(true);
    let created = 0;
    let failed = 0;

    for (const row of rows) {
      const classData = await postClass(row.name);
      if (!classData.success) {
        failed++;
        continue;
      }
      created++;
    }

    await fetchClassesData();
    await fetchProgress();
    if (failed) showMsg(`Created ${created} class(es). ${failed} skipped (may already exist).`);
    else showMsg(`Created ${created} class(es)`);
    setSaving(false);
  };

  const saveEditClass = async () => {
    if (!editingClass || !editClassName.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/classes/${editingClass.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editClassName.trim(),
        academic_year: editingClass.academic_year,
        description: editingClass.description || '',
        is_active: editingClass.is_active !== false,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setEditingClass(null);
      await fetchClassesData();
      showMsg('Class updated');
    } else showMsg(data.error || 'Failed', 'error');
    setSaving(false);
  };

  const deleteClass = async (cls: Class) => {
    if (!confirm(`Delete "${cls.name}" and its section links?`)) return;
    setSaving(true);
    const res = await fetch(`/api/classes/${cls.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      await fetchClassesData();
      await fetchProgress();
      showMsg('Class deleted');
    } else showMsg(data.error || 'Failed', 'error');
    setSaving(false);
  };

  const saveEditSection = async () => {
    if (!editingSection || !editSectionName.trim()) return;
    setSaving(true);
    const classIds =
      editingSection.assigned_classes?.map((c) => c.id) ||
      (editingSection.class_id ? [editingSection.class_id] : []);
    const res = await fetch(`/api/sections/${editingSection.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editSectionName.trim(),
        class_ids: classIds,
        is_active: editingSection.is_active !== false,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setEditingSection(null);
      await fetchClassesData();
      showMsg('Section updated');
    } else showMsg(data.error || 'Failed', 'error');
    setSaving(false);
  };

  const deleteSection = async (sec: Section) => {
    if (!confirm(`Delete section "${sec.name}"?`)) return;
    setSaving(true);
    const res = await fetch(`/api/sections/${sec.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      await fetchClassesData();
      showMsg('Section deleted');
    } else showMsg(data.error || 'Failed', 'error');
    setSaving(false);
  };

  const loadClassAssignments = (classId: number) => {
    setAssignClassId(classId);
    setAssignSectionIds((sectionsByClass[classId] || []).map((s) => s.id));
  };

  const toggleAssignSection = (sectionId: number) => {
    setAssignSectionIds((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    );
  };

  const saveClassSectionAssignments = async () => {
    if (!assignClassId) {
      showMsg('Select a class to assign sections', 'error');
      return;
    }
    setSaving(true);
    const res = await fetch('/api/class-sections/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ class_id: assignClassId, section_ids: assignSectionIds }),
    });
    const data = await res.json();
    if (data.success) {
      await fetchClassesData();
      showMsg('Section assignments saved');
    } else showMsg(data.error || 'Failed', 'error');
    setSaving(false);
  };

  const createAndAssignSections = async () => {
    const names = bulkSectionNames
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!names.length) {
      showMsg('Enter at least one section name', 'error');
      return;
    }
    if (!assignSectionsToAll && !assignClassId) {
      showMsg('Select a class or enable assign to all classes', 'error');
      return;
    }
    if (assignSectionsToAll && classes.length === 0) {
      showMsg('Create classes first in the Classes tab', 'error');
      setClassSectionSubTab('classes');
      return;
    }

    setSaving(true);
    const sectionIds: number[] = [];

    for (const name of names) {
      const existing = allSections.find((s) => s.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        sectionIds.push(existing.id);
        continue;
      }
      const res = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.success) sectionIds.push(data.data.id);
    }

    const classIds = assignSectionsToAll
      ? classes.map((c) => c.id)
      : [assignClassId as number];

    for (const classId of classIds) {
      const current = (sectionsByClass[classId] || []).map((s) => s.id);
      const merged = sectionIds.reduce<number[]>(
        (acc, id) => (acc.includes(id) ? acc : [...acc, id]),
        [...current]
      );
      await fetch('/api/class-sections/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: classId, section_ids: merged }),
      });
    }

    await fetchClassesData();
    showMsg(
      assignSectionsToAll
        ? `Created/linked ${sectionIds.length} section(s) across all classes`
        : `Created/linked ${sectionIds.length} section(s) to selected class`
    );
    setSaving(false);
  };

  const addSingleSection = async () => {
    const name = newSectionInput.trim();
    if (!name) return;
    setSaving(true);
    const res = await fetch('/api/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.success) {
      setNewSectionInput('');
      await fetchClassesData();
      showMsg('Section created');
    } else showMsg(data.error || 'Failed', 'error');
    setSaving(false);
  };

  const finishClasses = async () => {
    if (classes.length === 0) {
      showMsg('Create at least one class before continuing', 'error');
      return;
    }
    await completeStep('classes_sections', 2);
    setStep(3);
    showMsg('Classes step complete');
  };

  const addSubject = async () => {
    if (!subjectName.trim()) return;
    setSaving(true);
    const res = await fetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: subjectName.trim(),
        code: subjectName.toUpperCase().replace(/\s+/g, '').slice(0, 6),
      }),
    });
    const data = await res.json();
    if (data.success) {
      setSubjectName('');
      showMsg('Subject added');
      await fetchProgress();
    } else showMsg(data.error || 'Failed', 'error');
    setSaving(false);
  };

  const addBulkSubjects = async () => {
    const names = bulkSubjects.split('\n').map((s) => s.trim()).filter(Boolean);
    if (!names.length) return;
    setSaving(true);
    let added = 0;
    for (const name of names) {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          code: name.toUpperCase().replace(/\s+/g, '').slice(0, 6),
        }),
      });
      const data = await res.json();
      if (data.success) added++;
    }
    showMsg(`Added ${added} subject(s)`);
    await fetchProgress();
    setSaving(false);
  };

  const finishSubjects = async () => {
    await completeStep('subjects', 3);
    setStep(4);
  };

  const ensureFeeCategories = async () => {
    const res = await fetch('/api/fees/categories?is_active=true');
    const data = await res.json();
    if (data.success && data.data.length > 0) {
      setFeeCategories(data.data);
      return data.data as { id: number; name: string }[];
    }
    await fetch('/api/settings/initialize-system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ensure_categories' }),
    });
    const res2 = await fetch('/api/fees/categories?is_active=true');
    const data2 = await res2.json();
    if (data2.success) setFeeCategories(data2.data);
    return data2.success ? data2.data : [];
  };

  const loadFeeSetup = useCallback(async () => {
    if (classes.length === 0) {
      setFeeSetupRows([]);
      return;
    }
    setFeeSetupLoading(true);
    try {
      await ensureFeeCategories();
      const year = activeYearName || getDefaultAcademicYearConfig().name;
      const structRes = await fetch(
        `/api/fees/structures?academic_year=${encodeURIComponent(year)}&is_active=true`
      );
      const structData = await structRes.json();
      const structures = structData.success ? structData.data : [];

      const rows = classes.map((cls) => {
        const row = buildEmptyFeeRow(cls);
        for (const col of SETUP_FEE_COLUMNS) {
          const match = structures.find(
            (s: { class_id: number; fee_type: string; frequency: string }) =>
              s.class_id === cls.id &&
              s.fee_type === col.fee_type &&
              s.frequency === col.frequency
          );
          if (match) {
            row.fees[col.key] = {
              amount: String(parseFloat(match.amount) || 0),
              structureId: match.id,
            };
          }
        }
        return row;
      });
      setFeeSetupRows(rows);
    } finally {
      setFeeSetupLoading(false);
    }
  }, [classes, activeYearName]);

  useEffect(() => {
    if (step === 4) loadFeeSetup();
  }, [step, loadFeeSetup]);

  const updateFeeCell = (classId: number, key: FeeColumnKey, amount: string) => {
    setFeeSetupRows((prev) =>
      prev.map((row) =>
        row.classId === classId
          ? { ...row, fees: { ...row.fees, [key]: { ...row.fees[key], amount } } }
          : row
      )
    );
  };

  const applyBulkTuition = () => {
    const amount = bulkTuition.trim();
    if (!amount) return;
    setFeeSetupRows((prev) =>
      prev.map((row) => ({
        ...row,
        fees: { ...row.fees, tuition: { ...row.fees.tuition, amount } },
      }))
    );
    showMsg(`Tuition fee ₹${amount} applied to all classes`);
  };

  const fillDefaultFees = () => {
    setFeeSetupRows(classes.map((cls) => buildEmptyFeeRow(cls)));
    showMsg('Default fee amounts filled for all classes');
  };

  const saveFeeSetup = async (): Promise<boolean> => {
    if (feeSetupRows.length === 0) {
      showMsg('Create classes first before setting up fees', 'error');
      return false;
    }
    const year = activeYearName || getDefaultAcademicYearConfig().name;
    let categories = feeCategories;
    if (categories.length === 0) {
      categories = await ensureFeeCategories();
    }
    const categoryByName = Object.fromEntries(categories.map((c) => [c.name, c.id]));

    setSaving(true);
    let saved = 0;
    let skipped = 0;

    for (const row of feeSetupRows) {
      for (const col of SETUP_FEE_COLUMNS) {
        const cell = row.fees[col.key];
        const amount = parseFloat(cell.amount);
        if (!cell.amount.trim() || isNaN(amount) || amount < 0) continue;

        const payload = {
          class_id: row.classId,
          category_id: categoryByName[col.fee_type] || null,
          fee_type: col.fee_type,
          amount,
          frequency: col.frequency,
          academic_year: year,
          description: `${col.fee_type} for ${row.className}`,
          late_fee_percentage: 2,
          late_fee_days: 7,
          is_active: true,
        };

        if (cell.structureId) {
          const res = await fetch('/api/fees/structures', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: cell.structureId, ...payload }),
          });
          const data = await res.json();
          if (data.success) saved++;
          else skipped++;
        } else {
          const res = await fetch('/api/fees/structures', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (data.success) {
            saved++;
            const created = Array.isArray(data.data) ? data.data[0] : data.data;
            if (created?.id) {
              cell.structureId = created.id;
            }
          } else skipped++;
        }
      }
    }

    await loadFeeSetup();
    showMsg(
      skipped > 0
        ? `Saved ${saved} fee structure(s). ${skipped} skipped.`
        : `Saved ${saved} fee structure(s) for ${feeSetupRows.length} class(es)`
    );
    setSaving(false);
    return saved > 0;
  };

  const finishFeeSetup = async () => {
    const hasAmounts = feeSetupRows.some((r) =>
      SETUP_FEE_COLUMNS.some((c) => {
        const amt = parseFloat(r.fees[c.key].amount);
        return !isNaN(amt) && amt > 0;
      })
    );
    if (!hasAmounts) {
      showMsg('Set fee amounts for at least one class before finishing', 'error');
      return;
    }

    const saved = await saveFeeSetup();
    if (!saved) return;

    setSaving(true);
    await fetch('/api/setup/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed_step: 'fee_setup', mark_complete: true }),
    });
    setSaving(false);
    showMsg('Setup complete!');
    router.push('/dashboard');
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
          <p className="text-xs text-gray-500">Configure your school in 5 steps</p>
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
                  Continue <FiChevronRight size={14} />
                </button>
                {checklist.academic_year && (
                  <button type="button" onClick={skipAcademicYear} className={BTN_SECONDARY}>
                    Skip to Classes
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="flex gap-1 border-b border-gray-100 pb-2">
                <button
                  type="button"
                  onClick={() => setClassSectionSubTab('classes')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    classSectionSubTab === 'classes'
                      ? 'bg-brand text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <FiLayers size={12} />
                  Classes ({classes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setClassSectionSubTab('sections')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    classSectionSubTab === 'sections'
                      ? 'bg-brand text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <FiGrid size={12} />
                  Sections ({allSections.length})
                </button>
              </div>

              {classSectionSubTab === 'classes' && (
                <div className="space-y-3">
                  <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                      <FiPlus size={13} className="text-brand" />
                      Add a class
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <input
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newClassName.trim() && !saving) {
                            e.preventDefault();
                            saveNewClass();
                          }
                        }}
                        className={`${INPUT} flex-1 min-w-[12rem]`}
                        placeholder="e.g. Class 1"
                      />
                      <button
                        type="button"
                        onClick={saveNewClass}
                        disabled={saving || !newClassName.trim()}
                        className={BTN_PRIMARY}
                      >
                        Save class
                      </button>
                    </div>
                    {activeYearName && (
                      <p className="text-xs text-gray-500">Academic year: {activeYearName}</p>
                    )}
                  </div>

                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 space-y-3">
                    <p className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                      <FiLayers size={13} className="text-brand" />
                      Quick setup — create multiple classes at once
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div>
                        <label className={LABEL}>From</label>
                        <input
                          type="number"
                          min={1}
                          value={presetFrom}
                          onChange={(e) => setPresetFrom(e.target.value)}
                          className={INPUT}
                        />
                      </div>
                      <div>
                        <label className={LABEL}>To</label>
                        <input
                          type="number"
                          min={1}
                          value={presetTo}
                          onChange={(e) => setPresetTo(e.target.value)}
                          className={INPUT}
                        />
                      </div>
                      <div className="flex items-end">
                        <button type="button" onClick={applyPreset} className={`${BTN_SECONDARY} w-full justify-center`}>
                          Generate rows
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[1fr_auto_32px] gap-2 px-3 py-2 bg-gray-50 text-xs font-medium text-gray-600 border-b border-gray-200 sticky top-0 z-10 shrink-0">
                      <span>Class name</span>
                      <span />
                      <span />
                    </div>
                    <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                      {bulkRows.map((row) => (
                        <div key={row.id} className="grid grid-cols-[1fr_auto_32px] gap-2 px-3 py-2 items-center">
                          <input
                            value={row.name}
                            onChange={(e) =>
                              setBulkRows((prev) =>
                                prev.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r))
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && row.name.trim() && !saving) {
                                e.preventDefault();
                                saveBulkRow(row);
                              }
                            }}
                            className={INPUT}
                            placeholder="Class 1"
                          />
                          <button
                            type="button"
                            onClick={() => saveBulkRow(row)}
                            disabled={saving || !row.name.trim()}
                            className={`${BTN_SECONDARY} !py-1 !px-2 text-xs`}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setBulkRows((prev) => prev.filter((r) => r.id !== row.id))}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                            title="Remove row"
                          >
                            <FiX size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="px-3 py-2 border-t border-gray-100 flex flex-wrap gap-2">
                      <button type="button" onClick={addBulkRow} className={BTN_SECONDARY}>
                        <FiPlus size={13} /> Add row
                      </button>
                      <button type="button" onClick={createAllClasses} disabled={saving} className={BTN_PRIMARY}>
                        Create all classes
                      </button>
                    </div>
                  </div>

                  {classes.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-700">Existing classes</p>
                      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                        {classes.map((cls) => (
                          <div
                            key={cls.id}
                            className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                          >
                            <span className="font-medium text-gray-900">{cls.name}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingClass(cls);
                                  setEditClassName(cls.name);
                                }}
                                className="p-1.5 text-gray-500 hover:text-brand rounded"
                                title="Edit class"
                              >
                                <FiEdit2 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteClass(cls)}
                                className="p-1.5 text-gray-500 hover:text-red-600 rounded"
                                title="Delete class"
                              >
                                <FiTrash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {classSectionSubTab === 'sections' && (
                <div className="space-y-3">
                  {classes.length === 0 && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
                      Create classes first, then come back here to add and assign sections.
                    </p>
                  )}

                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 space-y-3">
                    <p className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                      <FiGrid size={13} className="text-brand" />
                      Bulk create sections
                    </p>
                    <div>
                      <label className={LABEL}>Section names (comma-separated)</label>
                      <input
                        value={bulkSectionNames}
                        onChange={(e) => setBulkSectionNames(e.target.value)}
                        className={INPUT}
                        placeholder="A, B, C"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={assignSectionsToAll}
                        onChange={(e) => setAssignSectionsToAll(e.target.checked)}
                        className="rounded border-gray-300 text-brand focus:ring-brand/30"
                      />
                      Assign to all classes
                    </label>
                    {!assignSectionsToAll && (
                      <div>
                        <label className={LABEL}>Assign to class</label>
                        <select
                          value={assignClassId}
                          onChange={(e) =>
                            setAssignClassId(e.target.value ? Number(e.target.value) : '')
                          }
                          className={INPUT}
                        >
                          <option value="">Select class</option>
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={createAndAssignSections}
                      disabled={saving || classes.length === 0}
                      className={BTN_PRIMARY}
                    >
                      Create & assign sections
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-3 space-y-3">
                    <p className="text-xs font-medium text-gray-700">Assign sections to a class</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className={LABEL}>Class</label>
                        <select
                          value={assignClassId}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) {
                              setAssignClassId('');
                              setAssignSectionIds([]);
                            } else {
                              loadClassAssignments(Number(val));
                            }
                          }}
                          className={INPUT}
                        >
                          <option value="">Select class</option>
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {assignClassId && (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {allSections.length === 0 ? (
                            <p className="text-xs text-gray-500">No sections yet — create some above.</p>
                          ) : (
                            allSections.map((sec) => (
                              <label
                                key={sec.id}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border cursor-pointer transition-colors ${
                                  assignSectionIds.includes(sec.id)
                                    ? 'bg-primary-50 border-primary-200 text-primary-800'
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={assignSectionIds.includes(sec.id)}
                                  onChange={() => toggleAssignSection(sec.id)}
                                  className="rounded border-gray-300 text-brand focus:ring-brand/30"
                                />
                                {sec.name}
                              </label>
                            ))
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={saveClassSectionAssignments}
                          disabled={saving}
                          className={BTN_SECONDARY}
                        >
                          Save assignments
                        </button>
                      </>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        value={newSectionInput}
                        onChange={(e) => setNewSectionInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addSingleSection()}
                        className={INPUT}
                        placeholder="Add single section e.g. A"
                      />
                      <button type="button" onClick={addSingleSection} disabled={saving} className={BTN_SECONDARY}>
                        Add
                      </button>
                    </div>

                    {allSections.length > 0 && (
                      <>
                        <p className="text-xs font-medium text-gray-700">All sections</p>
                        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                          {allSections.map((sec) => (
                            <div
                              key={sec.id}
                              className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                            >
                              <div className="min-w-0">
                                <span className="font-medium text-gray-900">{sec.name}</span>
                                {sec.assigned_classes && sec.assigned_classes.length > 0 && (
                                  <p className="text-xs text-gray-500 truncate">
                                    {sec.assigned_classes.map((c) => c.name).join(', ')}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSection(sec);
                                    setEditSectionName(sec.name);
                                  }}
                                  className="p-1.5 text-gray-500 hover:text-brand rounded"
                                  title="Edit section"
                                >
                                  <FiEdit2 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteSection(sec)}
                                  className="p-1.5 text-gray-500 hover:text-red-600 rounded"
                                  title="Delete section"
                                >
                                  <FiTrash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <button type="button" onClick={finishClasses} className={BTN_PRIMARY}>
                Continue <FiChevronRight size={14} />
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSubject()}
                  className={INPUT}
                  placeholder="Add single subject"
                />
                <button type="button" onClick={addSubject} disabled={saving} className={BTN_SECONDARY}>
                  Add
                </button>
              </div>
              <div>
                <label className={LABEL}>Or add multiple (one per line)</label>
                <textarea
                  value={bulkSubjects}
                  onChange={(e) => setBulkSubjects(e.target.value)}
                  rows={5}
                  className={`${INPUT} resize-y`}
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={addBulkSubjects} disabled={saving} className={BTN_SECONDARY}>
                  Add all subjects
                </button>
                <button type="button" onClick={finishSubjects} className={BTN_PRIMARY}>
                  Continue <FiChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              {classes.length === 0 ? (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
                  Create classes in the previous step before setting up fees.
                </p>
              ) : (
                <>
                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 space-y-3">
                    <p className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                      <RupeeIcon size={13} className="text-brand" />
                      Fee setup per class — academic year:{' '}
                      <span className="font-semibold">{activeYearName || 'Not set'}</span>
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Set tuition (monthly) and other fees for each class. Transport fee is assigned per student separately.
                    </p>
                    <div className="flex flex-wrap gap-2 items-end">
                      <div className="flex gap-2 items-end">
                        <div>
                          <label className={LABEL}>Apply tuition to all (₹)</label>
                          <input
                            type="number"
                            min={0}
                            value={bulkTuition}
                            onChange={(e) => setBulkTuition(e.target.value)}
                            className={`${INPUT} w-28`}
                            placeholder="3500"
                          />
                        </div>
                        <button type="button" onClick={applyBulkTuition} className={BTN_SECONDARY}>
                          Apply
                        </button>
                      </div>
                      <button type="button" onClick={fillDefaultFees} className={BTN_SECONDARY}>
                        Fill defaults
                      </button>
                    </div>
                  </div>

                  {feeSetupLoading ? (
                    <p className="text-xs text-gray-500 py-4 text-center">Loading fee setup...</p>
                  ) : (
                    <div className="border border-gray-200 rounded-lg overflow-x-auto">
                      <table className="w-full text-xs min-w-[640px]">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shrink-0">
                            <th className="text-left px-3 py-2 font-medium text-gray-600 sticky left-0 bg-gray-50">
                              Class
                            </th>
                            {SETUP_FEE_COLUMNS.map((col) => (
                              <th key={col.key} className="text-left px-2 py-2 font-medium text-gray-600 whitespace-nowrap">
                                <div>{col.label}</div>
                                <div className="text-[10px] font-normal text-gray-400">{col.frequency}</div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {feeSetupRows.map((row) => (
                            <tr key={row.classId} className="hover:bg-gray-50/50">
                              <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap sticky left-0 bg-white">
                                {row.className}
                              </td>
                              {SETUP_FEE_COLUMNS.map((col) => (
                                <td key={col.key} className="px-2 py-1.5">
                                  <input
                                    type="number"
                                    min={0}
                                    step="1"
                                    value={row.fees[col.key].amount}
                                    onChange={(e) => updateFeeCell(row.classId, col.key, e.target.value)}
                                    className="w-20 px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand/30 focus:border-brand outline-none"
                                    placeholder="0"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={saveFeeSetup}
                      disabled={saving || feeSetupLoading}
                      className={BTN_SECONDARY}
                    >
                      Save fee structures
                    </button>
                    <button
                      type="button"
                      onClick={finishFeeSetup}
                      disabled={saving || feeSetupLoading}
                      className={BTN_PRIMARY}
                    >
                      Save & Finish Setup <FiChevronRight size={14} />
                    </button>
                  </div>
                </>
              )}
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

      {editingClass && (
        <AppModal open={!!editingClass} onClose={() => setEditingClass(null)}>
          <div className={`${APP_MODAL_PANEL} p-6`}>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Edit class</h3>
            <input
              value={editClassName}
              onChange={(e) => setEditClassName(e.target.value)}
              className={INPUT}
              autoFocus
            />
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={() => setEditingClass(null)} className={`${BTN_SECONDARY} flex-1`}>
                Cancel
              </button>
              <button type="button" onClick={saveEditClass} disabled={saving} className={`${BTN_PRIMARY} flex-1`}>
                Save
              </button>
            </div>
          </div>
        </AppModal>
      )}

      {editingSection && (
        <AppModal open={!!editingSection} onClose={() => setEditingSection(null)}>
          <div className={`${APP_MODAL_PANEL} p-6`}>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Edit section</h3>
            <input
              value={editSectionName}
              onChange={(e) => setEditSectionName(e.target.value)}
              className={INPUT}
              autoFocus
            />
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={() => setEditingSection(null)} className={`${BTN_SECONDARY} flex-1`}>
                Cancel
              </button>
              <button type="button" onClick={saveEditSection} disabled={saving} className={`${BTN_PRIMARY} flex-1`}>
                Save
              </button>
            </div>
          </div>
        </AppModal>
      )}

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
