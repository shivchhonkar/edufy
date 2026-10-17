'use client';

import AppModal, { AppModalShell } from '@/shared/components/common/AppModal';
import { useEffect, useMemo, useState } from 'react';
import { FiChevronDown, FiChevronUp, FiX } from 'react-icons/fi';
import {
  parseDocuments,
  parseExamSubjects,
  parsePreviousEducation,
  parseReferences,
  parseSessionRows,
} from '@/lib/registration-write-values';
import { INDIAN_STATES } from '@/shared/constants/indian-states';
import { useStudentLookups } from '@/features/students/hooks/useStudentLookups';

interface ClassItem {
  id: number;
  name: string;
}

interface SectionItem {
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
  status?: string;
  [key: string]: unknown;
}

function splitStoredName(firstName: string, lastName: string) {
  if (lastName.trim()) return { first: firstName, last: lastName };
  const parts = firstName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { first: firstName, last: lastName };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

interface AddRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result?: { admitted?: boolean; admissionNumber?: string }) => void;
  classes: ClassItem[];
  editing: RegistrationRecord | null;
  defaultAcademicYear?: string;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none';
const errorInputClass = `${inputClass} border-red-500`;

function str(value: unknown): string {
  if (value == null) return '';
  return String(value);
}

function bool(value: unknown): boolean {
  return value === true || value === 'true' || value === 'Yes' || value === 1;
}

function sanitizePhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
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
    student_first_name: '',
    student_last_name: '',
    gender: 'Male',
    class_id: '',
    section_id: '',
    date_of_birth: '',
    student_email: '',
    aadhaar_no: '',
    father_name: '',
    father_phone: '',
    father_email: '',
    mother_name: '',
    mother_phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    last_school: '',
    last_class: '',
    social_category: '',
    religion: '',
    nationality: '',
    blood_group: '',
    school_transport: false,
    bus_no: '',
    fee_amount: '',
    fee_type: '',
    receipt_number: '',
    remarks: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_relation: '',
    reporting_mobile: '',
    live_class: 'Y',
    permanent_address: '',
    samagra_id: '',
    student_category: '',
    category: '',
    sub_caste: '',
    fees_from: 'Apr',
    last_division: '',
    year_of_passing: '',
    board_university: '',
    transport_shift: '',
    location: '',
    father_qualification: '',
    father_occupation: '',
    father_office_address: '',
    father_aadhaar: '',
    father_age: '',
    father_annual_income: '',
    mother_email: '',
    mother_qualification: '',
    mother_occupation: '',
    mother_office_address: '',
    mother_aadhaar: '',
    mother_age: '',
    mother_annual_income: '',
    guardian_email: '',
    guardian_address: '',
    guardian_marital_status: '',
    guardian_link_staff: '',
    bank_name: '',
    ifsc_code: '',
    account_no: '',
    branch: '',
    saturday_activity: '',
    handicapped: false,
    handicapped_percent: '',
    height_cm: '',
    weight_kg: '',
    ration_card: false,
    ration_type: '',
    ration_no: '',
    medium: 'English',
    local_address: '',
    legal_address: '',
    husband_address: '',
    reference_contacts: [] as ReturnType<typeof parseReferences>,
    exam_subjects: [] as ReturnType<typeof parseExamSubjects>,
    previous_education: [] as ReturnType<typeof parsePreviousEducation>,
    session_rows: [] as ReturnType<typeof parseSessionRows>,
    documents: [] as ReturnType<typeof parseDocuments>,
  };
}

function formFromRecord(row: RegistrationRecord, fallbackYear: string) {
  const base = createEmptyForm(str(row.academic_year) || fallbackYear);
  const names = splitStoredName(str(row.student_first_name), str(row.student_last_name));
  return {
    ...base,
    registration_date: str(row.registration_date).slice(0, 10) || base.registration_date,
    academic_year: str(row.academic_year) || fallbackYear,
    student_first_name: names.first,
    student_last_name: names.last,
    gender: str(row.gender) || 'Male',
    class_id: row.class_id != null ? String(row.class_id) : '',
    date_of_birth: str(row.date_of_birth).slice(0, 10),
    student_email: str(row.student_email),
    aadhaar_no: str(row.aadhaar_no),
    father_name: str(row.parent_name),
    father_phone: str(row.parent_phone),
    father_email: str(row.parent_email),
    mother_name: str(row.mother_name),
    mother_phone: str(row.mother_phone),
    address: str(row.address),
    city: str(row.city),
    state: str(row.state),
    pincode: str(row.pincode),
    last_school: str(row.last_school),
    last_class: str(row.last_class),
    social_category: str(row.social_category),
    religion: str(row.religion),
    nationality: str(row.nationality),
    blood_group: str(row.blood_group),
    school_transport: bool(row.school_transport),
    bus_no: str(row.bus_no),
    fee_amount: row.fee_amount != null ? String(row.fee_amount) : '',
    fee_type: str(row.fee_type),
    receipt_number: str(row.receipt_number),
    remarks: str(row.remarks),
    guardian_name: str(row.guardian_name),
    guardian_phone: str(row.guardian_phone),
    guardian_relation: str(row.guardian_relation),
    reporting_mobile: str(row.reporting_mobile),
    live_class: str(row.live_class) || 'Y',
    permanent_address: str(row.permanent_address),
    samagra_id: str(row.samagra_id),
    student_category: str(row.student_category),
    category: str(row.category),
    sub_caste: str(row.sub_caste),
    fees_from: str(row.fees_from) || 'Apr',
    last_division: str(row.last_division),
    year_of_passing: str(row.year_of_passing),
    board_university: str(row.board_university),
    transport_shift: str(row.transport_shift),
    location: str(row.location),
    father_qualification: str(row.father_qualification),
    father_occupation: str(row.father_occupation),
    father_office_address: str(row.father_office_address),
    father_aadhaar: str(row.father_aadhaar),
    father_age: str(row.father_age),
    father_annual_income: str(row.father_annual_income),
    mother_email: str(row.mother_email),
    mother_qualification: str(row.mother_qualification),
    mother_occupation: str(row.mother_occupation),
    mother_office_address: str(row.mother_office_address),
    mother_aadhaar: str(row.mother_aadhaar),
    mother_age: str(row.mother_age),
    mother_annual_income: str(row.mother_annual_income),
    guardian_email: str(row.guardian_email),
    guardian_address: str(row.guardian_address),
    guardian_marital_status: str(row.guardian_marital_status),
    guardian_link_staff: str(row.guardian_link_staff),
    bank_name: str(row.bank_name),
    ifsc_code: str(row.ifsc_code),
    account_no: str(row.account_no),
    branch: str(row.branch),
    saturday_activity: str(row.saturday_activity),
    handicapped: bool(row.handicapped),
    handicapped_percent: str(row.handicapped_percent),
    height_cm: str(row.height_cm),
    weight_kg: str(row.weight_kg),
    ration_card: bool(row.ration_card),
    ration_type: str(row.ration_type),
    ration_no: str(row.ration_no),
    medium: str(row.medium) || 'English',
    local_address: str(row.local_address),
    legal_address: str(row.legal_address),
    husband_address: str(row.husband_address),
    reference_contacts: parseReferences(row.reference_contacts),
    exam_subjects: parseExamSubjects(row.exam_subjects),
    previous_education: parsePreviousEducation(row.previous_education),
    session_rows: parseSessionRows(row.session_rows),
    documents: parseDocuments(row.documents),
  };
}

function Field({
  label,
  required,
  error,
  children,
  className = '',
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-gray-600">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
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
  const { lookups } = useStudentLookups(isOpen);
  const [form, setForm] = useState(() => createEmptyForm(defaultAcademicYear));
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [feeCategories, setFeeCategories] = useState<{ id: number; name: string }[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [showMore, setShowMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setFieldErrors({});
    setShowMore(false);
    setForm(editing ? formFromRecord(editing, defaultAcademicYear) : createEmptyForm(defaultAcademicYear));

    Promise.all([
      fetch('/api/academic-years').then((r) => r.json()).catch(() => ({ data: [] })),
      fetch('/api/fees/categories?is_active=true').then((r) => r.json()).catch(() => ({ data: [] })),
    ]).then(([yearsRes, feesRes]) => {
      const years: AcademicYear[] = yearsRes.data || [];
      setAcademicYears(years);
      setFeeCategories(feesRes.data || []);
      if (!editing) {
        setForm((prev) => ({
          ...prev,
          academic_year:
            prev.academic_year ||
            years.find((y) => y.is_active)?.name ||
            years[0]?.name ||
            defaultAcademicYear,
        }));
      }
    });
  }, [isOpen, editing, defaultAcademicYear]);

  useEffect(() => {
    if (!isOpen || !form.class_id) {
      setSections([]);
      return;
    }
    fetch(`/api/sections?class_id=${form.class_id}`)
      .then((r) => r.json())
      .then((d) => setSections(d.success ? d.data || [] : []))
      .catch(() => setSections([]));
  }, [isOpen, form.class_id]);

  const age = useMemo(() => ageFromDob(form.date_of_birth), [form.date_of_birth]);
  const patch = (updates: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...updates }));

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.student_first_name.trim()) next.student_first_name = 'Enter the student first name';
    if (!form.student_last_name.trim()) next.student_last_name = 'Enter the student last name';
    if (!form.class_id) next.class_id = 'Select the class';
    if (!form.date_of_birth) next.date_of_birth = 'Enter date of birth';
    if (!form.father_name.trim()) next.father_name = 'Enter parent / father name';
    const phone = sanitizePhone(form.father_phone);
    if (!phone) next.father_phone = 'Enter a mobile number';
    else if (phone.length !== 10 || !/^[6-9]/.test(phone)) next.father_phone = 'Enter a valid 10-digit mobile number';
    if (form.mother_phone && (sanitizePhone(form.mother_phone).length !== 10 || !/^[6-9]/.test(sanitizePhone(form.mother_phone)))) {
      next.mother_phone = 'Enter a valid 10-digit mobile number';
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async (admitAfterSave: boolean) => {
    if (!validate()) {
      setError('Please fill the required fields.');
      return;
    }
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
            class_id: form.class_id || null,
            fee_amount: form.fee_amount || null,
            father_phone: sanitizePhone(form.father_phone),
            mother_phone: sanitizePhone(form.mother_phone) || null,
            reporting_mobile: sanitizePhone(form.reporting_mobile) || form.reporting_mobile,
          }),
        }
      );
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to save registration');
        return;
      }

      const registrationId = data.data?.id || editing?.id;
      if (admitAfterSave && registrationId) {
        const admitRes = await fetch(`/api/students/registrations/${registrationId}/admit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section_id: form.section_id || null }),
        });
        const admitData = await admitRes.json();
        if (!admitData.success) {
          setError(admitData.error || 'Saved, but could not admit the student');
          onSuccess();
          return;
        }
        onSuccess({
          admitted: true,
          admissionNumber: admitData.data?.student?.admission_number,
        });
        onClose();
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void save(false);
  };

  const alreadyAdmitted = editing?.status === 'admitted';

  return (
    <AppModal open={isOpen} onClose={onClose}>
      <AppModalShell
        header={
          <>
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                {editing ? 'Edit Registration' : 'Register Student'}
              </h2>
              <p className="text-sm text-gray-500">
                Enter student and parent details. You can admit them to the school after saving.
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
              className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : editing ? 'Save changes' : 'Save registration'}
            </button>
            {!alreadyAdmitted && (
              <button
                type="button"
                disabled={saving}
                onClick={() => void save(true)}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save & admit'}
              </button>
            )}
          </>
        }
      >
        <form id="reg-form" onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Registration date">
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
            <Field label="Registration no.">
              <input
                value={editing?.registration_number || 'Generated on save'}
                disabled
                className={`${inputClass} bg-gray-50 text-gray-500`}
              />
            </Field>
          </div>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-gray-800">Student</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="First name" required error={fieldErrors.student_first_name}>
                <input
                  autoFocus
                  className={fieldErrors.student_first_name ? errorInputClass : inputClass}
                  value={form.student_first_name}
                  onChange={(e) => patch({ student_first_name: e.target.value })}
                />
              </Field>
              <Field label="Last name" required error={fieldErrors.student_last_name}>
                <input
                  className={fieldErrors.student_last_name ? errorInputClass : inputClass}
                  value={form.student_last_name}
                  onChange={(e) => patch({ student_last_name: e.target.value })}
                />
              </Field>
              <Field label="Gender">
                <select className={inputClass} value={form.gender} onChange={(e) => patch({ gender: e.target.value })}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </Field>
              <Field label="Date of birth" required error={fieldErrors.date_of_birth}>
                <div className="flex gap-2">
                  <input
                    type="date"
                    className={fieldErrors.date_of_birth ? errorInputClass : inputClass}
                    value={form.date_of_birth}
                    onChange={(e) => patch({ date_of_birth: e.target.value })}
                  />
                  <input className={`${inputClass} w-16 shrink-0 bg-gray-50`} value={age} disabled placeholder="Age" />
                </div>
              </Field>
              <Field label="Class" required error={fieldErrors.class_id}>
                <select
                  className={fieldErrors.class_id ? errorInputClass : inputClass}
                  value={form.class_id}
                  onChange={(e) => patch({ class_id: e.target.value, section_id: '' })}
                >
                  <option value="">Select class</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Section">
                <select
                  className={inputClass}
                  value={form.section_id}
                  onChange={(e) => patch({ section_id: e.target.value })}
                  disabled={!form.class_id}
                >
                  <option value="">Optional</option>
                  {sections.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Aadhaar">
                <input
                  className={inputClass}
                  value={form.aadhaar_no}
                  maxLength={12}
                  inputMode="numeric"
                  onChange={(e) => patch({ aadhaar_no: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                />
              </Field>
              <Field label="Student email">
                <input
                  type="email"
                  className={inputClass}
                  value={form.student_email}
                  onChange={(e) => patch({ student_email: e.target.value })}
                />
              </Field>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-gray-800">Parent / guardian</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Father / parent name" required error={fieldErrors.father_name}>
                <input
                  className={fieldErrors.father_name ? errorInputClass : inputClass}
                  value={form.father_name}
                  onChange={(e) => patch({ father_name: e.target.value })}
                />
              </Field>
              <Field label="Mobile" required error={fieldErrors.father_phone}>
                <input
                  className={fieldErrors.father_phone ? errorInputClass : inputClass}
                  value={form.father_phone}
                  inputMode="numeric"
                  onChange={(e) => patch({ father_phone: sanitizePhone(e.target.value) })}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  className={inputClass}
                  value={form.father_email}
                  onChange={(e) => patch({ father_email: e.target.value })}
                />
              </Field>
              <Field label="Mother name">
                <input className={inputClass} value={form.mother_name} onChange={(e) => patch({ mother_name: e.target.value })} />
              </Field>
              <Field label="Mother mobile" error={fieldErrors.mother_phone}>
                <input
                  className={fieldErrors.mother_phone ? errorInputClass : inputClass}
                  value={form.mother_phone}
                  inputMode="numeric"
                  onChange={(e) => patch({ mother_phone: sanitizePhone(e.target.value) })}
                />
              </Field>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-gray-800">Address</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Address" className="sm:col-span-2 lg:col-span-4">
                <input className={inputClass} value={form.address} onChange={(e) => patch({ address: e.target.value })} />
              </Field>
              <Field label="City">
                <input className={inputClass} value={form.city} onChange={(e) => patch({ city: e.target.value })} />
              </Field>
              <Field label="State">
                <select className={inputClass} value={form.state} onChange={(e) => patch({ state: e.target.value })}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="PIN code">
                <input
                  className={inputClass}
                  value={form.pincode}
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(e) => patch({ pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                />
              </Field>
            </div>
          </section>

          <button
            type="button"
            onClick={() => setShowMore((prev) => !prev)}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary-700"
          >
            {showMore ? <FiChevronUp /> : <FiChevronDown />}
            {showMore ? 'Hide extra details' : 'Add extra details'}
          </button>

          {showMore && (
            <div className="space-y-5 rounded-xl border border-gray-200 bg-gray-50/70 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Social category">
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
                <Field label="Blood group">
                  <select className={inputClass} value={form.blood_group} onChange={(e) => patch({ blood_group: e.target.value })}>
                    <option value="">Select</option>
                    {BLOOD_GROUPS.map((group) => (
                      <option key={group} value={group}>
                        {group}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Previous school">
                  <input className={inputClass} value={form.last_school} onChange={(e) => patch({ last_school: e.target.value })} />
                </Field>
                <Field label="Previous class">
                  <input className={inputClass} value={form.last_class} onChange={(e) => patch({ last_class: e.target.value })} />
                </Field>
                <Field label="Registration fee">
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={form.fee_amount}
                    onChange={(e) => patch({ fee_amount: e.target.value })}
                  />
                </Field>
                <Field label="Fee type">
                  <select className={inputClass} value={form.fee_type} onChange={(e) => patch({ fee_type: e.target.value })}>
                    <option value="">Select</option>
                    {feeCategories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Receipt no.">
                  <input className={inputClass} value={form.receipt_number} onChange={(e) => patch({ receipt_number: e.target.value })} />
                </Field>
                <label className="flex items-center gap-2 pt-6 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.school_transport}
                    onChange={(e) => patch({ school_transport: e.target.checked })}
                  />
                  School transport
                </label>
                {form.school_transport && (
                  <Field label="Bus no.">
                    <input className={inputClass} value={form.bus_no} onChange={(e) => patch({ bus_no: e.target.value })} />
                  </Field>
                )}
                <Field label="Guardian name">
                  <input className={inputClass} value={form.guardian_name} onChange={(e) => patch({ guardian_name: e.target.value })} />
                </Field>
                <Field label="Guardian mobile">
                  <input
                    className={inputClass}
                    value={form.guardian_phone}
                    inputMode="numeric"
                    onChange={(e) => patch({ guardian_phone: sanitizePhone(e.target.value) })}
                  />
                </Field>
                <Field label="Relation">
                  <input className={inputClass} value={form.guardian_relation} onChange={(e) => patch({ guardian_relation: e.target.value })} />
                </Field>
                <Field label="Remarks" className="sm:col-span-2 lg:col-span-4">
                  <textarea
                    rows={2}
                    className={inputClass}
                    value={form.remarks}
                    onChange={(e) => patch({ remarks: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          )}
        </form>
      </AppModalShell>
    </AppModal>
  );
}
