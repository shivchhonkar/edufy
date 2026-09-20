'use client';

import AppModal, { AppModalShell } from '@/shared/components/common/AppModal';
import { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import type { InquiryStatus } from '@/lib/admission-inquiry-api';
import { STATUS_LABELS } from '@/features/admissions/utils/inquiry-labels';
import { STUDENT_TITLES, type StudentType } from '@/lib/inquiry-write-values';

interface Class {
  id: number;
  name: string;
}

interface AcademicYear {
  id: number;
  name: string;
  is_active?: boolean;
}

interface AddInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  classes: Class[];
  defaultStatus?: InquiryStatus;
}

type StudentSlot = {
  title: string;
  name: string;
  class_id: string;
  date_of_birth: string;
  email: string;
  last_school: string;
};

type SiblingSlot = {
  name: string;
  class_name: string;
  school: string;
};

const emptyStudent = (): StudentSlot => ({
  title: 'Mst.',
  name: '',
  class_id: '',
  date_of_birth: '',
  email: '',
  last_school: '',
});

const emptySibling = (): SiblingSlot => ({ name: '', class_name: '', school: '' });

const THROUGH_OPTIONS: { value: string; label: string }[] = [
  { value: 'advertisement', label: 'Advertisement' },
  { value: 'website', label: 'Website' },
  { value: 'walk_in', label: 'Walk-In' },
  { value: 'referral', label: 'Friends' },
  { value: 'other', label: 'Others' },
];

const STUDENT_TYPE_OPTIONS: { value: StudentType; label: string }[] = [
  { value: 'regular', label: 'Regular' },
  { value: 'day_boarding', label: 'Day Boarding' },
  { value: 'hostler', label: 'Hostler' },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyForm() {
  return {
    inquiry_date: '',
    academic_year: '',
    number_of_students: 1,
    is_cancelled: false,
    father_name: '',
    father_phone: '',
    father_email: '',
    father_qualification: '',
    father_occupation: '',
    father_office_address: '',
    mother_name: '',
    mother_phone: '',
    mother_email: '',
    mother_qualification: '',
    mother_occupation: '',
    mother_office_address: '',
    student_type: 'regular' as StudentType,
    source: 'walk_in',
    address: '',
    location: '',
    reporting: '',
    reporting_mobile: '',
    student1: emptyStudent(),
    student2: emptyStudent(),
    student3: emptyStudent(),
    sibling1: emptySibling(),
    sibling2: emptySibling(),
    follow_up_date: '',
    priority: 'normal',
    remarks: '',
  };
}

const inputBase =
  'border border-gray-300 rounded-md px-2.5 py-1.5 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500';
const inputClass = `w-full ${inputBase}`;

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

function StudentBlock({
  label,
  student,
  onChange,
  classes,
  required,
}: {
  label: string;
  student: StudentSlot;
  onChange: (patch: Partial<StudentSlot>) => void;
  classes: Class[];
  required?: boolean;
}) {
  return (
    <div>
      <SectionTitle>{label}</SectionTitle>
      <div className="space-y-2">
        <Field label="Name" required={required}>
          <div className="flex items-stretch gap-2">
            <select
              value={student.title}
              onChange={(e) => onChange({ title: e.target.value })}
              className={`${inputBase} w-[4.75rem] shrink-0`}
            >
              {STUDENT_TITLES.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>
            <input
              required={required}
              value={student.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className={`${inputBase} min-w-0 flex-1`}
            />
          </div>
        </Field>
        <Field label="Class">
          <select
            value={student.class_id}
            onChange={(e) => onChange({ class_id: e.target.value })}
            className={inputClass}
          >
            <option value="">Select class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="D.O.B">
          <input
            type="date"
            value={student.date_of_birth}
            onChange={(e) => onChange({ date_of_birth: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={student.email}
            onChange={(e) => onChange({ email: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Last School">
          <input
            value={student.last_school}
            onChange={(e) => onChange({ last_school: e.target.value })}
            className={inputClass}
          />
        </Field>
      </div>
    </div>
  );
}

export default function AddInquiryModal({
  isOpen,
  onClose,
  onSuccess,
  classes,
  defaultStatus = 'new',
}: AddInquiryModalProps) {
  const [form, setForm] = useState(createEmptyForm);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setForm({ ...createEmptyForm(), inquiry_date: todayIso() });
    setError('');

    fetch('/api/academic-years')
      .then((res) => res.json())
      .then((data) => {
        const years: AcademicYear[] = data.data || [];
        setAcademicYears(years);
        const active = years.find((y) => y.is_active) || years[0];
        if (active) {
          setForm((prev) => ({ ...prev, academic_year: active.name }));
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const patchStudent = (key: 'student1' | 'student2' | 'student3', patch: Partial<StudentSlot>) => {
    setForm((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const extraStudents = [form.student2, form.student3]
      .filter((s) => s.name.trim())
      .map((s) => ({
        title: s.title,
        name: s.name.trim(),
        class_id: s.class_id ? parseInt(s.class_id, 10) : null,
        date_of_birth: s.date_of_birth || null,
        email: s.email.trim() || null,
        last_school: s.last_school.trim() || null,
      }));

    const siblings = [form.sibling1, form.sibling2]
      .filter((s) => s.name.trim() || s.class_name.trim() || s.school.trim())
      .map((s) => ({
        name: s.name.trim(),
        class_name: s.class_name.trim(),
        school: s.school.trim(),
      }));

    try {
      const res = await fetch('/api/admissions/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiry_date: form.inquiry_date || null,
          academic_year: form.academic_year || null,
          number_of_students: Math.max(form.number_of_students, extraStudents.length + 1),
          is_cancelled: form.is_cancelled,
          student_first_name: form.student1.name.trim(),
          student_title: form.student1.title,
          date_of_birth: form.student1.date_of_birth || null,
          student_email: form.student1.email || null,
          last_school: form.student1.last_school || null,
          interested_class_id: form.student1.class_id
            ? parseInt(form.student1.class_id, 10)
            : null,
          father_name: form.father_name,
          father_phone: form.father_phone,
          father_email: form.father_email || null,
          father_qualification: form.father_qualification || null,
          father_occupation: form.father_occupation || null,
          father_office_address: form.father_office_address || null,
          parent_relation: 'father',
          mother_name: form.mother_name || null,
          mother_phone: form.mother_phone || null,
          mother_email: form.mother_email || null,
          mother_qualification: form.mother_qualification || null,
          mother_occupation: form.mother_occupation || null,
          mother_office_address: form.mother_office_address || null,
          student_type: form.student_type,
          source: form.source,
          address: form.address || null,
          location: form.location || null,
          reporting: form.reporting || null,
          reporting_mobile: form.reporting_mobile || null,
          additional_students: extraStudents,
          siblings,
          follow_up_date: form.follow_up_date || null,
          priority: form.priority,
          remarks: form.remarks || null,
          status: defaultStatus,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to create inquiry');
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setError('Failed to create inquiry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppModal open={isOpen} onClose={onClose}>
      <AppModalShell
        header={
          <>
            <div>
              <h2 className="text-lg text-gray-900 sm:text-xl">Enquiry Master</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Capture student, parent, and sibling details
                {defaultStatus !== 'new' && (
                  <span className="ml-1 text-primary-600">
                    · Starts in {STATUS_LABELS[defaultStatus]}
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-gray-400 transition-colors hover:text-gray-600"
              aria-label="Close"
            >
              <FiX size={24} />
            </button>
          </>
        }
        footer={
          <>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg border border-gray-300 px-6 py-2.5 font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="inquiry-form"
              disabled={submitting}
              className="w-full rounded-lg bg-primary-600 px-6 py-2.5 font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {submitting ? 'Saving...' : 'Create Inquiry'}
            </button>
          </>
        }
      >
        <form id="inquiry-form" onSubmit={handleSubmit} className="p-4 sm:p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Field label="Date">
              <input
                type="date"
                value={form.inquiry_date}
                onChange={(e) => setForm({ ...form, inquiry_date: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Session">
              <select
                value={form.academic_year}
                onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                className={inputClass}
              >
                <option value="">Select session</option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.name}>
                    {year.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Enq. Sr. No.">
              <input value="Auto" disabled className={`${inputClass} bg-gray-50 text-gray-500`} />
            </Field>
            <Field label="No. of Students">
              <input
                type="number"
                min={1}
                max={3}
                value={form.number_of_students}
                onChange={(e) =>
                  setForm({
                    ...form,
                    number_of_students: Math.min(3, Math.max(1, parseInt(e.target.value, 10) || 1)),
                  })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Follow-up date">
              <input
                type="date"
                value={form.follow_up_date}
                onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })}
                className={inputClass}
              />
            </Field>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.is_cancelled}
                  onChange={(e) => setForm({ ...form, is_cancelled: e.target.checked })}
                  className="rounded border-gray-300"
                />
                Cancelled
              </label>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div>
              <SectionTitle>Father Details</SectionTitle>
              <div className="space-y-2">
                <Field label="Name" required>
                  <input
                    required
                    value={form.father_name}
                    onChange={(e) => setForm({ ...form, father_name: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Mobile" required>
                  <input
                    required
                    value={form.father_phone}
                    onChange={(e) => setForm({ ...form, father_phone: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={form.father_email}
                    onChange={(e) => setForm({ ...form, father_email: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Qualification">
                  <input
                    value={form.father_qualification}
                    onChange={(e) => setForm({ ...form, father_qualification: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Occupation">
                  <input
                    value={form.father_occupation}
                    onChange={(e) => setForm({ ...form, father_occupation: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Off-Add">
                  <input
                    value={form.father_office_address}
                    onChange={(e) => setForm({ ...form, father_office_address: e.target.value })}
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>

            <div>
              <SectionTitle>Mother Details</SectionTitle>
              <div className="space-y-2">
                <Field label="Name">
                  <input
                    value={form.mother_name}
                    onChange={(e) => setForm({ ...form, mother_name: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Mobile">
                  <input
                    value={form.mother_phone}
                    onChange={(e) => setForm({ ...form, mother_phone: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={form.mother_email}
                    onChange={(e) => setForm({ ...form, mother_email: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Qualification">
                  <input
                    value={form.mother_qualification}
                    onChange={(e) => setForm({ ...form, mother_qualification: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Occupation">
                  <input
                    value={form.mother_occupation}
                    onChange={(e) => setForm({ ...form, mother_occupation: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Off-Add">
                  <input
                    value={form.mother_office_address}
                    onChange={(e) => setForm({ ...form, mother_office_address: e.target.value })}
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <SectionTitle>Student Type</SectionTitle>
                <div className="flex flex-wrap gap-3 text-sm text-gray-800">
                  {STUDENT_TYPE_OPTIONS.map((option) => (
                    <label key={option.value} className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="student_type"
                        checked={form.student_type === option.value}
                        onChange={() => setForm({ ...form, student_type: option.value })}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <SectionTitle>Through</SectionTitle>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-800">
                  {THROUGH_OPTIONS.map((option) => (
                    <label key={option.value} className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="source"
                        checked={form.source === option.value}
                        onChange={() => setForm({ ...form, source: option.value })}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
              <Field label="Res. Address">
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Location">
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Reporting">
                  <input
                    value={form.reporting}
                    onChange={(e) => setForm({ ...form, reporting: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Mobile">
                  <input
                    value={form.reporting_mobile}
                    onChange={(e) => setForm({ ...form, reporting_mobile: e.target.value })}
                    className={inputClass}
                    placeholder="Reporting mobile"
                  />
                </Field>
              </div>
              <Field label="Priority">
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className={inputClass}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </Field>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-6 border-t border-gray-200 pt-5 lg:grid-cols-3">
            <StudentBlock
              label="Student-1"
              student={form.student1}
              onChange={(patch) => patchStudent('student1', patch)}
              classes={classes}
              required
            />
            <StudentBlock
              label="Student-2"
              student={form.student2}
              onChange={(patch) => patchStudent('student2', patch)}
              classes={classes}
            />
            <StudentBlock
              label="Student-3"
              student={form.student3}
              onChange={(patch) => patchStudent('student3', patch)}
              classes={classes}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 border-t border-gray-200 pt-5 lg:grid-cols-3">
            <div>
              <SectionTitle>Sibling-1</SectionTitle>
              <div className="space-y-2">
                <Field label="Name">
                  <input
                    value={form.sibling1.name}
                    onChange={(e) =>
                      setForm({ ...form, sibling1: { ...form.sibling1, name: e.target.value } })
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Class">
                  <input
                    value={form.sibling1.class_name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sibling1: { ...form.sibling1, class_name: e.target.value },
                      })
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="School">
                  <input
                    value={form.sibling1.school}
                    onChange={(e) =>
                      setForm({ ...form, sibling1: { ...form.sibling1, school: e.target.value } })
                    }
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
            <div>
              <SectionTitle>Sibling-2</SectionTitle>
              <div className="space-y-2">
                <Field label="Name">
                  <input
                    value={form.sibling2.name}
                    onChange={(e) =>
                      setForm({ ...form, sibling2: { ...form.sibling2, name: e.target.value } })
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Class">
                  <input
                    value={form.sibling2.class_name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sibling2: { ...form.sibling2, class_name: e.target.value },
                      })
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="School">
                  <input
                    value={form.sibling2.school}
                    onChange={(e) =>
                      setForm({ ...form, sibling2: { ...form.sibling2, school: e.target.value } })
                    }
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
            <div>
              <SectionTitle>Remarks</SectionTitle>
              <textarea
                rows={6}
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                className={inputClass}
                placeholder="Notes from the inquiry conversation..."
              />
            </div>
          </div>
        </form>
      </AppModalShell>
    </AppModal>
  );
}
