'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useState, useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';
import { Vehicle } from '@/shared/types';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingVehicle?: Vehicle | null;
}

const formatDateForInput = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  const dateStr = typeof date === 'string' ? date : date.toISOString();
  return dateStr.split('T')[0];
};

export default function AddVehicleModal({ isOpen, onClose, onSuccess, editingVehicle }: AddVehicleModalProps) {
  // Get sidebar collapsed state from localStorage

  const modalContentRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    vehicle_number: '',
    vehicle_type: 'bus' as 'bus' | 'van' | 'car',
    model: '',
    capacity: '',
    registration_date: '',
    insurance_expiry: '',
    pollution_certificate_expiry: '',
    fitness_certificate_expiry: '',
    owner_name: '',
    owner_phone: '',
    driver_name: '',
    driver_phone: '',
    driver_license: '',
    status: 'active' as 'active' | 'maintenance' | 'inactive',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [initialFormData, setInitialFormData] = useState(formData);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [driverIsOwner, setDriverIsOwner] = useState(false);

  useEffect(() => {
    if (editingVehicle) {
      const data = {
        vehicle_number: editingVehicle.vehicle_number || '',
        vehicle_type: editingVehicle.vehicle_type as any || 'bus',
        model: editingVehicle.model || '',
        capacity: editingVehicle.capacity ? editingVehicle.capacity.toString() : '',
        registration_date: formatDateForInput(editingVehicle.registration_date),
        insurance_expiry: formatDateForInput(editingVehicle.insurance_expiry),
        pollution_certificate_expiry: formatDateForInput(editingVehicle.pollution_certificate_expiry),
        fitness_certificate_expiry: formatDateForInput(editingVehicle.fitness_certificate_expiry),
        owner_name: editingVehicle.owner_name || '',
        owner_phone: editingVehicle.owner_phone || '',
        driver_name: editingVehicle.driver_name || '',
        driver_phone: editingVehicle.driver_phone || '',
        driver_license: editingVehicle.driver_license || '',
        status: editingVehicle.status || 'active',
      };
      setFormData(data);
      setInitialFormData(data);
    } else {
      const data = {
        vehicle_number: '',
        vehicle_type: 'bus' as 'bus' | 'van' | 'car',
        model: '',
        capacity: '',
        registration_date: '',
        insurance_expiry: '',
        pollution_certificate_expiry: '',
        fitness_certificate_expiry: '',
        owner_name: '',
        owner_phone: '',
        driver_name: '',
        driver_phone: '',
        driver_license: '',
        status: 'active' as 'active' | 'maintenance' | 'inactive',
      };
      setFormData(data);
      setInitialFormData(data);
    }
    setError('');
    setDriverIsOwner(false);
  }, [editingVehicle, isOpen]);

  // Handle driver is owner checkbox
  const handleDriverIsOwnerChange = (checked: boolean) => {
    setDriverIsOwner(checked);
    if (checked) {
      // Copy owner data to driver fields
      setFormData({
        ...formData,
        driver_name: formData.owner_name,
        driver_phone: formData.owner_phone,
      });
    } else {
      // Clear driver fields when unchecked
      setFormData({
        ...formData,
        driver_name: '',
        driver_phone: '',
        driver_license: '',
      });
    }
  };

  // Auto-update driver fields when owner fields change and driverIsOwner is checked
  useEffect(() => {
    if (driverIsOwner) {
      setFormData(prev => ({
        ...prev,
        driver_name: prev.owner_name,
        driver_phone: prev.owner_phone,
      }));
    }
  }, [formData.owner_name, formData.owner_phone, driverIsOwner]);

  const hasUnsavedChanges = JSON.stringify(formData) !== JSON.stringify(initialFormData);

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowCancelConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelConfirm(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.vehicle_number || !formData.capacity) {
      setError('Vehicle number and capacity are required');
      return;
    }

    setSubmitting(true);

    try {
      const url = editingVehicle ? `/api/transport/vehicles/${editingVehicle.id}` : '/api/transport/vehicles';
      const method = editingVehicle ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_number: formData.vehicle_number,
          vehicle_type: formData.vehicle_type,
          model: formData.model || null,
          capacity: parseInt(formData.capacity),
          registration_date: formData.registration_date || null,
          insurance_expiry: formData.insurance_expiry || null,
          pollution_certificate_expiry: formData.pollution_certificate_expiry || null,
          fitness_certificate_expiry: formData.fitness_certificate_expiry || null,
          owner_name: formData.owner_name || null,
          owner_phone: formData.owner_phone || null,
          driver_name: formData.driver_name || null,
          driver_phone: formData.driver_phone || null,
          driver_license: formData.driver_license || null,
          status: formData.status,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
        onClose();
      } else {
        setError(data.error || `Failed to ${editingVehicle ? 'update' : 'add'} vehicle`);
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
      <div ref={modalContentRef} className="flex flex-col h-full w-full min-h-0 min-w-0 bg-white shadow-2xl overflow-hidden">
        <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-3 flex justify-between items-center z-10 shadow-sm">
          <h2 className="text-lg sm:text-xl text-gray-900">
            {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
          </h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            type="button"
          >
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Vehicle Information Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Vehicle Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                value={formData.vehicle_number}
                onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                placeholder="e.g., UP16-AB-1234"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle Type
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                value={formData.vehicle_type}
                onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value as any })}
              >
                <option value="bus">Bus</option>
                <option value="van">Van</option>
                <option value="car">Car</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="e.g., Tata Starbus"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Capacity (Seats) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                placeholder="e.g., 40"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Registration Date
              </label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                value={formData.registration_date}
                onChange={(e) => setFormData({ ...formData, registration_date: e.target.value })}
              />
            </div>

            {editingVehicle && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Under Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            )}
            </div>
          </div>

          {/* Owner & Driver Information Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Owner & Driver Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Owner Name
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.owner_name}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  placeholder="Enter owner name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Owner Phone
                </label>
                <input
                  type="tel"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.owner_phone}
                  onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
                  placeholder="10 digit number"
                />
              </div>

              {/* Driver is Owner Checkbox */}
              <div className="md:col-span-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={driverIsOwner}
                    onChange={(e) => handleDriverIsOwnerChange(e.target.checked)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Driver is the Owner (same person)
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Check this if the owner drives the vehicle
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driver Name
                </label>
                <input
                  type="text"
                  disabled={driverIsOwner}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={formData.driver_name}
                  onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                  placeholder={driverIsOwner ? "Same as owner" : "Enter driver name"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driver Phone
                </label>
                <input
                  type="tel"
                  disabled={driverIsOwner}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={formData.driver_phone}
                  onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value })}
                  placeholder={driverIsOwner ? "Same as owner" : "10 digit number"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driver License Number
                </label>
                <input
                  type="text"
                  disabled={driverIsOwner}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={formData.driver_license}
                  onChange={(e) => setFormData({ ...formData, driver_license: e.target.value })}
                  placeholder={driverIsOwner ? "Optional - owner's license" : "Enter license number"}
                />
              </div>
            </div>
          </div>

          {/* Compliance & Certificates Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Compliance & Certificates</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Insurance Expiry
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.insurance_expiry}
                  onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pollution Certificate Expiry
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.pollution_certificate_expiry}
                  onChange={(e) => setFormData({ ...formData, pollution_certificate_expiry: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fitness Certificate Expiry
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.fitness_certificate_expiry}
                  onChange={(e) => setFormData({ ...formData, fitness_certificate_expiry: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="sticky bottom-0 bg-white border-t pt-4 pb-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (editingVehicle ? 'Updating...' : 'Adding...') : (editingVehicle ? 'Update Vehicle' : 'Add Vehicle')}
            </button>
          </div>
        </form>
      </div>
    </AppModal>

      {/* Confirmation Dialog for Unsaved Changes */}
      <ConfirmDialog
        isOpen={showCancelConfirm}
        title="Discard Changes?"
        message={`You have unsaved changes. Are you sure you want to close this form? All changes will be lost.`}
        confirmText="Discard Changes"
        cancelText="Continue Editing"
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelConfirm(false)}
        type="warning"
      />
    </>
  );
}

