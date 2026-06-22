'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useState, useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';
import { Staff } from '@/shared/types';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingStaff?: Staff | null;
}

type StaffRecord = Staff & {
  department_id?: number | null;
  designation_id?: number | null;
  department_name?: string | null;
  designation_name?: string | null;
};

type StaffFormTab = 'profile' | 'address' | 'employment' | 'status';

const FORM_TABS: { id: StaffFormTab; label: string; editOnly?: boolean }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'address', label: 'Address' },
  { id: 'employment', label: 'Employment' },
  { id: 'status', label: 'Status', editOnly: true },
];

const TAB_FIELD_MAP: Record<StaffFormTab, string[]> = {
  profile: ['first_name', 'last_name', 'phone', 'email'],
  address: [],
  employment: ['date_of_joining'],
  status: [],
};

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  gender: 'Male' as 'Male' | 'Female' | 'Other',
  phone: '',
  email: '',
  emergency_contact: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  designation: '',
  last_designation: '',
  department: '',
  department_id: '',
  designation_id: '',
  qualification: '',
  experience_years: '',
  date_of_joining: new Date().toISOString().split('T')[0],
  employment_type: 'full_time' as 'full_time' | 'part_time' | 'contract' | 'temporary',
  salary: '',
  bank_account_number: '',
  bank_name: '',
  bank_ifsc: '',
  photo_url: '',
  status: 'active' as 'active' | 'inactive' | 'resigned' | 'terminated',
  notes: '',
  status_change_date: '',
};

function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return '';
  const dateStr = typeof date === 'string' ? date : date.toISOString();
  return dateStr.split('T')[0];
}

function buildFormDataFromStaff(staff: StaffRecord) {
  return {
    first_name: staff.first_name || '',
    last_name: staff.last_name || '',
    date_of_birth: formatDateForInput(staff.date_of_birth),
    gender: staff.gender || ('Male' as 'Male' | 'Female' | 'Other'),
    phone: staff.phone || '',
    email: staff.email || '',
    emergency_contact: staff.emergency_contact || '',
    address: staff.address || '',
    city: staff.city || '',
    state: staff.state || '',
    pincode: staff.pincode || '',
    designation: staff.designation || staff.designation_name || '',
    last_designation: staff.last_designation || '',
    department: staff.department || staff.department_name || '',
    department_id: String(staff.department_id || ''),
    designation_id: String(staff.designation_id || ''),
    qualification: staff.qualification || '',
    experience_years: staff.experience_years != null ? String(staff.experience_years) : '',
    date_of_joining: formatDateForInput(staff.date_of_joining) || new Date().toISOString().split('T')[0],
    employment_type:
      staff.employment_type || ('full_time' as 'full_time' | 'part_time' | 'contract' | 'temporary'),
    salary: staff.salary != null ? String(staff.salary) : '',
    bank_account_number: staff.bank_account_number || '',
    bank_name: staff.bank_name || '',
    bank_ifsc: staff.bank_ifsc || '',
    photo_url: staff.photo_url || '',
    status: staff.status || ('active' as 'active' | 'inactive' | 'resigned' | 'terminated'),
    notes: staff.notes || '',
    status_change_date: formatDateForInput(staff.status_change_date) || '',
  };
}

export default function AddStaffModal({ isOpen, onClose, onSuccess, editingStaff }: AddStaffModalProps) {
  const modalContentRef = useRef<HTMLDivElement>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const dateOfJoiningRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({ ...EMPTY_FORM, date_of_joining: new Date().toISOString().split('T')[0] });

  const [initialFormData, setInitialFormData] = useState(formData);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [designations, setDesignations] = useState<
    { id: number; name: string; department_id: number | null }[]
  >([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [activeTab, setActiveTab] = useState<StaffFormTab>('profile');

  useEffect(() => {
    if (isOpen) setActiveTab('profile');
  }, [isOpen, editingStaff?.id]);

  useEffect(() => {
    if (!isOpen) return;
    Promise.all([
      fetch('/api/departments?active_only=true').then((r) => r.json()),
      fetch('/api/designations?active_only=true').then((r) => r.json()),
    ])
      .then(([dData, desData]) => {
        if (dData.success) setDepartments(dData.data);
        if (desData.success) setDesignations(desData.data);
      })
      .catch(() => {});
  }, [isOpen]);

  // Populate form when adding or editing
  useEffect(() => {
    if (!isOpen) return;

    if (!editingStaff) {
      const data = {
        ...EMPTY_FORM,
        date_of_joining: new Date().toISOString().split('T')[0],
      };
      setFormData(data);
      setInitialFormData(data);
      setPhotoPreview(null);
      setError('');
      return;
    }

    let cancelled = false;
    setLoadingStaff(true);
    setError('');

    fetch(`/api/staff/${editingStaff.id}`)
      .then((res) => res.json())
      .then((result) => {
        if (cancelled) return;
        const staff = (result.success ? result.data : editingStaff) as StaffRecord;
        const data = buildFormDataFromStaff(staff);
        setFormData(data);
        setInitialFormData(data);
        setPhotoPreview(staff.photo_url || null);
      })
      .catch(() => {
        if (cancelled) return;
        const data = buildFormDataFromStaff(editingStaff as StaffRecord);
        setFormData(data);
        setInitialFormData(data);
        setPhotoPreview(editingStaff.photo_url || null);
      })
      .finally(() => {
        if (!cancelled) setLoadingStaff(false);
      });

    return () => {
      cancelled = true;
    };
  }, [editingStaff, isOpen]);

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
      if (file.size > 2 * 1024 * 1024) {
        setError('Photo size should be less than 2MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

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
    const errors: {[key: string]: string} = {};

    // Required field validations
    if (!formData.first_name.trim()) {
      errors.first_name = 'First name is required';
    }
    if (!formData.last_name.trim()) {
      errors.last_name = 'Last name is required';
    }
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(formData.phone.replace(/[\s-]/g, ''))) {
      errors.phone = 'Please enter a valid 10-digit phone number';
    }
    if (!formData.date_of_joining) {
      errors.date_of_joining = 'Date of joining is required';
    }

    // Email validation (if provided)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      const tabWithError = (Object.keys(TAB_FIELD_MAP) as StaffFormTab[]).find((tab) =>
        TAB_FIELD_MAP[tab].some((field) => errors[field]),
      );
      if (tabWithError) setActiveTab(tabWithError);
    }
    return Object.keys(errors).length === 0;
  };

  const scrollToField = (element: HTMLInputElement) => {
    if (!modalContentRef.current) return;

    const modalContent = modalContentRef.current;
    const elementTop = element.offsetTop;
    const modalScrollTop = modalContent.scrollTop;
    const modalHeight = modalContent.clientHeight;
    const elementHeight = element.offsetHeight;

    // Calculate target scroll position to center the element
    const targetScroll = elementTop - (modalHeight / 2) + (elementHeight / 2);

    // Smooth scroll to the element
    modalContent.scrollTo({
      top: Math.max(0, targetScroll),
      behavior: 'smooth'
    });

    // Focus the element after a short delay
    setTimeout(() => {
      element.focus();
    }, 300);
  };

  const focusFirstError = () => {
    // Focus on first error field in order of form layout
    if (fieldErrors.first_name && firstNameRef.current) {
      scrollToField(firstNameRef.current);
    } else if (fieldErrors.last_name && lastNameRef.current) {
      scrollToField(lastNameRef.current);
    } else if (fieldErrors.phone && phoneRef.current) {
      scrollToField(phoneRef.current);
    } else if (fieldErrors.email && emailRef.current) {
      scrollToField(emailRef.current);
    } else if (fieldErrors.date_of_joining && dateOfJoiningRef.current) {
      scrollToField(dateOfJoiningRef.current);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Validate form
    if (!validateForm()) {
      setError('Please fix the errors below');
      setTimeout(() => focusFirstError(), 100);
      return;
    }

    setSubmitting(true);

    try {
      const url = editingStaff ? `/api/staff/${editingStaff.id}` : '/api/staff';
      const method = editingStaff ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          department_id: formData.department_id ? parseInt(formData.department_id, 10) : null,
          designation_id: formData.designation_id ? parseInt(formData.designation_id, 10) : null,
          experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
          salary: formData.salary ? parseFloat(formData.salary) : null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
        onClose();
      } else {
        setError(data.error || `Failed to ${editingStaff ? 'update' : 'add'} staff member`);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <AppModal open={isOpen} onClose={onClose}>
      <div className={APP_MODAL_PANEL}>
          <div className="px-4 py-2 sm:px-6 sm:py-3 border-b flex justify-between items-center bg-white z-10 flex-shrink-0 sticky top-0 z-10 shrink-0">
            <h2 className="text-xl text-gray-900">
              {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
            </h2>
            <button
              type="button"
              onClick={handleCancel}
              className="text-gray-500 hover:text-gray-700 p-2"
              title="Close"
            >
              <FiX size={28} />
            </button>
          </div>

          {loadingStaff ? (
            <div className="flex-1 flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
            </div>
          ) : (
            <>
          <div className="px-4 sm:px-6 bg-white border-b flex-shrink-0 sticky top-0 z-10 shrink-0">
            <nav className="flex gap-4 sm:gap-6 -mb-px overflow-x-auto">
              {FORM_TABS.filter((tab) => !tab.editOnly || editingStaff).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 font-medium border-b-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div ref={modalContentRef} className="flex-1 overflow-y-auto min-h-0">
          <form id="staff-form" onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-4">
                {editingStaff && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-medium text-gray-500">Employee ID</p>
                    <p className="text-sm font-semibold text-gray-900">{editingStaff.employee_id}</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-start gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
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
                  <div className="flex-1 min-w-0">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Profile Photo</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="block w-full text-sm text-gray-900 bg-white border border-gray-300 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                    />
                    <p className="mt-2 text-xs text-gray-500">PNG, JPG, GIF up to 2MB. Recommended size: 400×400px</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={firstNameRef}
                      type="text"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white ${
                        fieldErrors.first_name ? 'border-red-500' : 'border-gray-300'
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
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={lastNameRef}
                      type="text"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white ${
                        fieldErrors.last_name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    />
                    {fieldErrors.last_name && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.last_name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                    <input
                      type="date"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as typeof formData.gender })}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={phoneRef}
                      type="tel"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white ${
                        fieldErrors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                    {fieldErrors.phone && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      ref={emailRef}
                      type="email"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white ${
                        fieldErrors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    {fieldErrors.email && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact</label>
                    <input
                      type="tel"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                      value={formData.emergency_contact}
                      onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                      placeholder="Alternate phone number"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'address' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter complete address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    placeholder="e.g. 110001"
                  />
                </div>
              </div>
            )}

            {activeTab === 'employment' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Department & Designation</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                      <select
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                        value={formData.department_id}
                        onChange={(e) => {
                          const dept = departments.find((d) => String(d.id) === e.target.value);
                          const nextDepartmentId = e.target.value;
                          const designationStillValid =
                            !formData.designation_id ||
                            designations.some(
                              (d) =>
                                String(d.id) === formData.designation_id &&
                                (!nextDepartmentId ||
                                  String(d.department_id) === nextDepartmentId ||
                                  !d.department_id),
                            );
                          const matchedDesignation = designationStillValid
                            ? designations.find((d) => String(d.id) === formData.designation_id)
                            : null;

                          setFormData({
                            ...formData,
                            department_id: nextDepartmentId,
                            department: dept?.name || '',
                            designation_id: matchedDesignation ? String(matchedDesignation.id) : '',
                            designation: matchedDesignation?.name || '',
                          });
                        }}
                      >
                        <option value="">Select department</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                      <select
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                        value={formData.designation_id}
                        onChange={(e) => {
                          const des = designations.find((d) => String(d.id) === e.target.value);
                          setFormData({
                            ...formData,
                            designation_id: e.target.value,
                            designation: des?.name || '',
                          });
                        }}
                      >
                        <option value="">Select designation</option>
                        {designations
                          .filter(
                            (d) =>
                              !formData.department_id ||
                              String(d.department_id) === formData.department_id ||
                              !d.department_id,
                          )
                          .map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Previous Designation</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                        value={formData.last_designation}
                        onChange={(e) => setFormData({ ...formData, last_designation: e.target.value })}
                        placeholder="e.g. Assistant Teacher, Vice Principal"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Job Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Qualification</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                        value={formData.qualification}
                        onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                        placeholder="e.g. B.Ed, M.A."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Experience (Years)</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                        value={formData.experience_years}
                        onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date of Joining <span className="text-red-500">*</span>
                      </label>
                      <input
                        ref={dateOfJoiningRef}
                        type="date"
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white ${
                          fieldErrors.date_of_joining ? 'border-red-500' : 'border-gray-300'
                        }`}
                        value={formData.date_of_joining}
                        onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
                      />
                      {fieldErrors.date_of_joining && (
                        <p className="mt-1 text-sm text-red-600">{fieldErrors.date_of_joining}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Employment Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                        value={formData.employment_type}
                        onChange={(e) =>
                          setFormData({ ...formData, employment_type: e.target.value as typeof formData.employment_type })
                        }
                      >
                        <option value="full_time">Full Time</option>
                        <option value="part_time">Part Time</option>
                        <option value="contract">Contract</option>
                        <option value="temporary">Temporary</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Salary (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                        value={formData.salary}
                        onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                        placeholder="Monthly salary"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Bank Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white font-mono"
                        value={formData.bank_account_number}
                        onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                        value={formData.bank_name}
                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white font-mono uppercase"
                        value={formData.bank_ifsc}
                        onChange={(e) => setFormData({ ...formData, bank_ifsc: e.target.value.toUpperCase() })}
                        placeholder="e.g. SBIN0001234"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'status' && editingStaff && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as typeof formData.status })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="resigned">Resigned</option>
                    <option value="terminated">Terminated</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Change status to manage this staff member&apos;s account</p>
                </div>
                {(formData.status === 'inactive' ||
                  formData.status === 'resigned' ||
                  formData.status === 'terminated') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status Change Date</label>
                    <input
                      type="date"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                      value={formData.status_change_date || new Date().toISOString().split('T')[0]}
                      onChange={(e) => setFormData({ ...formData, status_change_date: e.target.value })}
                    />
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes / Reason</label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Resignation reason, termination details, or other internal notes"
                  />
                </div>
              </div>
            )}
          </form>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 px-4 sm:px-6 py-4 border-t border-gray-200 bg-white flex-shrink-0">
              <button
                type="button"
                onClick={handleCancel}
                className="w-full sm:w-auto px-6 py-2 border-2 border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="staff-form"
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl"
              >
                {submitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {editingStaff ? 'Updating Staff Member...' : 'Adding Staff Member...'}
                  </span>
                ) : (
                  editingStaff ? 'Update Staff Member' : 'Add Staff Member'
                )}
              </button>
            </div>
            </>
          )}
      </div>
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

