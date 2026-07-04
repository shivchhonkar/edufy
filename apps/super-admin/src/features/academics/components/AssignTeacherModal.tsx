'use client';

import AppModal, {
  APP_MODAL_BODY,
  APP_MODAL_FOOTER,
  APP_MODAL_HEADER,
  APP_MODAL_PANEL_STRUCTURED,
} from '@/shared/components/common/AppModal';
import { useMemo } from 'react';
import { FiX } from 'react-icons/fi';
import type {
  AcademicYearOption,
  ClassOption,
  ClassSubjectLink,
  SectionOption,
  StaffOption,
  SubjectOption,
} from '@/features/academics/types/academic-assignments';

const selectClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500';

export interface AssignTeacherForm {
  staff_id: string;
  class_id: string;
  section_id: string;
  subject_id: string;
  academic_year: string;
  is_class_teacher: boolean;
}

interface AssignTeacherModalProps {
  open: boolean;
  form: AssignTeacherForm;
  staff: StaffOption[];
  classes: ClassOption[];
  sections: SectionOption[];
  classSubjects: ClassSubjectLink[];
  subjects: SubjectOption[];
  academicYears: AcademicYearOption[];
  saving?: boolean;
  onClose: () => void;
  onChange: (form: AssignTeacherForm) => void;
  onSubmit: () => void;
}

export default function AssignTeacherModal({
  open,
  form,
  staff,
  classes,
  sections,
  classSubjects,
  subjects,
  academicYears,
  saving = false,
  onClose,
  onChange,
  onSubmit,
}: AssignTeacherModalProps) {
  const filteredSections = sections.filter((s) => String(s.class_id) === form.class_id);

  const filteredSubjects = useMemo(() => {
    if (!form.class_id) return [];

    const seen = new Set<number>();
    const forClass = classSubjects
      .filter((cs) => String(cs.class_id) === form.class_id)
      .filter((cs) => {
        const id = Number(cs.subject_id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((cs) => ({
        id: cs.subject_id,
        name: cs.subject_name,
        code: cs.subject_code,
      }));

    if (forClass.length > 0) return forClass;

    return subjects.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
    }));
  }, [classSubjects, subjects, form.class_id]);

  const canSubmit = Boolean(form.staff_id && form.class_id && form.academic_year);

  return (
    <AppModal open={open} onClose={onClose}>
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`${APP_MODAL_PANEL_STRUCTURED} relative z-10 w-full rounded-xl`}
          style={{ maxWidth: '32rem', height: 'auto', maxHeight: '90vh' }}
        >
          <div className={APP_MODAL_HEADER}>
            <h2 className="text-base font-semibold text-gray-900">Assign Teacher</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              aria-label="Close"
            >
              <FiX size={20} />
            </button>
          </div>

          <div className={`${APP_MODAL_BODY} px-4 sm:px-6 py-4 space-y-4`}>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Teacher <span className="text-red-500">*</span>
              </label>
              <select
                value={form.staff_id}
                onChange={(e) => onChange({ ...form, staff_id: e.target.value })}
                className={selectClass}
              >
                <option value="">Select teacher</option>
                {staff.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.first_name} {s.last_name}
                    {s.employee_id ? ` (${s.employee_id})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Class <span className="text-red-500">*</span>
              </label>
              <select
                value={form.class_id}
                onChange={(e) =>
                  onChange({ ...form, class_id: e.target.value, section_id: '', subject_id: '' })
                }
                className={selectClass}
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Section <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                value={form.section_id}
                onChange={(e) => onChange({ ...form, section_id: e.target.value })}
                className={selectClass}
                disabled={!form.class_id}
              >
                <option value="">All sections / no section</option>
                {filteredSections.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Subject <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                value={form.subject_id}
                onChange={(e) => onChange({ ...form, subject_id: e.target.value })}
                className={selectClass}
                disabled={!form.class_id}
              >
                <option value="">
                  {!form.class_id
                    ? 'Select class first'
                    : filteredSubjects.length === 0
                      ? 'No subjects for this class'
                      : 'No specific subject'}
                </option>
                {filteredSubjects.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}
                    {s.code ? ` (${s.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Academic Year <span className="text-red-500">*</span>
              </label>
              <select
                value={form.academic_year}
                onChange={(e) => onChange({ ...form, academic_year: e.target.value })}
                className={selectClass}
              >
                <option value="">Select academic year</option>
                {academicYears.map((y) => (
                  <option key={y.name} value={y.name}>
                    {y.name}
                    {y.is_active ? ' (Active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_class_teacher}
                onChange={(e) => onChange({ ...form, is_class_teacher: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Mark as class teacher
            </label>
          </div>

          <div className={APP_MODAL_FOOTER}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit || saving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Assign'}
            </button>
          </div>
        </div>
      </div>
    </AppModal>
  );
}
