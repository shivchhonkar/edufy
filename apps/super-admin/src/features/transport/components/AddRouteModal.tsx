'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { FiX, FiPlus, FiTrash2 } from 'react-icons/fi';
import { Route } from '@/shared/types';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';

interface AddRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingRoute?: Route | null;
}

interface Stop {
  id?: number;
  stop_name: string;
  stop_order: number;
  arrival_time: string;
  pickup_fee: string;
}

export default function AddRouteModal({ isOpen, onClose, onSuccess, editingRoute }: AddRouteModalProps) {
  // Get sidebar collapsed state from localStorage
  const sidebarCollapsed = useMemo(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    }
    return false;
  }, [isOpen]);

  const modalContentRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    route_name: '',
    route_number: '',
    starting_point: '',
    ending_point: '',
    total_distance: '',
    estimated_time: '',
    monthly_fee: '',
    status: 'active' as 'active' | 'inactive',
  });

  const [stops, setStops] = useState<Stop[]>([
    { stop_name: '', stop_order: 1, arrival_time: '', pickup_fee: '' }
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [initialFormData, setInitialFormData] = useState(formData);
  const [initialStops, setInitialStops] = useState(stops);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (editingRoute) {
      const data = {
        route_name: editingRoute.route_name || '',
        route_number: editingRoute.route_number || '',
        starting_point: editingRoute.starting_point || '',
        ending_point: editingRoute.ending_point || '',
        total_distance: editingRoute.total_distance ? editingRoute.total_distance.toString() : '',
        estimated_time: editingRoute.estimated_time ? editingRoute.estimated_time.toString() : '',
        monthly_fee: (editingRoute as { monthly_fee?: number }).monthly_fee ? String((editingRoute as { monthly_fee?: number }).monthly_fee) : '',
        status: editingRoute.status || 'active',
      };
      setFormData(data);
      setInitialFormData(data);

      // Format stops - convert TIME format (HH:MM:SS) to HTML time input format (HH:MM)
      const routeStops = ((editingRoute as any).stops || []).map((stop: any) => ({
        id: stop.id, // Preserve stop ID for updates
        stop_name: stop.stop_name || '',
        stop_order: stop.stop_order || 1,
        arrival_time: stop.arrival_time ? stop.arrival_time.substring(0, 5) : '', // HH:MM:SS -> HH:MM
        pickup_fee: stop.pickup_fee ? stop.pickup_fee.toString() : '',
      }));

      // If no stops exist, add a default one
      const stopsToSet = routeStops.length > 0 ? routeStops : [{ stop_name: '', stop_order: 1, arrival_time: '', pickup_fee: '' }];
      setStops(stopsToSet);
      setInitialStops(stopsToSet);
    } else {
      const data = {
        route_name: '',
        route_number: '',
        starting_point: '',
        ending_point: '',
        total_distance: '',
        estimated_time: '',
        monthly_fee: '',
        status: 'active' as 'active' | 'inactive',
      };
      setFormData(data);
      setInitialFormData(data);

      const defaultStops = [{ stop_name: '', stop_order: 1, arrival_time: '', pickup_fee: '' }];
      setStops(defaultStops);
      setInitialStops(defaultStops);
    }
    setError('');
  }, [editingRoute, isOpen]);

  const hasUnsavedChanges = 
    JSON.stringify(formData) !== JSON.stringify(initialFormData) ||
    JSON.stringify(stops) !== JSON.stringify(initialStops);

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

  const addStop = () => {
    setStops([...stops, { stop_name: '', stop_order: stops.length + 1, arrival_time: '', pickup_fee: '' }]);
  };

  const removeStop = (index: number) => {
    if (stops.length > 1) {
      setStops(stops.filter((_, i) => i !== index));
    }
  };

  const updateStop = (index: number, field: keyof Stop, value: string | number) => {
    const updated = [...stops];
    updated[index] = { ...updated[index], [field]: value };
    setStops(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.route_name) {
      setError('Route name is required');
      return;
    }

    setSubmitting(true);

    try {
      const url = editingRoute ? `/api/transport/routes/${editingRoute.id}` : '/api/transport/routes';
      const method = editingRoute ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          total_distance: formData.total_distance ? parseFloat(formData.total_distance) : null,
          estimated_time: formData.estimated_time ? parseInt(formData.estimated_time) : null,
          monthly_fee: formData.monthly_fee ? parseFloat(formData.monthly_fee) : null,
          stops: stops.filter(s => s.stop_name.trim() !== '').map(s => ({
            ...s,
            pickup_fee: s.pickup_fee ? parseFloat(s.pickup_fee) : null,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
        onClose();
      } else {
        setError(data.error || `Failed to ${editingRoute ? 'update' : 'add'} route`);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed top-0 bottom-0 right-0 bg-black bg-opacity-50 z-[60] transition-all duration-300 ${
      sidebarCollapsed ? 'left-16' : 'left-56'
    }`} style={{ width: sidebarCollapsed ? 'calc(100% - 64px)' : 'calc(100% - 224px)' }}>
      <div ref={modalContentRef} className="bg-white shadow-2xl w-full h-full overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-3 flex justify-between items-center z-10 shadow-sm">
          <h2 className="text-lg sm:text-xl text-gray-900">
            {editingRoute ? 'Edit Route' : 'Add New Route'}
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

          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Route Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Route Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.route_name}
                  onChange={(e) => setFormData({ ...formData, route_name: e.target.value })}
                  placeholder="e.g., Route A - North Zone"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Route Number
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.route_number}
                  onChange={(e) => setFormData({ ...formData, route_number: e.target.value })}
                  placeholder="e.g., R001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Starting Point
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.starting_point}
                  onChange={(e) => setFormData({ ...formData, starting_point: e.target.value })}
                  placeholder="e.g., School Campus"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ending Point
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.ending_point}
                  onChange={(e) => setFormData({ ...formData, ending_point: e.target.value })}
                  placeholder="e.g., City Center"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Distance (km)
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.total_distance}
                  onChange={(e) => setFormData({ ...formData, total_distance: e.target.value })}
                  placeholder="e.g., 15.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Time (minutes)
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.estimated_time}
                  onChange={(e) => setFormData({ ...formData, estimated_time: e.target.value })}
                  placeholder="e.g., 45"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Monthly Fee (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.monthly_fee}
                  onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                  placeholder="e.g., 1500"
                />
                <p className="text-xs text-gray-500 mt-1">Used when assigning students unless a stop fee is set</p>
              </div>

              {editingRoute && (
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

          {/* Route Stops */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Route Stops</h3>
              <button
                type="button"
                onClick={addStop}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-lg font-medium transition-colors"
              >
                <FiPlus size={16} />
                <span>Add Stop</span>
              </button>
            </div>

            {stops.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-500 mb-2">No stops added yet</p>
                <button
                  type="button"
                  onClick={addStop}
                  className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                >
                  + Add First Stop
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {stops.map((stop, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-start p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Stop Name {index === 0 && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        required={index === 0}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm text-gray-900 bg-white"
                        value={stop.stop_name}
                        onChange={(e) => updateStop(index, 'stop_name', e.target.value)}
                        placeholder="Enter stop location"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Order
                      </label>
                      <input
                        type="number"
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm text-gray-900 bg-white"
                        value={stop.stop_order}
                        onChange={(e) => updateStop(index, 'stop_order', parseInt(e.target.value) || index + 1)}
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Arrival Time
                      </label>
                      <input
                        type="time"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm text-gray-900 bg-white"
                        value={stop.arrival_time}
                        onChange={(e) => updateStop(index, 'arrival_time', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Fee (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm text-gray-900 bg-white"
                        value={stop.pickup_fee}
                        onChange={(e) => updateStop(index, 'pickup_fee', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="col-span-1 flex items-end pb-2">
                      <button
                        type="button"
                        onClick={() => removeStop(index)}
                        disabled={stops.length === 1}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title={stops.length === 1 ? "At least one stop is required" : "Remove stop"}
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-500 mt-2">
              {editingRoute 
                ? "You can add, edit, or remove stops. Changes will be saved when you update the route." 
                : "Add at least one stop for this route. You can reorder stops by changing the order number."}
            </p>
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
              {submitting ? (editingRoute ? 'Updating...' : 'Adding...') : (editingRoute ? 'Update Route' : 'Add Route')}
            </button>
          </div>
        </form>
      </div>

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
    </div>
  );
}

