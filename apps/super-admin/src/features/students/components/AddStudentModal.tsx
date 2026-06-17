'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { FiX, FiUploadCloud } from 'react-icons/fi';
import { Student } from '@/shared/types';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';

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

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS', 'Other'];

// Helper to format date for input type="date"
const formatDateForInput = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  const dateStr = typeof date === 'string' ? date : date.toISOString();
  return dateStr.split('T')[0];
};

export default function AddStudentModal({ isOpen, onClose, onSuccess, editingStudent }: AddStudentModalProps) {
  // Get sidebar collapsed state from localStorage
  const sidebarCollapsed = useMemo(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    }
    return false;
  }, [isOpen]);

  // Refs for form fields
  const modalContentRef = useRef<HTMLDivElement>(null);
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
    religion: '',
    caste: '',
    category: '',
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
        religion: editingStudent.religion || '',
        caste: editingStudent.caste || '',
        category: editingStudent.category || '',
        nationality: editingStudent.nationality || 'Indian',
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
        parent_phone: editingStudent.parent_phone || '',
        parent_email: editingStudent.parent_email || '',
        mother_name: editingStudent.mother_name || '',
        mother_phone: editingStudent.mother_phone || '',
        mother_email: editingStudent.mother_email || '',
        emergency_contact: editingStudent.emergency_contact || '',
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
        religion: '',
        caste: '',
        category: '',
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
      };
      setFormData(data);
      setInitialFormData(data);
      setPhotoPreview(null);
    }
    setError('');
    setFieldErrors({});
  }, [editingStudent, isOpen]);

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
    if (!formData.parent_phone) {
      errors.parent_phone = 'Parent phone number is required';
    } else if (!/^\d{10}$/.test(formData.parent_phone)) {
      errors.parent_phone = 'Phone number must be 10 digits';
    }
    if (formData.parent_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.parent_email)) {
      errors.parent_email = 'Invalid email format';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const scrollToField = (element: HTMLInputElement) => {
    if (!modalContentRef.current) return;

    const modalContent = modalContentRef.current;
    const elementTop = element.offsetTop;
    const modalHeight = modalContent.clientHeight;
    const elementHeight = element.offsetHeight;

    const targetScroll = elementTop - (modalHeight / 2) + (elementHeight / 2);

    modalContent.scrollTo({
      top: Math.max(0, targetScroll),
      behavior: 'smooth'
    });

    setTimeout(() => {
      element.focus();
    }, 300);
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

  if (!isOpen) return null;

  return (
    <div className={`fixed top-3 bottom-0 bg-black bg-opacity-50 z-[60] transition-all duration-300 ${
      sidebarCollapsed ? 'left-16' : 'left-56'
    }`} style={{ width: sidebarCollapsed ? 'calc(100vw - 80px)' : 'calc(100vw - 224px)', height: 'calc(100vh - 60px)' }}>
        <div ref={modalContentRef} className="bg-white shadow-2xl rounded-tl-xl w-full flex flex-col" style={{ height: 'calc(100vh - 20px)' }}>
        {/* Fixed Header */}
        <div className="px-4 py-2 sm:px-6 sm:py-3 border-b flex justify-between items-center bg-white z-10 flex-shrink-0">
          <h2 className="text-xl text-gray-900">
            {editingStudent ? 'Edit Student' : 'Add Student'}
          </h2>
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX size={28} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <form id="student-form" onSubmit={handleSubmit} className="p-4 sm:p-4 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Personal Information</h3>
            
            {/* Profile Photo Upload */}
            <div className="mb-4 flex items-center space-x-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex-shrink-0">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="h-28 w-28 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="h-28 w-28 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center border-4 border-white shadow-lg">
                      <svg className="h-14 w-14 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Student Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="block w-full text-sm text-gray-900 bg-white border border-gray-300 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
                <p className="mt-2 text-xs text-gray-500">
                  PNG, JPG, GIF up to 2MB. Recommended size: 400x400px
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  ref={firstNameRef}
                  type="text"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white ${
                    fieldErrors.first_name ? 'border-red-500 shake' : 'border-gray-300'
                  }`}
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
                {fieldErrors.first_name && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.first_name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Middle Name
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.middle_name}
                  onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  ref={lastNameRef}
                  type="text"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white ${
                    fieldErrors.last_name ? 'border-red-500 shake' : 'border-gray-300'
                  }`}
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
                {fieldErrors.last_name && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.last_name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Code
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.student_code}
                  onChange={(e) => setFormData({ ...formData, student_code: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  ref={dateOfBirthRef}
                  type="date"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white ${
                    fieldErrors.date_of_birth ? 'border-red-500 shake' : 'border-gray-300'
                  }`}
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
                {fieldErrors.date_of_birth && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.date_of_birth}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Blood Group
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aadhaar No.
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.aadhaar_no}
                  onChange={(e) => setFormData({ ...formData, aadhaar_no: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Religion
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.religion}
                  onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Caste
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.caste}
                  onChange={(e) => setFormData({ ...formData, caste: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nationality
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mother Tongue
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.mother_tongue}
                  onChange={(e) => setFormData({ ...formData, mother_tongue: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks
                </label>
                <textarea
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Address Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address
                </label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter complete address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pincode
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Academic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {editingStudent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admission Number
                  </label>
                  <input
                    type="text"
                    readOnly
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                    value={editingStudent.admission_number}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admission Date <span className="text-red-500">*</span>
                </label>
                <input
                  ref={admissionDateRef}
                  type="date"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white ${
                    fieldErrors.admission_date ? 'border-red-500 shake' : 'border-gray-300'
                  }`}
                  value={formData.admission_date}
                  onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
                />
                {fieldErrors.admission_date && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.admission_date}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Section
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white disabled:bg-gray-50"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Roll Number
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.roll_number}
                  onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                  placeholder="e.g. 12"
                />
              </div>
              {editingStudent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
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
          </div>

          {/* Guardian Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Guardian Information</h3>
            <p className="text-xs text-gray-500 mb-4">
              Father and mother details are shown by default in the Guardians tab.
            </p>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-3">Father</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Father&apos;s Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                      value={formData.parent_name}
                      onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Father&apos;s Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={parentPhoneRef}
                      type="tel"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white ${
                        fieldErrors.parent_phone ? 'border-red-500 shake' : 'border-gray-300'
                      }`}
                      value={formData.parent_phone}
                      onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                    />
                    {fieldErrors.parent_phone && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.parent_phone}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Father&apos;s Email
                    </label>
                    <input
                      type="email"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white ${
                        fieldErrors.parent_email ? 'border-red-500 shake' : 'border-gray-300'
                      }`}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mother&apos;s Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                      value={formData.mother_name}
                      onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mother&apos;s Phone
                    </label>
                    <input
                      type="tel"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                      value={formData.mother_phone}
                      onChange={(e) => setFormData({ ...formData, mother_phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mother&apos;s Email
                    </label>
                    <input
                      type="email"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                      value={formData.mother_email}
                      onChange={(e) => setFormData({ ...formData, mother_email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Contact
                  </label>
                  <input
                    type="tel"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          </form>

          {/* Action Buttons - Scrollable */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 px-6 py-4 border-t border-gray-200 bg-white">
          <button
            type="button"
            onClick={handleCancel}
            className="w-full sm:w-auto px-6 py-2 border-2 border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="student-form"
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl"
          >
            {submitting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {editingStudent ? 'Updating Student...' : 'Adding Student...'}
              </span>
            ) : (
              editingStudent ? 'Update Student' : 'Add Student'
            )}
          </button>
          </div>
        </div>
      </div>

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
    </div>
  );
}

