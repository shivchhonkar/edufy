'use client';

import { useMemo } from 'react';
import { FiX, FiMapPin, FiClock } from 'react-icons/fi';
import RupeeIcon from '@/shared/components/icons/RupeeIcon';
import { Route } from '@/shared/types';

interface ViewRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  route: any | null;
}

export default function ViewRouteModal({ isOpen, onClose, route }: ViewRouteModalProps) {
  const sidebarCollapsed = useMemo(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    }
    return false;
  }, [isOpen]);

  if (!isOpen || !route) return null;

  return (
    <div className={`fixed top-0 bottom-0 right-0 bg-black bg-opacity-50 z-[60] transition-all duration-300 ${
      sidebarCollapsed ? 'left-16' : 'left-56'
    }`} style={{ width: sidebarCollapsed ? 'calc(100% - 64px)' : 'calc(100% - 224px)' }}>
      <div className="bg-white shadow-2xl w-full h-full overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-3 flex justify-between items-center z-10 shadow-sm">
          <h2 className="text-lg sm:text-xl text-gray-900">Route Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Route Information */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">Route Information</h3>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Route Name</p>
                <p className="text-sm text-gray-900 font-medium">{route.route_name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Route Number</p>
                <p className="text-sm text-gray-900">{route.route_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Starting Point</p>
                <p className="text-sm text-gray-900">{route.starting_point || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Ending Point</p>
                <p className="text-sm text-gray-900">{route.ending_point || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Total Distance</p>
                <p className="text-sm text-gray-900">{route.total_distance ? `${route.total_distance} km` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Estimated Time</p>
                <p className="text-sm text-gray-900">{route.estimated_time ? `${route.estimated_time} minutes` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  route.status === 'active' 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {route.status}
                </span>
              </div>
            </div>
          </div>

          {/* Route Stops */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">Route Stops</h3>
            </div>
            <div className="p-4">
              {!route.stops || route.stops.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FiMapPin className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                  <p>No stops added to this route</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {route.stops.map((stop: any, index: number) => (
                    <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-700 font-semibold">{stop.stop_order}</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Stop Name</p>
                            <p className="text-sm font-medium text-gray-900">{stop.stop_name}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Arrival Time</p>
                            <div className="flex items-center space-x-1">
                              <FiClock className="text-gray-400" size={14} />
                              <p className="text-sm text-gray-900">
                                {stop.arrival_time ? (typeof stop.arrival_time === 'string' && stop.arrival_time.length > 5 ? stop.arrival_time.substring(0, 5) : stop.arrival_time) : 'Not set'}
                              </p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Pickup Fee</p>
                            <div className="flex items-center space-x-1">
                              <RupeeIcon className="text-gray-400" size={14} />
                              <p className="text-sm text-gray-900">
                                {stop.pickup_fee ? `₹${stop.pickup_fee}` : 'Free'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Additional Info */}
          {route.created_at && (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Created At</p>
                  <p className="text-sm text-gray-900">
                    {new Date(route.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Total Stops</p>
                  <p className="text-sm text-gray-900">{route.stops?.length || 0} stops</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}









