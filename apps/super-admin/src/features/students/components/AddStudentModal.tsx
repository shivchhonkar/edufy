'use client';

import AppModal, { AppModalShell } from '@/shared/components/common/AppModal';
import { useState, useEffect, useRef, type ReactNode, type ComponentType } from 'react';
import { FiBook, FiCamera, FiMapPin, FiUser, FiUsers, FiX } from 'react-icons/fi';
import { Student } from '@/shared/types';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';
import { INDIAN_STATES, isIndianState } from '@/shared/constants/indian-states';
import { BLOOD_GROUPS } from '@/shared/constants/student-personal';
import { useAdmissionNumberFormat } from '@/shared/context/AdmissionNumberFormatContext';
import { useStudentLookups } from '@/features/students/hooks/useStudentLookups';
import { DEFAULT_STUDENT_LOOKUP_SETTINGS, withCurrentLookupValue } from '@/lib/student-lookup-settings';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingStudent?: Student | null;
}

interface ClassOption {
  id: number;
  name: string;
  academic_year?: string;
}

interface SectionOption {
  id: number;
  class_id: number;
  name: string;
}

// Helper to format date for input type="date"
const formatDateForInput = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  const dateStr = typeof date === 'string' ? date : date.toISOString();
  return dateStr.split('T')[0];
};

function sanitizePhoneInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

const inputClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500';

function Field({
  label,
  required,
  error,
  className = '',
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block font-medium text-gray-600">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </label>
  );
}

function FormSection({
  title,
  icon: Icon,
  hint,
  children,
}: {
  title: string;
  icon?: ComponentType<{ className?: string }>;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
        <h3 className="flex items-center text-sm font-semibold text-gray-700">
          {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
          {title}
        </h3>
      </div>
      <div className="space-y-4 p-4">
        {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
        {children}
      </div>
    </section>
  );
}

function validateIndianMobile(phone: string, required = false): string | undefined {
  const digits = sanitizePhoneInput(phone);
  if (!digits) {
    return required ? 'Phone number is required' : undefined;
  }
  if (digits.length !== 10) {
    return 'Phone number must be exactly 10 digits';
  }
  if (!/^[6-9]/.test(digits)) {
    return 'Phone number must start with 6, 7, 8, or 9';
  }
  return undefined;
}

export default function AddStudentModal({ isOpen, onClose, onSuccess, editingStudent }: AddStudentModalProps) {
  const formatAdmissionNumber = useAdmissionNumberFormat();
  const { lookups } = useStudentLookups(isOpen);

  // Refs for form fields
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const dateOfBirthRef = useRef<HTMLInputElement>(null);
  const admissionDateRef = useRef<HTMLInputElement>(null);
  const parentPhoneRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    student_code: '',
    date_of_birth: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    blood_group: '',
    aadhaar_no: '',
    religion: 'Hindu',
    caste: '',
    category: 'GEN',
    nationality: 'Indian',
    mother_tongue: '',
    remarks: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    admission_date: new Date().toISOString().split('T')[0],
    class_id: '',
    section_id: '',
    roll_number: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    mother_name: '',
    mother_phone: '',
    mother_email: '',
    emergency_contact: '',
    photo_url: '',
    status: 'active' as 'active' | 'inactive' | 'graduated' | 'transferred',
  });

  const [initialFormData, setInitialFormData] = useState(formData);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);

  const religionOptions = withCurrentLookupValue(lookups.religions.items, formData.religion);
  const casteTypeOptions = withCurrentLookupValue(lookups.caste_types.items, formData.category);
  const nationalityOptions = withCurrentLookupValue(lookups.nationalities.items, formData.nationality);

  useEffect(() => {
    if (!isOpen) return;

    setLoadingClasses(true);
    fetch('/api/classes')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          let loaded: ClassOption[] = data.data;
          if (
            editingStudent?.class_id &&
            !loaded.some((c) => c.id === editingStudent.class_id)
          ) {
            loaded = [
              ...loaded,
              {
                id: editingStudent.class_id,
                name: editingStudent.class_name || `Class #${editingStudent.class_id}`,
                academic_year: '',
              },
            ];
          }
          setClasses(loaded);
        } else {
          setError(data.error || 'Failed to load classes');
        }
      })
      .catch(() => setError('Failed to load classes'))
      .finally(() => setLoadingClasses(false));
  }, [isOpen, editingStudent?.class_id, editingStudent?.class_name]);

  useEffect(() => {
    if (!isOpen || !formData.class_id) {
      setSections([]);
      return;
    }

    setLoadingSections(true);
    fetch(`/api/sections?class_id=${formData.class_id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          let loaded: SectionOption[] = data.data;
          const currentSectionId = formData.section_id
            ? parseInt(formData.section_id, 10)
            : editingStudent?.section_id;
          if (
            currentSectionId &&
            !loaded.some((s) => s.id === currentSectionId)
          ) {
            loaded = [
              ...loaded,
              {
                id: currentSectionId,
                class_id: parseInt(formData.class_id, 10),
                name: editingStudent?.section_name || `Section #${currentSectionId}`,
              },
            ];
          }
          setSections(loaded);
        }
      })
      .catch(() => setSections([]))
      .finally(() => setLoadingSections(false));
  }, [isOpen, formData.class_id, formData.section_id]);

  // Populate form when editing
  useEffect(() => {
    if (editingStudent) {
      const data = {
        first_name: editingStudent.first_name || '',
        middle_name: editingStudent.middle_name || '',
        last_name: editingStudent.last_name || '',
        student_code: editingStudent.student_code || '',
        date_of_birth: formatDateForInput(editingStudent.date_of_birth),
        gender: editingStudent.gender || 'Male' as 'Male' | 'Female' | 'Other',
        blood_group: editingStudent.blood_group || '',
        aadhaar_no: editingStudent.aadhaar_no || '',
        religion: editingStudent.religion || lookups.religions.default_value,
        caste: editingStudent.caste || '',
        category: editingStudent.category || lookups.caste_types.default_value,
        nationality: editingStudent.nationality || lookups.nationalities.default_value,
        mother_tongue: editingStudent.mother_tongue || '',
        remarks: editingStudent.remarks || '',
        address: editingStudent.address || '',
        city: editingStudent.city || '',
        state: editingStudent.state || '',
        pincode: editingStudent.pincode || '',
        admission_date: formatDateForInput(editingStudent.admission_date),
        class_id: editingStudent.class_id ? editingStudent.class_id.toString() : '',
        section_id: editingStudent.section_id ? editingStudent.section_id.toString() : '',
        roll_number: editingStudent.roll_number || '',
        parent_name: editingStudent.parent_name || '',
        parent_phone: sanitizePhoneInput(editingStudent.parent_phone || ''),
        parent_email: editingStudent.parent_email || '',
        mother_name: editingStudent.mother_name || '',
        mother_phone: sanitizePhoneInput(editingStudent.mother_phone || ''),
        mother_email: editingStudent.mother_email || '',
        emergency_contact: sanitizePhoneInput(editingStudent.emergency_contact || ''),
        photo_url: editingStudent.photo_url || '',
        status: editingStudent.status || 'active' as 'active' | 'inactive' | 'graduated' | 'transferred',
      };
      setFormData(data);
      setInitialFormData(data);
      setPhotoPreview(editingStudent.photo_url || null);
    } else {
      // Reset form for new student
      const data = {
        first_name: '',
        middle_name: '',
        last_name: '',
        student_code: '',
        date_of_birth: '',
        gender: 'Male' as 'Male' | 'Female' | 'Other',
        blood_group: '',
        aadhaar_no: '',
        religion: lookups.religions.default_value,
        caste: '',
        category: lookups.caste_types.default_value,
        nationality: lookups.nationalities.default_value,
        mother_tongue: '',
        remarks: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        admission_date: new Date().toISOString().split('T')[0],
        class_id: '',
        section_id: '',
        roll_number: '',
        parent_name: '',
        parent_phone: '',
        parent_email: '',
        mother_name: '',
        mother_phone: '',
        mother_email: '',
        emergency_contact: '',
        photo_url: '',
        status: 'active' as 'active' | 'inactive' | 'graduated' | 'transferred',
      };
      setFormData(data);
      setInitialFormData(data);
      setPhotoPreview(null);
    }
    setError('');
    setFieldErrors({});
  }, [editingStudent, isOpen]);

  useEffect(() => {
    if (!isOpen || !editingStudent?.id) return;
    let cancelled = false;
    fetch(`/api/students/${editingStudent.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.success || !data.data) return;
        const student = data.data as Student;
        const next = {
          first_name: student.first_name || '',
          middle_name: student.middle_name || '',
          last_name: student.last_name || '',
          student_code: student.student_code || '',
          date_of_birth: formatDateForInput(student.date_of_birth),
          gender: student.gender || ('Male' as 'Male' | 'Female' | 'Other'),
          blood_group: student.blood_group || '',
          aadhaar_no: student.aadhaar_no || '',
          religion: student.religion || lookups.religions.default_value,
          caste: student.caste || '',
          category: student.category || lookups.caste_types.default_value,
          nationality: student.nationality || lookups.nationalities.default_value,
          mother_tongue: student.mother_tongue || '',
          remarks: student.remarks || '',
          address: student.address || '',
          city: student.city || '',
          state: student.state || '',
          pincode: student.pincode || '',
          admission_date: formatDateForInput(student.admission_date),
          class_id: student.class_id ? String(student.class_id) : '',
          section_id: student.section_id ? String(student.section_id) : '',
          roll_number: student.roll_number || '',
          parent_name: student.parent_name || '',
          parent_phone: sanitizePhoneInput(student.parent_phone || ''),
          parent_email: student.parent_email || '',
          mother_name: student.mother_name || '',
          mother_phone: sanitizePhoneInput(student.mother_phone || ''),
          mother_email: student.mother_email || '',
          emergency_contact: sanitizePhoneInput(student.emergency_contact || ''),
          photo_url: student.photo_url || '',
          status: student.status || ('active' as 'active' | 'inactive' | 'graduated' | 'transferred'),
        };
        setFormData(next);
        setInitialFormData(next);
        setPhotoPreview(student.photo_url || null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    editingStudent?.id,
    lookups.religions.default_value,
    lookups.caste_types.default_value,
    lookups.nationalities.default_value,
  ]);

  useEffect(() => {
    if (!isOpen || editingStudent) return;

    const applyDefaults = <T extends { religion: string; category: string; nationality: string }>(prev: T): T => {
      const religion = !prev.religion || prev.religion === DEFAULT_STUDENT_LOOKUP_SETTINGS.religions.default_value
        ? lookups.religions.default_value
        : prev.religion;
      const category = !prev.category || prev.category === DEFAULT_STUDENT_LOOKUP_SETTINGS.caste_types.default_value
        ? lookups.caste_types.default_value
        : prev.category;
      const nationality = !prev.nationality || prev.nationality === DEFAULT_STUDENT_LOOKUP_SETTINGS.nationalities.default_value
        ? lookups.nationalities.default_value
        : prev.nationality;
      if (religion === prev.religion && category === prev.category && nationality === prev.nationality) {
        return prev;
      }
      return { ...prev, religion, category, nationality };
    };

    setFormData(applyDefaults);
    setInitialFormData(applyDefaults);
  }, [
    isOpen,
    editingStudent,
    lookups.religions.default_value,
    lookups.caste_types.default_value,
    lookups.nationalities.default_value,
  ]);

  // Check if form has been modified
  const hasUnsavedChanges = () => {
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  };

  const handleCancel = () => {
    if (hasUnsavedChanges()) {
      setShowConfirmDialog(true);
    } else {
      onClose();
    }
  };

  const handleConfirmCancel = () => {
    setShowConfirmDialog(false);
    onClose();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('Photo size should be less than 2MB');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPhotoPreview(base64String);
        setFormData({ ...formData, photo_url: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.first_name) errors.first_name = 'First Name is required';
    if (!formData.last_name) errors.last_name = 'Last Name is required';
    if (!formData.date_of_birth) errors.date_of_birth = 'Date of Birth is required';
    if (!formData.admission_date) errors.admission_date = 'Admission Date is required';

    const parentPhoneError = validateIndianMobile(formData.parent_phone, true);
    if (parentPhoneError) errors.parent_phone = parentPhoneError;

    const motherPhoneError = validateIndianMobile(formData.mother_phone);
    if (motherPhoneError) errors.mother_phone = motherPhoneError;

    const emergencyPhoneError = validateIndianMobile(formData.emergency_contact);
    if (emergencyPhoneError) errors.emergency_contact = emergencyPhoneError;

    if (formData.parent_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.parent_email)) {
      errors.parent_email = 'Invalid email format';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const scrollToField = (element: HTMLInputElement) => {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => element.focus(), 300);
  };

  const focusFirstError = () => {
    if (fieldErrors.first_name && firstNameRef.current) {
      scrollToField(firstNameRef.current);
    } else if (fieldErrors.last_name && lastNameRef.current) {
      scrollToField(lastNameRef.current);
    } else if (fieldErrors.date_of_birth && dateOfBirthRef.current) {
      scrollToField(dateOfBirthRef.current);
    } else if (fieldErrors.admission_date && admissionDateRef.current) {
      scrollToField(admissionDateRef.current);
    } else if (fieldErrors.parent_phone && parentPhoneRef.current) {
      scrollToField(parentPhoneRef.current);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (!validateForm()) {
      setError('Please fix the errors below');
      setTimeout(() => focusFirstError(), 100);
      return;
    }

    setSubmitting(true);

    try {
      const url = editingStudent ? `/api/students/${editingStudent.id}` : '/api/students';
      const method = editingStudent ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          class_id: formData.class_id ? parseInt(formData.class_id) : null,
          section_id: formData.section_id ? parseInt(formData.section_id) : null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
        onClose();
      } else {
        setError(data.error || `Failed to ${editingStudent ? 'update' : 'add'} student`);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = (error?: string) =>
    `${inputClass} ${error ? 'border-red-500' : ''}`;

  return (
    <>
    <AppModal open={isOpen} onClose={handleCancel}>
      <AppModalShell
        header={
          <>
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                {editingStudent ? 'Edit Student' : 'Add Student'}
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Update personal, address, academic and guardian details.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close"
            >
              <FiX size={22} />
            </button>
          </>
        }
        footer={
          <>
            <button
              type="button"
              onClick={handleCancel}
              className="w-full rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="student-form"
              disabled={submitting}
              className="w-full rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {submitting
                ? editingStudent
                  ? 'Updating…'
                  : 'Adding…'
                : editingStudent
                  ? 'Update student'
                  : 'Add student'}
            </button>
          </>
        }
      >
          <form id="student-form" onSubmit={handleSubmit} className="space-y-4 bg-gray-50 p-4 sm:p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <FormSection title="Personal Information" icon={FiUser}>
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                {photoPreview ? (
                  <img src={photoPreview} alt="" className="h-16 w-16 rounded-full border-2 border-gray-200 object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-lg font-semibold text-white">
                    {(formData.first_name?.[0] || '') + (formData.last_name?.[0] || '') || '?'}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Student photo</p>
                <label className="mt-1 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-primary-700 hover:bg-primary-50">
                  <FiCamera size={14} />
                  Upload photo
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="sr-only" />
                </label>
                <p className="mt-1 text-xs text-gray-500">PNG, JPG or GIF up to 2MB</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  ref={firstNameRef}
                  type="text"
                  className={fieldClass(fieldErrors.first_name)}
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
                {fieldErrors.first_name && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.first_name}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Middle Name
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={formData.middle_name}
                  onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  ref={lastNameRef}
                  type="text"
                  className={fieldClass(fieldErrors.last_name)}
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
                {fieldErrors.last_name && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.last_name}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Student Code
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={formData.student_code}
                  onChange={(e) => setFormData({ ...formData, student_code: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  ref={dateOfBirthRef}
                  type="date"
                  className={fieldClass(fieldErrors.date_of_birth)}
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
                {fieldErrors.date_of_birth && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.date_of_birth}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Gender
                </label>
                <select
                  className={inputClass}
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Blood Group
                </label>
                <select
                  className={inputClass}
                  value={formData.blood_group}
                  onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                >
                  <option value="">Select blood group</option>
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Aadhaar No.
                </label>
                <input
                  type="text"
                  className={inputClass}
                  inputMode="numeric"
                  maxLength={12}
                  placeholder="12-digit Aadhaar"
                  value={formData.aadhaar_no}
                  onChange={(e) =>
                    setFormData({ ...formData, aadhaar_no: e.target.value.replace(/\D/g, '').slice(0, 12) })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Religion
                </label>
                <select
                  className={inputClass}
                  value={formData.religion}
                  onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                >
                  <option value="">Select religion</option>
                  {religionOptions.map((religion) => (
                    <option key={religion} value={religion}>{religion}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Caste
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={formData.caste}
                  onChange={(e) => setFormData({ ...formData, caste: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Caste Type
                </label>
                <select
                  className={inputClass}
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">Select caste type</option>
                  {casteTypeOptions.map((casteType) => (
                    <option key={casteType} value={casteType}>{casteType}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Nationality
                </label>
                <select
                  className={inputClass}
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                >
                  <option value="">Select nationality</option>
                  {nationalityOptions.map((nationality) => (
                    <option key={nationality} value={nationality}>{nationality}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Mother Tongue
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={formData.mother_tongue}
                  onChange={(e) => setFormData({ ...formData, mother_tongue: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Remarks
                </label>
                <textarea
                  rows={2}
                  className={inputClass}
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="Address Information" icon={FiMapPin}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <div className="md:col-span-2 lg:col-span-3">
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Street Address
                </label>
                <textarea
                  rows={3}
                  className={inputClass}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter complete address"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  City
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  State
                </label>
                <select
                  className={inputClass}
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                >
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((stateName) => (
                    <option key={stateName} value={stateName}>
                      {stateName}
                    </option>
                  ))}
                  {formData.state && !isIndianState(formData.state) && (
                    <option value={formData.state}>{formData.state}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Pincode
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="Current Academic" icon={FiBook}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {editingStudent && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600">
                    Admission Number
                  </label>
                  <input
                    type="text"
                    readOnly
                    className={`${inputClass} bg-gray-50 text-gray-600`}
                    value={formatAdmissionNumber(editingStudent.admission_number)}
                  />
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Admission Date <span className="text-red-500">*</span>
                </label>
                <input
                  ref={admissionDateRef}
                  type="date"
                  className={fieldClass(fieldErrors.admission_date)}
                  value={formData.admission_date}
                  onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
                />
                {fieldErrors.admission_date && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.admission_date}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Class
                </label>
                <select
                  className={inputClass}
                  value={formData.class_id}
                  onChange={(e) =>
                    setFormData({ ...formData, class_id: e.target.value, section_id: '' })
                  }
                  disabled={loadingClasses}
                >
                  <option value="">
                    {loadingClasses ? 'Loading classes...' : 'Select class'}
                  </option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                      {cls.academic_year ? ` (${cls.academic_year})` : ''}
                    </option>
                  ))}
                </select>
                {!loadingClasses && classes.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    No classes found. Add classes in School Setup or Settings.
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Section
                </label>
                <select
                  className={`${inputClass} disabled:bg-gray-50`}
                  value={formData.section_id}
                  onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                  disabled={!formData.class_id || loadingSections}
                >
                  <option value="">
                    {!formData.class_id
                      ? 'Select class first'
                      : loadingSections
                        ? 'Loading sections...'
                        : sections.length === 0
                          ? 'No sections for this class'
                          : 'Select section'}
                  </option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Roll Number
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={formData.roll_number}
                  onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                  placeholder="e.g. 12"
                />
              </div>
              {editingStudent && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600">
                    Status
                  </label>
                  <select
                    className={inputClass}
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as typeof formData.status })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="graduated">Graduated</option>
                    <option value="transferred">Transferred</option>
                  </select>
                </div>
              )}
            </div>
          </FormSection>

          <FormSection
            title="Father & Mother Contact"
            icon={FiUsers}
            hint="Father and mother details are also shown in the Guardians tab."
          >
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-3">Father</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-600">
                      Father&apos;s Name
                    </label>
                    <input
                      type="text"
                      className={inputClass}
                      value={formData.parent_name}
                      onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-600">
                      Father&apos;s Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={parentPhoneRef}
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      className={fieldClass(fieldErrors.parent_phone)}
                      value={formData.parent_phone}
                      onChange={(e) =>
                        setFormData({ ...formData, parent_phone: sanitizePhoneInput(e.target.value) })
                      }
                    />
                    {fieldErrors.parent_phone && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.parent_phone}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-600">
                      Father&apos;s Email
                    </label>
                    <input
                      type="email"
                      className={fieldClass(fieldErrors.parent_email)}
                      value={formData.parent_email}
                      onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
                    />
                    {fieldErrors.parent_email && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.parent_email}</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-3">Mother</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-600">
                      Mother&apos;s Name
                    </label>
                    <input
                      type="text"
                      className={inputClass}
                      value={formData.mother_name}
                      onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-600">
                      Mother&apos;s Phone
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      className={fieldClass(fieldErrors.mother_phone)}
                      value={formData.mother_phone}
                      onChange={(e) =>
                        setFormData({ ...formData, mother_phone: sanitizePhoneInput(e.target.value) })
                      }
                    />
                    {fieldErrors.mother_phone && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.mother_phone}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-600">
                      Mother&apos;s Email
                    </label>
                    <input
                      type="email"
                      className={inputClass}
                      value={formData.mother_email}
                      onChange={(e) => setFormData({ ...formData, mother_email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600">
                    Emergency Contact
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    className={fieldClass(fieldErrors.emergency_contact)}
                    value={formData.emergency_contact}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergency_contact: sanitizePhoneInput(e.target.value),
                      })
                    }
                  />
                  {fieldErrors.emergency_contact && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.emergency_contact}</p>
                  )}
                </div>
              </div>
            </div>
          </FormSection>

          </form>
      </AppModalShell>
    </AppModal>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to cancel? All your changes will be lost."
        confirmText="Yes, Discard Changes"
        cancelText="No, Keep Editing"
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowConfirmDialog(false)}
        type="warning"
      />
    </>
  );
}

