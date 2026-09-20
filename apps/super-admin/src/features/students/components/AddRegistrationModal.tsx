'use client';

import AppModal, { AppModalShell } from '@/shared/components/common/AppModal';
import { useEffect, useMemo, useState } from 'react';
import { FiPlus, FiX } from 'react-icons/fi';
import {
  parseDocuments,
  parseExamSubjects,
  parsePreviousEducation,
  parseReferences,
  parseSessionRows,
  type RegistrationDocumentRow,
  type RegistrationExamSubject,
  type RegistrationPreviousExam,
  type RegistrationReference,
  type RegistrationSessionRow,
} from '@/lib/registration-write-values';
import type { StudentLookupSettings } from '@/lib/student-lookup-settings';
import { DEFAULT_STUDENT_LOOKUP_SETTINGS } from '@/lib/student-lookup-settings';

interface ClassItem {
  id: number;
  name: string;
}

interface AcademicYear {
  id: number;
  name: string;
  is_active?: boolean;
}

export interface RegistrationRecord {
  id: number;
  registration_number: string;
  student_first_name: string;
  student_last_name?: string | null;
  [key: string]: unknown;
}

interface AddRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  classes: ClassItem[];
  editing: RegistrationRecord | null;
  defaultAcademicYear?: string;
}

type TabId =
  | 'general'
  | 'parental'
  | 'references'
  | 'others'
  | 'documents'
  | 'exam'
  | 'sessions';

const TABS: { id: TabId; label: string }[] = [
  { id: 'general', label: 'General Details' },
  { id: 'parental', label: 'Parental Details' },
  { id: 'references', label: 'References' },
  { id: 'others', label: 'Others' },
  { id: 'documents', label: 'Documents' },
  { id: 'exam', label: 'Entrance Exam Details' },
  { id: 'sessions', label: 'Sessions' },
];

const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const ACTIVITIES = ['Music', 'Dance', 'Art', 'Sports', 'Drama', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const inputBase =
  'border border-gray-300 rounded-md px-2.5 py-1.5 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500';
const inputClass = `w-full ${inputBase}`;

function str(value: unknown): string {
  if (value == null) return '';
  return String(value);
}

function bool(value: unknown): boolean {
  return value === true || value === 'true' || value === 'Yes' || value === 1;
}

function emptyReference(): RegistrationReference {
  return { name: '', class_name: '', reg_id: '' };
}
function emptyExam(): RegistrationExamSubject {
  return { subject: '', max_marks: '', obtained_marks: '' };
}
function emptyPrevious(): RegistrationPreviousExam {
  return {
    roll_no: '',
    examination: '',
    university: '',
    year: '',
    subjects: '',
    obt_marks: '',
    total_marks: '',
    percent: '',
  };
}
function emptySession(): RegistrationSessionRow {
  return {
    session: '',
    class_name: '',
    section: '',
    roll_no: '',
    reg_id: '',
    transport: '',
    location: '',
    bus_no: '',
    category: '',
    fee_type: '',
  };
}
function emptyDocument(): RegistrationDocumentRow {
  return { doc_type: '', doc_name: '', file_type: '', file_name: '' };
}

function pad<T>(rows: T[], min: number, factory: () => T): T[] {
  const next = [...rows];
  while (next.length < min) next.push(factory());
  return next;
}

function ageFromDob(dob: string): string {
  if (!dob) return '';
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const month = today.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? String(age) : '';
}

function createEmptyForm(academicYear = '') {
  return {
    registration_date: new Date().toISOString().slice(0, 10),
    academic_year: academicYear,
    fee_amount: '',
    fee_type: '',
    receipt_number: '',
    student_name: '',
    gender: 'Male',
    class_id: '',
    date_of_birth: '',
    student_email: '',
    social_category: '',
    religion: '',
    nationality: '',
    aadhaar_no: '',
    reporting_mobile: '',
    live_class: 'Y',
    permanent_address: '',
    address: '',
    state: '',
    city: '',
    samagra_id: '',
    student_category: '',
    category: '',
    sub_caste: '',
    fees_from: 'Apr',
    last_school: '',
    last_class: '',
    last_division: '',
    year_of_passing: '',
    board_university: '',
    school_transport: false,
    bus_no: '',
    transport_shift: '',
    pincode: '',
    location: '',
    father_name: '',
    father_phone: '',
    father_email: '',
    father_aadhaar: '',
    father_qualification: '',
    father_occupation: '',
    father_office_address: '',
    father_age: '',
    father_annual_income: '',
    mother_name: '',
    mother_phone: '',
    mother_email: '',
    mother_aadhaar: '',
    mother_qualification: '',
    mother_occupation: '',
    mother_office_address: '',
    mother_age: '',
    mother_annual_income: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_email: '',
    guardian_address: '',
    guardian_relation: '',
    guardian_marital_status: 'MAR',
    guardian_link_staff: '',
    bank_name: '',
    ifsc_code: '',
    account_no: '',
    branch: '',
    saturday_activity: 'Music',
    handicapped: false,
    handicapped_percent: '',
    blood_group: '',
    height_cm: '',
    weight_kg: '',
    ration_card: false,
    ration_type: '',
    ration_no: '',
    medium: 'English',
    local_address: '',
    legal_address: '',
    husband_address: '',
    remarks: '',
    reference_contacts: pad([], 3, emptyReference),
    exam_subjects: pad([], 7, emptyExam),
    previous_education: pad([], 6, emptyPrevious),
    session_rows: pad([], 6, emptySession),
    documents: pad([], 6, emptyDocument),
  };
}

function formFromRecord(row: RegistrationRecord, fallbackYear: string) {
  const base = createEmptyForm(str(row.academic_year) || fallbackYear);
  return {
    ...base,
    registration_date: str(row.registration_date).slice(0, 10) || base.registration_date,
    academic_year: str(row.academic_year) || fallbackYear,
    fee_amount: row.fee_amount != null ? String(row.fee_amount) : '',
    fee_type: str(row.fee_type),
    receipt_number: str(row.receipt_number),
    student_name: [row.student_first_name, row.student_last_name].filter(Boolean).join(' '),
    gender: str(row.gender) || 'Male',
    class_id: row.class_id != null ? String(row.class_id) : '',
    date_of_birth: str(row.date_of_birth).slice(0, 10),
    student_email: str(row.student_email),
    social_category: str(row.social_category),
    religion: str(row.religion),
    nationality: str(row.nationality),
    aadhaar_no: str(row.aadhaar_no),
    reporting_mobile: str(row.reporting_mobile),
    live_class: str(row.live_class) || 'Y',
    permanent_address: str(row.permanent_address),
    address: str(row.address),
    state: str(row.state),
    city: str(row.city),
    samagra_id: str(row.samagra_id),
    student_category: str(row.student_category),
    category: str(row.category),
    sub_caste: str(row.sub_caste),
    fees_from: str(row.fees_from) || 'Apr',
    last_school: str(row.last_school),
    last_class: str(row.last_class),
    last_division: str(row.last_division),
    year_of_passing: str(row.year_of_passing),
    board_university: str(row.board_university),
    school_transport: bool(row.school_transport),
    bus_no: str(row.bus_no),
    transport_shift: str(row.transport_shift),
    pincode: str(row.pincode),
    location: str(row.location),
    father_name: str(row.parent_name),
    father_phone: str(row.parent_phone),
    father_email: str(row.parent_email),
    father_aadhaar: str(row.father_aadhaar),
    father_qualification: str(row.father_qualification),
    father_occupation: str(row.father_occupation),
    father_office_address: str(row.father_office_address),
    father_age: str(row.father_age),
    father_annual_income: str(row.father_annual_income),
    mother_name: str(row.mother_name),
    mother_phone: str(row.mother_phone),
    mother_email: str(row.mother_email),
    mother_aadhaar: str(row.mother_aadhaar),
    mother_qualification: str(row.mother_qualification),
    mother_occupation: str(row.mother_occupation),
    mother_office_address: str(row.mother_office_address),
    mother_age: str(row.mother_age),
    mother_annual_income: str(row.mother_annual_income),
    guardian_name: str(row.guardian_name),
    guardian_phone: str(row.guardian_phone),
    guardian_email: str(row.guardian_email),
    guardian_address: str(row.guardian_address),
    guardian_relation: str(row.guardian_relation),
    guardian_marital_status: str(row.guardian_marital_status) || 'MAR',
    guardian_link_staff: str(row.guardian_link_staff),
    bank_name: str(row.bank_name),
    ifsc_code: str(row.ifsc_code),
    account_no: str(row.account_no),
    branch: str(row.branch),
    saturday_activity: str(row.saturday_activity) || 'Music',
    handicapped: bool(row.handicapped),
    handicapped_percent: str(row.handicapped_percent),
    blood_group: str(row.blood_group),
    height_cm: str(row.height_cm),
    weight_kg: str(row.weight_kg),
    ration_card: bool(row.ration_card),
    ration_type: str(row.ration_type),
    ration_no: str(row.ration_no),
    medium: str(row.medium) || 'English',
    local_address: str(row.local_address),
    legal_address: str(row.legal_address),
    husband_address: str(row.husband_address),
    remarks: str(row.remarks),
    reference_contacts: pad(parseReferences(row.reference_contacts), 3, emptyReference),
    exam_subjects: pad(parseExamSubjects(row.exam_subjects), 7, emptyExam),
    previous_education: pad(parsePreviousEducation(row.previous_education), 6, emptyPrevious),
    session_rows: pad(parseSessionRows(row.session_rows), 6, emptySession),
    documents: pad(parseDocuments(row.documents), 6, emptyDocument),
  };
}

function Field({
  label,
  required,
  children,
  className = '',
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-0.5 block text-xs font-medium text-gray-600">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 border-b border-primary-100 pb-1 text-sm font-semibold text-primary-800">
      {children}
    </h3>
  );
}

export default function AddRegistrationModal({
  isOpen,
  onClose,
  onSuccess,
  classes,
  editing,
  defaultAcademicYear = '',
}: AddRegistrationModalProps) {
  const [form, setForm] = useState(() => createEmptyForm(defaultAcademicYear));
  const [tab, setTab] = useState<TabId>('general');
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [feeCategories, setFeeCategories] = useState<{ id: number; name: string }[]>([]);
  const [lookups, setLookups] = useState<StudentLookupSettings>(DEFAULT_STUDENT_LOOKUP_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setTab('general');
    setError('');
    setForm(editing ? formFromRecord(editing, defaultAcademicYear) : createEmptyForm(defaultAcademicYear));

    Promise.all([
      fetch('/api/academic-years').then((r) => r.json()).catch(() => ({ data: [] })),
      fetch('/api/fees/categories?is_active=true').then((r) => r.json()).catch(() => ({ data: [] })),
      fetch('/api/settings/student-lookups').then((r) => r.json()).catch(() => ({ data: null })),
    ]).then(([yearsRes, feesRes, lookupRes]) => {
      const years: AcademicYear[] = yearsRes.data || [];
      setAcademicYears(years);
      setFeeCategories(feesRes.data || []);
      if (lookupRes.data) setLookups(lookupRes.data);

      if (!editing) {
        setForm((prev) => ({
          ...prev,
          academic_year:
            prev.academic_year ||
            years.find((y) => y.is_active)?.name ||
            years[0]?.name ||
            defaultAcademicYear,
          social_category: prev.social_category || lookupRes.data?.caste_types?.default_value || 'GEN',
          religion: prev.religion || lookupRes.data?.religions?.default_value || 'Hindu',
          nationality: prev.nationality || lookupRes.data?.nationalities?.default_value || 'Indian',
        }));
      }
    });
  }, [isOpen, editing, defaultAcademicYear]);

  const age = useMemo(() => ageFromDob(form.date_of_birth), [form.date_of_birth]);

  const patch = (updates: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...updates }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch(
        editing ? `/api/students/registrations/${editing.id}` : '/api/students/registrations',
        {
          method: editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            student_first_name: form.student_name.trim(),
            student_last_name: null,
            father_name: form.father_name,
            father_phone: form.father_phone,
            father_email: form.father_email,
            class_id: form.class_id || null,
            fee_amount: form.fee_amount || null,
          }),
        }
      );
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to save registration');
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setError('Failed to save registration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal open={isOpen} onClose={onClose}>
      <AppModalShell
        header={
          <>
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                {editing ? 'Modify Registration' : "Student's Registration"}
              </h2>
              <p className="text-sm text-gray-500">
                Capture student, parent, and admission details
              </p>
            </div>
            <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close">
              <FiX size={22} />
            </button>
          </>
        }
        footer={
          <>
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              type="submit"
              form="reg-form"
              disabled={saving}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        <form id="reg-form" onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Field label="Date">
              <input
                type="date"
                className={inputClass}
                value={form.registration_date}
                onChange={(e) => patch({ registration_date: e.target.value })}
              />
            </Field>
            <Field label="Session">
              <select
                className={inputClass}
                value={form.academic_year}
                onChange={(e) => patch({ academic_year: e.target.value })}
              >
                <option value="">Select session</option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.name}>
                    {year.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Reg. No.">
              <input
                value={editing?.registration_number || 'Auto'}
                disabled
                className={`${inputClass} bg-gray-50 text-gray-500`}
              />
            </Field>
            <Field label="Fees">
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  className={`${inputBase} min-w-0 flex-1`}
                  value={form.fee_amount}
                  onChange={(e) => patch({ fee_amount: e.target.value })}
                />
                <select
                  className={`${inputBase} w-28 shrink-0`}
                  value={form.fee_type}
                  onChange={(e) => patch({ fee_type: e.target.value })}
                >
                  <option value="">Type</option>
                  {feeCategories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
            <Field label="Rcpt. No." className="lg:col-span-2">
              <input
                className={inputClass}
                value={form.receipt_number}
                onChange={(e) => patch({ receipt_number: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-gray-50/60 p-4 lg:grid-cols-4">
            <Field label="Student Name" required className="lg:col-span-2">
              <div className="flex items-stretch gap-2">
                <select
                  className={`${inputBase} w-[5.5rem] shrink-0`}
                  value={form.gender}
                  onChange={(e) => patch({ gender: e.target.value })}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  required
                  className={`${inputBase} min-w-0 flex-1`}
                  value={form.student_name}
                  onChange={(e) => patch({ student_name: e.target.value })}
                />
              </div>
            </Field>
            <Field label="Class">
              <select className={inputClass} value={form.class_id} onChange={(e) => patch({ class_id: e.target.value })}>
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="D.O.B">
              <div className="flex gap-2">
                <input
                  type="date"
                  className={`${inputBase} min-w-0 flex-1`}
                  value={form.date_of_birth}
                  onChange={(e) => patch({ date_of_birth: e.target.value })}
                />
                <input className={`${inputBase} w-16 shrink-0 bg-gray-50`} value={age} disabled placeholder="Age" />
              </div>
            </Field>
            <Field label="Email" className="lg:col-span-2">
              <input
                type="email"
                className={inputClass}
                value={form.student_email}
                onChange={(e) => patch({ student_email: e.target.value })}
              />
            </Field>
            <Field label="Social Category">
              <select
                className={inputClass}
                value={form.social_category}
                onChange={(e) => patch({ social_category: e.target.value })}
              >
                <option value="">Select</option>
                {lookups.caste_types.items.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Religion">
              <select className={inputClass} value={form.religion} onChange={(e) => patch({ religion: e.target.value })}>
                <option value="">Select</option>
                {lookups.religions.items.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nationality">
              <select
                className={inputClass}
                value={form.nationality}
                onChange={(e) => patch({ nationality: e.target.value })}
              >
                <option value="">Select</option>
                {lookups.nationalities.items.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Aadhaar">
              <input
                className={inputClass}
                value={form.aadhaar_no}
                maxLength={12}
                onChange={(e) => patch({ aadhaar_no: e.target.value.replace(/\D/g, '').slice(0, 12) })}
              />
            </Field>
          </div>

          <div className="flex flex-wrap gap-1 border-b border-gray-200">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-t-md px-3 py-2 text-sm ${
                  tab === item.id
                    ? 'border border-b-white bg-white font-medium text-primary-700'
                    : 'border border-transparent text-gray-600 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === 'general' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="space-y-2">
                <Field label="Reporting Mobile">
                  <input className={inputClass} value={form.reporting_mobile} onChange={(e) => patch({ reporting_mobile: e.target.value })} />
                </Field>
                <Field label="Live Class">
                  <select className={inputClass} value={form.live_class} onChange={(e) => patch({ live_class: e.target.value })}>
                    <option value="Y">Y</option>
                    <option value="N">N</option>
                  </select>
                </Field>
                <Field label="Permanent Add">
                  <textarea rows={2} className={inputClass} value={form.permanent_address} onChange={(e) => patch({ permanent_address: e.target.value })} />
                </Field>
                <Field label="Res. Address">
                  <textarea rows={2} className={inputClass} value={form.address} onChange={(e) => patch({ address: e.target.value })} />
                </Field>
                <Field label="State">
                  <input className={inputClass} value={form.state} onChange={(e) => patch({ state: e.target.value })} />
                </Field>
                <Field label="City">
                  <input className={inputClass} value={form.city} onChange={(e) => patch({ city: e.target.value })} />
                </Field>
              </div>
              <div className="space-y-2">
                <Field label="Samagra Id">
                  <input className={inputClass} value={form.samagra_id} onChange={(e) => patch({ samagra_id: e.target.value })} />
                </Field>
                <Field label="S. Category">
                  <input className={inputClass} value={form.student_category} onChange={(e) => patch({ student_category: e.target.value })} />
                </Field>
                <Field label="Category">
                  <input className={inputClass} value={form.category} onChange={(e) => patch({ category: e.target.value })} />
                </Field>
                <Field label="Fees From">
                  <select className={inputClass} value={form.fees_from} onChange={(e) => patch({ fees_from: e.target.value })}>
                    {MONTHS.map((month) => (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Sub Cast">
                  <input className={inputClass} value={form.sub_caste} onChange={(e) => patch({ sub_caste: e.target.value })} />
                </Field>
                <Field label="Pin Code">
                  <input className={inputClass} value={form.pincode} onChange={(e) => patch({ pincode: e.target.value })} />
                </Field>
              </div>
              <div className="space-y-2">
                <Field label="Last School">
                  <input className={inputClass} value={form.last_school} onChange={(e) => patch({ last_school: e.target.value })} />
                </Field>
                <Field label="Last Class">
                  <input className={inputClass} value={form.last_class} onChange={(e) => patch({ last_class: e.target.value })} />
                </Field>
                <Field label="Division">
                  <input className={inputClass} value={form.last_division} onChange={(e) => patch({ last_division: e.target.value })} />
                </Field>
                <Field label="Year Of Passing">
                  <input className={inputClass} value={form.year_of_passing} onChange={(e) => patch({ year_of_passing: e.target.value })} />
                </Field>
                <Field label="Board/University">
                  <input className={inputClass} value={form.board_university} onChange={(e) => patch({ board_university: e.target.value })} />
                </Field>
                <label className="flex items-center gap-2 pt-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.school_transport}
                    onChange={(e) => patch({ school_transport: e.target.checked })}
                  />
                  School Transport
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Bus No.">
                    <input className={inputClass} value={form.bus_no} onChange={(e) => patch({ bus_no: e.target.value })} />
                  </Field>
                  <Field label="Shift">
                    <input className={inputClass} value={form.transport_shift} onChange={(e) => patch({ transport_shift: e.target.value })} />
                  </Field>
                </div>
                <Field label="Location">
                  <input className={inputClass} value={form.location} onChange={(e) => patch({ location: e.target.value })} />
                </Field>
              </div>
            </div>
          )}

          {tab === 'parental' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div>
                <SectionTitle>Father Details</SectionTitle>
                <div className="space-y-2">
                  <Field label="Name" required>
                    <input required className={inputClass} value={form.father_name} onChange={(e) => patch({ father_name: e.target.value })} />
                  </Field>
                  <Field label="Mobile" required>
                    <input required className={inputClass} value={form.father_phone} onChange={(e) => patch({ father_phone: e.target.value })} />
                  </Field>
                  <Field label="Aadhar No">
                    <input className={inputClass} value={form.father_aadhaar} onChange={(e) => patch({ father_aadhaar: e.target.value })} />
                  </Field>
                  <Field label="Email">
                    <input type="email" className={inputClass} value={form.father_email} onChange={(e) => patch({ father_email: e.target.value })} />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Qualification">
                      <input className={inputClass} value={form.father_qualification} onChange={(e) => patch({ father_qualification: e.target.value })} />
                    </Field>
                    <Field label="Age">
                      <input type="number" className={inputClass} value={form.father_age} onChange={(e) => patch({ father_age: e.target.value })} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Occupation">
                      <input className={inputClass} value={form.father_occupation} onChange={(e) => patch({ father_occupation: e.target.value })} />
                    </Field>
                    <Field label="P.A.">
                      <input type="number" className={inputClass} value={form.father_annual_income} onChange={(e) => patch({ father_annual_income: e.target.value })} />
                    </Field>
                  </div>
                  <Field label="Off-Add">
                    <input className={inputClass} value={form.father_office_address} onChange={(e) => patch({ father_office_address: e.target.value })} />
                  </Field>
                </div>
              </div>
              <div>
                <SectionTitle>Mother Details</SectionTitle>
                <div className="space-y-2">
                  <Field label="Name">
                    <input className={inputClass} value={form.mother_name} onChange={(e) => patch({ mother_name: e.target.value })} />
                  </Field>
                  <Field label="Mobile">
                    <input className={inputClass} value={form.mother_phone} onChange={(e) => patch({ mother_phone: e.target.value })} />
                  </Field>
                  <Field label="Aadhar No">
                    <input className={inputClass} value={form.mother_aadhaar} onChange={(e) => patch({ mother_aadhaar: e.target.value })} />
                  </Field>
                  <Field label="Email">
                    <input type="email" className={inputClass} value={form.mother_email} onChange={(e) => patch({ mother_email: e.target.value })} />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Qualification">
                      <input className={inputClass} value={form.mother_qualification} onChange={(e) => patch({ mother_qualification: e.target.value })} />
                    </Field>
                    <Field label="Age">
                      <input type="number" className={inputClass} value={form.mother_age} onChange={(e) => patch({ mother_age: e.target.value })} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Occupation">
                      <input className={inputClass} value={form.mother_occupation} onChange={(e) => patch({ mother_occupation: e.target.value })} />
                    </Field>
                    <Field label="P.A.">
                      <input type="number" className={inputClass} value={form.mother_annual_income} onChange={(e) => patch({ mother_annual_income: e.target.value })} />
                    </Field>
                  </div>
                  <Field label="Off-Add">
                    <input className={inputClass} value={form.mother_office_address} onChange={(e) => patch({ mother_office_address: e.target.value })} />
                  </Field>
                </div>
              </div>
              <div>
                <SectionTitle>Guardian Details</SectionTitle>
                <div className="space-y-2">
                  <Field label="Name">
                    <input className={inputClass} value={form.guardian_name} onChange={(e) => patch({ guardian_name: e.target.value })} />
                  </Field>
                  <Field label="Mobile">
                    <input className={inputClass} value={form.guardian_phone} onChange={(e) => patch({ guardian_phone: e.target.value })} />
                  </Field>
                  <Field label="Email">
                    <input type="email" className={inputClass} value={form.guardian_email} onChange={(e) => patch({ guardian_email: e.target.value })} />
                  </Field>
                  <Field label="Address">
                    <input className={inputClass} value={form.guardian_address} onChange={(e) => patch({ guardian_address: e.target.value })} />
                  </Field>
                  <Field label="Relation">
                    <input className={inputClass} value={form.guardian_relation} onChange={(e) => patch({ guardian_relation: e.target.value })} />
                  </Field>
                  <Field label="Mar. Status">
                    <div className="flex flex-wrap gap-3 pt-1 text-sm">
                      {(['MAR', 'SEP', 'DIV', 'WID'] as const).map((status) => (
                        <label key={status} className="flex items-center gap-1">
                          <input
                            type="radio"
                            checked={form.guardian_marital_status === status}
                            onChange={() => patch({ guardian_marital_status: status })}
                          />
                          {status}
                        </label>
                      ))}
                    </div>
                  </Field>
                  <Field label="Link Staff">
                    <input className={inputClass} value={form.guardian_link_staff} onChange={(e) => patch({ guardian_link_staff: e.target.value })} />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {tab === 'references' && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {form.reference_contacts.map((ref, index) => (
                <div key={`ref-${index}`}>
                  <SectionTitle>Reference-{index + 1}</SectionTitle>
                  <div className="space-y-2">
                    <Field label="Name">
                      <input
                        className={inputClass}
                        value={ref.name}
                        onChange={(e) => {
                          const next = [...form.reference_contacts];
                          next[index] = { ...ref, name: e.target.value };
                          patch({ reference_contacts: next });
                        }}
                      />
                    </Field>
                    <Field label="Class">
                      <input
                        className={inputClass}
                        value={ref.class_name}
                        onChange={(e) => {
                          const next = [...form.reference_contacts];
                          next[index] = { ...ref, class_name: e.target.value };
                          patch({ reference_contacts: next });
                        }}
                      />
                    </Field>
                    <Field label="Reg Id">
                      <input
                        className={inputClass}
                        value={ref.reg_id}
                        onChange={(e) => {
                          const next = [...form.reference_contacts];
                          next[index] = { ...ref, reg_id: e.target.value };
                          patch({ reference_contacts: next });
                        }}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'others' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <SectionTitle>Bank Details</SectionTitle>
                <div className="space-y-2">
                  <Field label="Bank Name">
                    <input className={inputClass} value={form.bank_name} onChange={(e) => patch({ bank_name: e.target.value })} />
                  </Field>
                  <Field label="IFSC Code">
                    <input className={inputClass} value={form.ifsc_code} onChange={(e) => patch({ ifsc_code: e.target.value })} />
                  </Field>
                  <Field label="A/c No">
                    <input className={inputClass} value={form.account_no} onChange={(e) => patch({ account_no: e.target.value })} />
                  </Field>
                  <Field label="Branch">
                    <input className={inputClass} value={form.branch} onChange={(e) => patch({ branch: e.target.value })} />
                  </Field>
                  <Field label="Saturday Activities">
                    <select className={inputClass} value={form.saturday_activity} onChange={(e) => patch({ saturday_activity: e.target.value })}>
                      {ACTIVITIES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>
              <div>
                <SectionTitle>Other Details</SectionTitle>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="w-28 text-gray-600">Handicapped</span>
                    <label className="flex items-center gap-1">
                      <input type="radio" checked={form.handicapped} onChange={() => patch({ handicapped: true })} /> Yes
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="radio" checked={!form.handicapped} onChange={() => patch({ handicapped: false })} /> No
                    </label>
                    <input className={`${inputBase} w-16`} placeholder="%" value={form.handicapped_percent} onChange={(e) => patch({ handicapped_percent: e.target.value })} />
                    <span className="text-gray-600">Blood Group</span>
                    <select className={`${inputBase} w-20`} value={form.blood_group} onChange={(e) => patch({ blood_group: e.target.value })}>
                      <option value=""> </option>
                      {BLOOD_GROUPS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                    <span className="text-gray-600">Height</span>
                    <input className={`${inputBase} w-16`} value={form.height_cm} onChange={(e) => patch({ height_cm: e.target.value })} />
                    <span className="text-gray-600">Weight</span>
                    <input className={`${inputBase} w-16`} value={form.weight_kg} onChange={(e) => patch({ weight_kg: e.target.value })} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="w-28 text-gray-600">Rashan Card</span>
                    <label className="flex items-center gap-1">
                      <input type="radio" checked={form.ration_card} onChange={() => patch({ ration_card: true })} /> Yes
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="radio" checked={!form.ration_card} onChange={() => patch({ ration_card: false })} /> No
                    </label>
                    <input className={`${inputBase} w-24`} placeholder="Type" value={form.ration_type} onChange={(e) => patch({ ration_type: e.target.value })} />
                    <span className="text-gray-600">No</span>
                    <input className={`${inputBase} w-24`} value={form.ration_no} onChange={(e) => patch({ ration_no: e.target.value })} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="w-28 text-gray-600">Medium</span>
                    <label className="flex items-center gap-1">
                      <input type="radio" checked={form.medium === 'English'} onChange={() => patch({ medium: 'English' })} /> English
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="radio" checked={form.medium === 'Hindi'} onChange={() => patch({ medium: 'Hindi' })} /> Hindi
                    </label>
                  </div>
                  <Field label="Localadd">
                    <input className={inputClass} value={form.local_address} onChange={(e) => patch({ local_address: e.target.value })} />
                  </Field>
                  <Field label="Legaladd">
                    <input className={inputClass} value={form.legal_address} onChange={(e) => patch({ legal_address: e.target.value })} />
                  </Field>
                  <Field label="Husband Add">
                    <input className={inputClass} value={form.husband_address} onChange={(e) => patch({ husband_address: e.target.value })} />
                  </Field>
                  <Field label="Remarks">
                    <textarea rows={2} className={inputClass} value={form.remarks} onChange={(e) => patch({ remarks: e.target.value })} />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {tab === 'documents' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs text-gray-600">
                  <tr>
                    <th className="px-2 py-2">Doc Type</th>
                    <th className="px-2 py-2">Doc Name</th>
                    <th className="px-2 py-2">File Type</th>
                    <th className="px-2 py-2">Doc File / note</th>
                  </tr>
                </thead>
                <tbody>
                  {form.documents.map((doc, index) => (
                    <tr key={`doc-${index}`} className="border-t">
                      <td className="px-2 py-1">
                        <input className={inputClass} value={doc.doc_type} onChange={(e) => {
                          const next = [...form.documents];
                          next[index] = { ...doc, doc_type: e.target.value };
                          patch({ documents: next });
                        }} />
                      </td>
                      <td className="px-2 py-1">
                        <input className={inputClass} value={doc.doc_name} onChange={(e) => {
                          const next = [...form.documents];
                          next[index] = { ...doc, doc_name: e.target.value };
                          patch({ documents: next });
                        }} />
                      </td>
                      <td className="px-2 py-1">
                        <input className={inputClass} value={doc.file_type} onChange={(e) => {
                          const next = [...form.documents];
                          next[index] = { ...doc, file_type: e.target.value };
                          patch({ documents: next });
                        }} />
                      </td>
                      <td className="px-2 py-1">
                        <input className={inputClass} value={doc.file_name} onChange={(e) => {
                          const next = [...form.documents];
                          next[index] = { ...doc, file_name: e.target.value };
                          patch({ documents: next });
                        }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-1 text-sm text-primary-700"
                onClick={() => patch({ documents: [...form.documents, emptyDocument()] })}
              >
                <FiPlus /> Add document row
              </button>
              <p className="mt-2 text-xs text-gray-500">
                Record document names and types here. File uploads can be attached later from the student profile.
              </p>
            </div>
          )}

          {tab === 'exam' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
              <div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-600">
                    <tr>
                      <th className="px-2 py-2 text-left">Subject Studies</th>
                      <th className="px-2 py-2">E.Test M.M</th>
                      <th className="px-2 py-2">E.Test O.M</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.exam_subjects.map((row, index) => (
                      <tr key={`exam-${index}`} className="border-t">
                        <td className="px-2 py-1">
                          <div className="flex items-center gap-2">
                            <span className="w-4 text-xs text-gray-500">{index + 1}.</span>
                            <input className={inputClass} value={row.subject} onChange={(e) => {
                              const next = [...form.exam_subjects];
                              next[index] = { ...row, subject: e.target.value };
                              patch({ exam_subjects: next });
                            }} />
                          </div>
                        </td>
                        <td className="px-2 py-1">
                          <input className={inputClass} value={row.max_marks} onChange={(e) => {
                            const next = [...form.exam_subjects];
                            next[index] = { ...row, max_marks: e.target.value };
                            patch({ exam_subjects: next });
                          }} />
                        </td>
                        <td className="px-2 py-1">
                          <input className={inputClass} value={row.obtained_marks} onChange={(e) => {
                            const next = [...form.exam_subjects];
                            next[index] = { ...row, obtained_marks: e.target.value };
                            patch({ exam_subjects: next });
                          }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[720px] w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-600">
                    <tr>
                      <th className="px-2 py-2 text-left">Roll No</th>
                      <th className="px-2 py-2 text-left">Examination Passed</th>
                      <th className="px-2 py-2 text-left">University/College/Board</th>
                      <th className="px-2 py-2">Year</th>
                      <th className="px-2 py-2">Subjects</th>
                      <th className="px-2 py-2">Obt. Marks</th>
                      <th className="px-2 py-2">Total Marks</th>
                      <th className="px-2 py-2">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.previous_education.map((row, index) => (
                      <tr key={`prev-${index}`} className="border-t">
                        {(
                          [
                            'roll_no',
                            'examination',
                            'university',
                            'year',
                            'subjects',
                            'obt_marks',
                            'total_marks',
                            'percent',
                          ] as const
                        ).map((key) => (
                          <td key={key} className="px-2 py-1">
                            <input
                              className={inputClass}
                              value={row[key]}
                              onChange={(e) => {
                                const next = [...form.previous_education];
                                next[index] = { ...row, [key]: e.target.value };
                                patch({ previous_education: next });
                              }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'sessions' && (
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-600">
                  <tr>
                    <th className="px-2 py-2 text-left">Session</th>
                    <th className="px-2 py-2 text-left">Class</th>
                    <th className="px-2 py-2 text-left">Section</th>
                    <th className="px-2 py-2">Roll No</th>
                    <th className="px-2 py-2">Reg_id</th>
                    <th className="px-2 py-2">Trpt</th>
                    <th className="px-2 py-2">Location</th>
                    <th className="px-2 py-2">Bus No.</th>
                    <th className="px-2 py-2">Category</th>
                    <th className="px-2 py-2">Fee Type</th>
                  </tr>
                </thead>
                <tbody>
                  {form.session_rows.map((row, index) => (
                    <tr key={`sess-${index}`} className="border-t">
                      {(
                        [
                          'session',
                          'class_name',
                          'section',
                          'roll_no',
                          'reg_id',
                          'transport',
                          'location',
                          'bus_no',
                          'category',
                          'fee_type',
                        ] as const
                      ).map((key) => (
                        <td key={key} className="px-2 py-1">
                          <input
                            className={inputClass}
                            value={row[key]}
                            onChange={(e) => {
                              const next = [...form.session_rows];
                              next[index] = { ...row, [key]: e.target.value };
                              patch({ session_rows: next });
                            }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-1 text-sm text-primary-700"
                onClick={() => patch({ session_rows: [...form.session_rows, emptySession()] })}
              >
                <FiPlus /> Add session row
              </button>
            </div>
          )}
        </form>
      </AppModalShell>
    </AppModal>
  );
}
