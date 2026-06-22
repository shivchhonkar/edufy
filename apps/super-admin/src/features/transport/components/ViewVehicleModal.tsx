'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { FiX, FiTruck, FiCalendar, FiAlertCircle } from 'react-icons/fi';
import { Vehicle } from '@/shared/types';

interface ViewVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
}

export default function ViewVehicleModal({ isOpen, onClose, vehicle }: ViewVehicleModalProps) {

  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return 'Not set';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getVehicleTypeIcon = (type: string) => {
    return <FiTruck className="text-primary-600" size={20} />;
  };

  if (!isOpen || !vehicle) return null;

  return (
    <AppModal open={isOpen} onClose={onClose}>
      <div className={APP_MODAL_PANEL}>
        <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-3 flex justify-between items-center z-10 shadow-sm">
          <h2 className="text-lg sm:text-xl text-gray-900">Vehicle Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Vehicle Header */}
          <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-6 border border-primary-200">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                  {getVehicleTypeIcon(vehicle.vehicle_type)}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl text-gray-900">{vehicle.vehicle_number}</h3>
                <p className="text-sm text-gray-600 mt-1 capitalize">{vehicle.vehicle_type} {vehicle.model ? `- ${vehicle.model}` : ''}</p>
              </div>
              <div>
                <span className={`px-3 py-1.5 inline-flex text-sm font-semibold rounded-full ${getStatusColor(vehicle.status)}`}>
                  {vehicle.status}
                </span>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shrink-0">
              <h3 className="text-base font-semibold text-gray-900">Basic Information</h3>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Vehicle Number</p>
                <p className="text-sm text-gray-900 font-medium">{vehicle.vehicle_number}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Vehicle Type</p>
                <p className="text-sm text-gray-900 capitalize">{vehicle.vehicle_type}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Model</p>
                <p className="text-sm text-gray-900">{vehicle.model || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Capacity (Seats)</p>
                <p className="text-sm text-gray-900">{vehicle.capacity}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Registration Date</p>
                <div className="flex items-center space-x-1">
                  <FiCalendar className="text-gray-400" size={14} />
                  <p className="text-sm text-gray-900">{formatDate(vehicle.registration_date)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(vehicle.status)}`}>
                  {vehicle.status}
                </span>
              </div>
            </div>
          </div>

          {/* Owner & Driver Information */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center sticky top-0 z-10 shrink-0">
              <h3 className="text-base font-semibold text-gray-900">Owner & Driver Information</h3>
              {vehicle.owner_name && vehicle.driver_name && 
               vehicle.owner_name === vehicle.driver_name && 
               vehicle.owner_phone === vehicle.driver_phone && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  Owner drives vehicle
                </span>
              )}
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Owner Name</p>
                <p className="text-sm text-gray-900">{vehicle.owner_name || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Owner Phone</p>
                <p className="text-sm text-gray-900">{vehicle.owner_phone || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Driver Name</p>
                <p className="text-sm text-gray-900">
                  {vehicle.driver_name 
                    ? (vehicle.driver_name === vehicle.owner_name 
                        ? <span className="italic text-gray-600">Same as owner</span>
                        : vehicle.driver_name)
                    : 'Not assigned'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Driver Phone</p>
                <p className="text-sm text-gray-900">
                  {vehicle.driver_phone
                    ? (vehicle.driver_phone === vehicle.owner_phone
                        ? <span className="italic text-gray-600">Same as owner</span>
                        : vehicle.driver_phone)
                    : 'Not specified'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Driver License</p>
                <p className="text-sm text-gray-900 font-mono">{vehicle.driver_license || 'Not specified'}</p>
              </div>
            </div>
          </div>

          {/* Compliance & Certificates */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shrink-0">
              <h3 className="text-base font-semibold text-gray-900">Compliance & Certificates</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-medium text-blue-700 mb-1">Insurance Expiry</p>
                  <div className="flex items-center space-x-1">
                    <FiCalendar className="text-blue-600" size={14} />
                    <p className="text-sm text-blue-900 font-medium">{formatDate(vehicle.insurance_expiry)}</p>
                  </div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs font-medium text-green-700 mb-1">Pollution Certificate</p>
                  <div className="flex items-center space-x-1">
                    <FiCalendar className="text-green-600" size={14} />
                    <p className="text-sm text-green-900 font-medium">{formatDate(vehicle.pollution_certificate_expiry)}</p>
                  </div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-xs font-medium text-purple-700 mb-1">Fitness Certificate</p>
                  <div className="flex items-center space-x-1">
                    <FiCalendar className="text-purple-600" size={14} />
                    <p className="text-sm text-purple-900 font-medium">{formatDate(vehicle.fitness_certificate_expiry)}</p>
                  </div>
                </div>
              </div>

              {/* Check for expiring certificates */}
              {(() => {
                const today = new Date();
                const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
                const expiringCerts = [];

                if (vehicle.insurance_expiry && new Date(vehicle.insurance_expiry) < thirtyDaysFromNow) {
                  expiringCerts.push('Insurance');
                }
                if (vehicle.pollution_certificate_expiry && new Date(vehicle.pollution_certificate_expiry) < thirtyDaysFromNow) {
                  expiringCerts.push('Pollution Certificate');
                }
                if (vehicle.fitness_certificate_expiry && new Date(vehicle.fitness_certificate_expiry) < thirtyDaysFromNow) {
                  expiringCerts.push('Fitness Certificate');
                }

                if (expiringCerts.length > 0) {
                  return (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <FiAlertCircle className="text-yellow-600 mt-0.5" size={18} />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-yellow-800">Expiring Soon</p>
                          <p className="text-xs text-yellow-700 mt-1">
                            {expiringCerts.join(', ')} {expiringCerts.length === 1 ? 'is' : 'are'} expiring within 30 days
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          {/* Additional Information */}
          {vehicle.created_at && (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Created At</p>
                  <p className="text-sm text-gray-900">
                    {new Date(vehicle.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Last Updated</p>
                  <p className="text-sm text-gray-900">
                    {vehicle.updated_at ? new Date(vehicle.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppModal>
  );
}

