'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useState, useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';

interface AssignVehicleToRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingAssignment?: any | null;
  preSelectedRoute?: any | null;
}

export default function AssignVehicleToRouteModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  editingAssignment,
  preSelectedRoute 
}: AssignVehicleToRouteModalProps) {

  const modalContentRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    route_id: '',
    vehicle_id: '',
    assigned_date: new Date().toISOString().split('T')[0],
    shift: 'both' as 'morning' | 'afternoon' | 'both',
    status: 'active' as 'active' | 'inactive',
  });

  const [routes, setRoutes] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [initialFormData, setInitialFormData] = useState(formData);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchRoutes();
      fetchVehicles();
    }
  }, [isOpen]);

  useEffect(() => {
    if (editingAssignment) {
      const data = {
        route_id: editingAssignment.route_id?.toString() || '',
        vehicle_id: editingAssignment.vehicle_id?.toString() || '',
        assigned_date: editingAssignment.assigned_date ? editingAssignment.assigned_date.split('T')[0] : '',
        shift: editingAssignment.shift || 'both',
        status: editingAssignment.status || 'active',
      };
      setFormData(data);
      setInitialFormData(data);
    } else if (preSelectedRoute) {
      const data = {
        route_id: preSelectedRoute.id.toString(),
        vehicle_id: '',
        assigned_date: new Date().toISOString().split('T')[0],
        shift: 'both' as 'morning' | 'afternoon' | 'both',
        status: 'active' as 'active' | 'inactive',
      };
      setFormData(data);
      setInitialFormData(data);
    } else {
      const data = {
        route_id: '',
        vehicle_id: '',
        assigned_date: new Date().toISOString().split('T')[0],
        shift: 'both' as 'morning' | 'afternoon' | 'both',
        status: 'active' as 'active' | 'inactive',
      };
      setFormData(data);
      setInitialFormData(data);
    }
    setError('');
  }, [editingAssignment, preSelectedRoute, isOpen]);

  const fetchRoutes = async () => {
    setLoadingRoutes(true);
    try {
      const response = await fetch('/api/transport/routes?status=active');
      const data = await response.json();
      if (data.success) {
        setRoutes(data.data);
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
    } finally {
      setLoadingRoutes(false);
    }
  };

  const fetchVehicles = async () => {
    setLoadingVehicles(true);
    try {
      const response = await fetch('/api/transport/vehicles?status=active');
      const data = await response.json();
      if (data.success) {
        setVehicles(data.data);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoadingVehicles(false);
    }
  };

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

    if (!formData.route_id || !formData.vehicle_id || !formData.assigned_date) {
      setError('Route, vehicle, and assigned date are required');
      return;
    }

    setSubmitting(true);

    try {
      const url = editingAssignment 
        ? `/api/transport/route-assignments/${editingAssignment.id}` 
        : '/api/transport/route-assignments';
      const method = editingAssignment ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route_id: parseInt(formData.route_id),
          vehicle_id: parseInt(formData.vehicle_id),
          assigned_date: formData.assigned_date,
          shift: formData.shift,
          status: formData.status,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
        onClose();
      } else {
        setError(data.error || 'Failed to save assignment');
      }
    } catch (error) {
      console.error('Error saving assignment:', error);
      setError('An error occurred while saving assignment');
    } finally {
      setSubmitting(false);
    }
  };

  // Get selected vehicle details
  const selectedVehicle = vehicles.find(v => v.id.toString() === formData.vehicle_id);

  return (
    <>
    <AppModal open={isOpen} onClose={onClose}>
      <div ref={modalContentRef} className="flex flex-col h-full w-full min-h-0 min-w-0 bg-white shadow-2xl overflow-hidden">
        <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-3 flex justify-between items-center z-10 shadow-sm">
          <h2 className="text-lg sm:text-xl text-gray-900">
            {editingAssignment ? 'Edit Vehicle Assignment' : 'Assign Vehicle to Route'}
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

          {/* Route Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Route Information</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Route <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  disabled={!!preSelectedRoute || !!editingAssignment}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={formData.route_id}
                  onChange={(e) => setFormData({ ...formData, route_id: e.target.value })}
                >
                  <option value="">-- Select Route --</option>
                  {loadingRoutes ? (
                    <option value="">Loading routes...</option>
                  ) : (
                    routes.map((route) => (
                      <option key={route.id} value={route.id}>
                        {route.route_name} {route.route_number ? `(${route.route_number})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Vehicle Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Vehicle Information</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Vehicle <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.vehicle_id}
                  onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                >
                  <option value="">-- Select Vehicle --</option>
                  {loadingVehicles ? (
                    <option value="">Loading vehicles...</option>
                  ) : (
                    vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicle_number} - {vehicle.vehicle_type} ({vehicle.capacity} seats)
                        {vehicle.driver_name && ` - Driver: ${vehicle.driver_name}`}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Show vehicle driver info if selected */}
              {selectedVehicle && selectedVehicle.driver_name && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-medium text-blue-800 mb-1">Driver Information</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-blue-700">Name:</span>
                      <span className="ml-2 text-gray-900">{selectedVehicle.driver_name}</span>
                    </div>
                    {selectedVehicle.driver_phone && (
                      <div>
                        <span className="text-blue-700">Phone:</span>
                        <span className="ml-2 text-gray-900">{selectedVehicle.driver_phone}</span>
                      </div>
                    )}
                    {selectedVehicle.driver_license && (
                      <div className="col-span-2">
                        <span className="text-blue-700">License:</span>
                        <span className="ml-2 text-gray-900 font-mono text-xs">{selectedVehicle.driver_license}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Assignment Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Assignment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.assigned_date}
                  onChange={(e) => setFormData({ ...formData, assigned_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shift
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.shift}
                  onChange={(e) => setFormData({ ...formData, shift: e.target.value as any })}
                >
                  <option value="morning">Morning Only</option>
                  <option value="afternoon">Afternoon Only</option>
                  <option value="both">Both (Full Day)</option>
                </select>
              </div>

              {editingAssignment && (
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
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}
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
              {submitting 
                ? (editingAssignment ? 'Updating...' : 'Assigning...') 
                : (editingAssignment ? 'Update Assignment' : 'Assign Vehicle')}
            </button>
          </div>
        </form>
      </div>
    </AppModal>

      {/* Confirmation Dialog for Unsaved Changes */}
      <ConfirmDialog
        isOpen={showCancelConfirm}
        title="Discard Changes?"
        message="You have unsaved changes. Are you sure you want to close this form? All changes will be lost."
        confirmText="Discard Changes"
        cancelText="Continue Editing"
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelConfirm(false)}
        type="warning"
      />
    </>
  );
}









