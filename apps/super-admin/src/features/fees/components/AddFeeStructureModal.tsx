'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useState, useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';
import { useSettings } from '@/shared/SettingsContext';

interface AddFeeStructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingFeeStructure?: any | null;
  feeStructures?: any[];
}

export default function AddFeeStructureModal({ isOpen, onClose, onSuccess, editingFeeStructure, feeStructures }: AddFeeStructureModalProps) {
  const { settings } = useSettings();
  
  // Get sidebar collapsed state from localStorage

  // Refs for form fields
  const modalContentRef = useRef<HTMLDivElement>(null);
  const feeTypeRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    class_id: '',
    class_ids: [] as string[],
    category_id: '',
    fee_type: '',
    amount: '',
    frequency: 'monthly',
    academic_year: settings.academic_year || new Date().getFullYear().toString(),
    description: '',
    late_fee_percentage: '2',
    late_fee_days: '7',
    is_active: true,
  });
  const [initialFormData, setInitialFormData] = useState(formData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchClasses();
      fetchCategories();
      
      if (editingFeeStructure) {
        // Populate form with existing data
        const data = {
          class_id: editingFeeStructure.class_id ? editingFeeStructure.class_id.toString() : '',
          class_ids: editingFeeStructure.class_id ? [editingFeeStructure.class_id.toString()] : [],
          category_id: editingFeeStructure.category_id ? editingFeeStructure.category_id.toString() : '',
          fee_type: editingFeeStructure.fee_type || '',
          amount: editingFeeStructure.amount ? editingFeeStructure.amount.toString() : '',
          frequency: editingFeeStructure.frequency || 'monthly',
          academic_year: editingFeeStructure.academic_year || settings.academic_year || new Date().getFullYear().toString(),
          description: editingFeeStructure.description || '',
          late_fee_percentage: editingFeeStructure.late_fee_percentage ? editingFeeStructure.late_fee_percentage.toString() : '2',
          late_fee_days: editingFeeStructure.late_fee_days ? editingFeeStructure.late_fee_days.toString() : '7',
          is_active: editingFeeStructure.is_active !== undefined ? editingFeeStructure.is_active : true,
        };
        setFormData(data);
        setInitialFormData(data);
      } else {
        // Reset form for new fee structure
        const data = {
          class_id: '',
          class_ids: [],
          category_id: '',
          fee_type: '',
          amount: '',
          frequency: 'monthly',
          academic_year: settings.academic_year || new Date().getFullYear().toString(),
          description: '',
          late_fee_percentage: '2',
          late_fee_days: '7',
          is_active: true,
        };
        setFormData(data);
        setInitialFormData(data);
      }
      
      setError('');
      setFieldErrors({});
    }
  }, [isOpen, editingFeeStructure]);

  // Check if form has changes
  const hasChanges = () => {
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  };

  const handleCancel = () => {
    if (hasChanges()) {
      setShowConfirmDialog(true);
    } else {
      onClose();
    }
  };

  const getTargetClassIds = (): (string | null)[] => {
    if (editingFeeStructure) {
      return [formData.class_id || null];
    }
    if (formData.class_ids.length > 0) {
      return formData.class_ids;
    }
    return [null];
  };

  const findDuplicateClasses = () => {
    if (!feeStructures || !formData.fee_type.trim() || !formData.academic_year || !formData.frequency) {
      return [] as string[];
    }
    const feeTypeLower = formData.fee_type.toLowerCase().trim();
    const targetIds = getTargetClassIds();
    const duplicates: string[] = [];

    for (const classId of targetIds) {
      const exists = feeStructures.find((fee: any) =>
        fee.fee_type.toLowerCase().trim() === feeTypeLower &&
        String(fee.class_id || '') === String(classId || '') &&
        fee.academic_year === formData.academic_year &&
        fee.frequency === formData.frequency
      );
      if (exists) {
        if (classId) {
          const cls = classes.find((c) => String(c.id) === String(classId));
          duplicates.push(cls?.name || `Class ${classId}`);
        } else {
          duplicates.push('All Classes');
        }
      }
    }
    return duplicates;
  };

  const checkForDuplicates = () => {
    if (!editingFeeStructure && feeStructures) {
      const duplicateClasses = findDuplicateClasses();
      if (duplicateClasses.length > 0) {
        setFieldErrors((prev) => ({
          ...prev,
          fee_type: `⚠️ A fee structure for "${formData.fee_type}" already exists for: ${duplicateClasses.join(', ')}. Please edit the existing one or use a different name.`,
        }));
      } else {
        setFieldErrors((prev) => {
          const newErrors = { ...prev };
          if (newErrors.fee_type?.includes('already exists')) {
            delete newErrors.fee_type;
          }
          return newErrors;
        });
      }
    }
  };

  useEffect(() => {
    checkForDuplicates();
  }, [formData.fee_type, formData.class_id, formData.class_ids, formData.academic_year, formData.frequency, editingFeeStructure, feeStructures, classes]);

  const toggleClassSelection = (classId: string) => {
    setFormData((prev) => {
      const selected = prev.class_ids.includes(classId)
        ? prev.class_ids.filter((id) => id !== classId)
        : [...prev.class_ids, classId];
      return { ...prev, class_ids: selected, class_id: '' };
    });
  };

  const selectAllClasses = () => {
    setFormData((prev) => ({
      ...prev,
      class_ids: classes.map((c) => String(c.id)),
      class_id: '',
    }));
  };

  const clearClassSelection = () => {
    setFormData((prev) => ({ ...prev, class_ids: [], class_id: '' }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.fee_type.trim()) {
      errors.fee_type = 'Fee type is required';
    }
    if (!formData.amount || parseFloat(formData.amount) < 0) {
      errors.amount = 'Valid amount is required (0 or greater)';
    }
    if (!formData.academic_year.trim()) {
      errors.academic_year = 'Academic year is required';
    }

    if (!editingFeeStructure) {
      const duplicateClasses = findDuplicateClasses();
      if (duplicateClasses.length > 0) {
        errors.fee_type = `⚠️ A fee structure for "${formData.fee_type}" already exists for: ${duplicateClasses.join(', ')}. Please edit the existing one or use a different name.`;
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes');
      const data = await response.json();
      if (data.success) {
        setClasses(data.data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/fees/categories?is_active=true');
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (!validateForm()) {
      setError('Please fix the errors below');
      setTimeout(() => {
        if (fieldErrors.fee_type && feeTypeRef.current) {
          feeTypeRef.current.focus();
        } else if (fieldErrors.amount && amountRef.current) {
          amountRef.current.focus();
        }
      }, 100);
      return;
    }

    setLoading(true);

    try {
      const url = editingFeeStructure 
        ? '/api/fees/structures' 
        : '/api/fees/structures';
      
      const method = editingFeeStructure ? 'PUT' : 'POST';
      
      // Ensure tuition fees are always active
      const isTuitionFee = formData.fee_type.toLowerCase().includes('tuition');
      
      const payload: Record<string, unknown> = {
        category_id: formData.category_id || null,
        fee_type: formData.fee_type,
        amount: parseFloat(formData.amount),
        frequency: formData.frequency,
        academic_year: formData.academic_year,
        description: formData.description,
        late_fee_percentage: parseFloat(formData.late_fee_percentage),
        late_fee_days: parseInt(formData.late_fee_days, 10),
        is_active: isTuitionFee ? true : formData.is_active,
      };

      if (editingFeeStructure) {
        payload.id = editingFeeStructure.id;
        payload.class_id = formData.class_id || null;
      } else if (formData.class_ids.length > 0) {
        payload.class_ids = formData.class_ids.map((id) => parseInt(id, 10));
      } else {
        payload.class_id = null;
      }

      console.log('Submitting fee structure:', { method, payload });
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('Fee structure response:', data);

      if (data.success) {
        console.log('Fee structure saved successfully:', data.data);
        onSuccess();
        onClose();
      } else {
        console.error('Fee structure save failed:', data.error);
        setError(data.error || `Failed to ${editingFeeStructure ? 'update' : 'create'} fee structure`);
      }
    } catch (error) {
      console.error(`Error ${editingFeeStructure ? 'updating' : 'creating'} fee structure:`, error);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppModal open={isOpen} onClose={onClose}>
      <div ref={modalContentRef} className={APP_MODAL_PANEL}>
          <div className="px-4 py-2 sm:px-6 sm:py-3 border-b flex justify-between items-center bg-white z-10 flex-shrink-0 sticky top-0 z-10 shrink-0">
            <h2 className="text-xl text-gray-900">
              {editingFeeStructure ? 'Edit Fee Structure' : 'Add Fee Structure'}
            </h2>
            <button
              onClick={handleCancel}
              className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiX size={28} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <form id="fee-structure-form" onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

            {/* Fee Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Fee Details</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                <div className={editingFeeStructure ? '' : 'lg:col-span-2 xl:col-span-3'}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {editingFeeStructure ? 'Class (Optional)' : 'Classes (Optional)'}
                  </label>
                  {editingFeeStructure ? (
                    <select
                      value={formData.class_id}
                      onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                    >
                      <option value="">All Classes</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="border border-gray-300 rounded-lg p-3 bg-white">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <p className="text-xs text-gray-500">
                          Select one or more classes. Leave all unchecked for a single fee applied to all classes.
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={selectAllClasses}
                            className="text-xs text-primary-600 hover:underline"
                          >
                            Select all
                          </button>
                          <button
                            type="button"
                            onClick={clearClassSelection}
                            className="text-xs text-gray-500 hover:underline"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                        {classes.map((cls) => (
                          <label
                            key={cls.id}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded border text-sm cursor-pointer transition-colors ${
                              formData.class_ids.includes(String(cls.id))
                                ? 'border-primary-500 bg-primary-50 text-primary-900'
                                : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={formData.class_ids.includes(String(cls.id))}
                              onChange={() => toggleClassSelection(String(cls.id))}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="truncate">{cls.name}</span>
                          </label>
                        ))}
                      </div>
                      {formData.class_ids.length > 0 && (
                        <p className="text-xs text-primary-700 mt-2">
                          {formData.class_ids.length} class(es) selected — one fee structure will be created for each.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fee Type <span className="text-red-500">*</span>
                    {fieldErrors.fee_type && fieldErrors.fee_type.includes('already exists') && (
                      <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                        Duplicate Detected
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      ref={feeTypeRef}
                      type="text"
                      value={formData.fee_type}
                      onChange={(e) => setFormData({ ...formData, fee_type: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white ${
                        fieldErrors.fee_type ? 'border-red-500 shake' : 'border-gray-300'
                      }`}
                      placeholder="e.g., Tuition Fee"
                    />
                    {fieldErrors.fee_type && fieldErrors.fee_type.includes('already exists') && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                          <span className="text-red-600 text-xs font-bold">!</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {fieldErrors.fee_type && (
                    <div className={`text-sm mt-1 p-2 rounded ${
                      fieldErrors.fee_type.includes('already exists') 
                        ? 'bg-red-50 text-red-700 border border-red-200' 
                        : 'text-red-500'
                    }`}>
                      {fieldErrors.fee_type}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={amountRef}
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white ${
                      fieldErrors.amount ? 'border-red-500 shake' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {fieldErrors.amount && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.amount}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="half_yearly">Half Yearly</option>
                    <option value="yearly">Yearly</option>
                    <option value="one_time">One Time</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Academic Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.academic_year}
                    onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white ${
                      fieldErrors.academic_year ? 'border-red-500 shake' : 'border-gray-300'
                    }`}
                    placeholder="2024-2025"
                  />
                  {fieldErrors.academic_year && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.academic_year}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Late Fee Configuration */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Late Fee Configuration</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Late Fee Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.late_fee_percentage}
                    onChange={(e) => setFormData({ ...formData, late_fee_percentage: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                    placeholder="2.00"
                  />
                  <p className="mt-1 text-xs text-gray-500">Percentage charged on overdue amount</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grace Period (Days)
                  </label>
                  <input
                    type="number"
                    value={formData.late_fee_days}
                    onChange={(e) => setFormData({ ...formData, late_fee_days: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                    placeholder="7"
                  />
                  <p className="mt-1 text-xs text-gray-500">Days after due date before late fee applies</p>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Information</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  placeholder="Optional description..."
                />
              </div>
            </div>

            {/* Fee Status */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Fee Status</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => {
                      const isTuitionFee = formData.fee_type.toLowerCase().includes('tuition');
                      if (!isTuitionFee) {
                        setFormData({ ...formData, is_active: e.target.checked });
                      }
                    }}
                    disabled={formData.fee_type.toLowerCase().includes('tuition')}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">
                      Enable this fee
                    </span>
                    <p className="text-xs text-gray-600 mt-1">
                      {formData.fee_type.toLowerCase().includes('tuition')
                        ? 'Tuition fees cannot be disabled and will always be active'
                        : 'Uncheck to disable this fee. Disabled fees will not be assigned to students'}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            </form>

            {/* Action Buttons - Scrollable */}
            <div className="flex justify-end gap-4 px-6 py-4 border-t border-gray-200 bg-white">
            <button
              type="button"
              onClick={handleCancel}
              className="px-8 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="fee-structure-form"
              disabled={loading || !!(fieldErrors.fee_type && fieldErrors.fee_type.includes('already exists'))}
              className={`px-8 py-3 text-white rounded-lg transition-colors font-medium ${
                fieldErrors.fee_type && fieldErrors.fee_type.includes('already exists')
                  ? 'bg-red-500 cursor-not-allowed opacity-50'
                  : 'bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {fieldErrors.fee_type && fieldErrors.fee_type.includes('already exists')
                ? 'Cannot Save - Duplicate Detected'
                : loading
                  ? (editingFeeStructure ? 'Updating...' : 'Creating...')
                  : (editingFeeStructure
                    ? 'Update Fee Structure'
                    : formData.class_ids.length > 1
                      ? `Create ${formData.class_ids.length} Fee Structures`
                      : 'Create Fee Structure')
              }
            </button>
            </div>
          </div>
        </div>
        </AppModal>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to close without saving?"
        onConfirm={() => {
          setShowConfirmDialog(false);
          onClose();
        }}
        onCancel={() => setShowConfirmDialog(false)}
      />
    </>
  );
}

