'use client';

import { useEffect, useState } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiEye, FiX } from 'react-icons/fi';
import { useDialog } from '@/shared/context/DialogContext';
import { Route } from '@/shared/types';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';
import AddRouteModal from '@/features/transport/components/AddRouteModal';
import ViewRouteModal from '@/features/transport/components/ViewRouteModal';
import AssignVehicleToRouteModal from '@/features/transport/components/AssignVehicleToRouteModal';
import TransportPageHeader from '@/features/transport/components/TransportPageHeader';

export default function TransportRoutesView() {
  const { alert } = useDialog();
  const [routes, setRoutes] = useState<any[]>([]);
  const [routeAssignments, setRouteAssignments] = useState<any[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [loadingRouteAssignments, setLoadingRouteAssignments] = useState(false);
  const [loadingRouteId, setLoadingRouteId] = useState<number | null>(null);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [showVehicleAssignmentModal, setShowVehicleAssignmentModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [preSelectedRoute, setPreSelectedRoute] = useState<any | null>(null);
  const [viewingRoute, setViewingRoute] = useState<any | null>(null);
  const [deletingRoute, setDeletingRoute] = useState<any | null>(null);
  const [deletingVehicleAssignment, setDeletingVehicleAssignment] = useState<any | null>(null);

  useEffect(() => {
    fetchRoutes();
    fetchRouteAssignments();
  }, []);

  const fetchRoutes = async () => {
    setLoadingRoutes(true);
    try {
      const response = await fetch('/api/transport/routes');
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

  const fetchRouteAssignments = async () => {
    setLoadingRouteAssignments(true);
    try {
      const response = await fetch('/api/transport/route-assignments?status=active');
      const data = await response.json();
      if (data.success) {
        setRouteAssignments(data.data);
      }
    } catch (error) {
      console.error('Error fetching route assignments:', error);
    } finally {
      setLoadingRouteAssignments(false);
    }
  };

  const handleViewRoute = async (route: any) => {
    setLoadingRouteId(route.id);
    try {
      const response = await fetch(`/api/transport/routes/${route.id}`);
      const data = await response.json();

      if (data.success) {
        setViewingRoute(data.data);
      } else {
        await alert('Failed to load route details', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error fetching route details:', error);
      await alert('An error occurred while loading route details', { title: 'Error', type: 'error' });
    } finally {
      setLoadingRouteId(null);
    }
  };

  const handleEditRoute = async (route: any) => {
    setLoadingRouteId(route.id);
    try {
      const response = await fetch(`/api/transport/routes/${route.id}`);
      const data = await response.json();

      if (data.success) {
        setEditingRoute(data.data);
        setShowRouteModal(true);
      } else {
        await alert('Failed to load route details', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error fetching route details:', error);
      await alert('An error occurred while loading route details', { title: 'Error', type: 'error' });
    } finally {
      setLoadingRouteId(null);
    }
  };

  const handleDeleteRoute = async () => {
    if (!deletingRoute) return;

    try {
      const response = await fetch(`/api/transport/routes/${deletingRoute.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setDeletingRoute(null);
        fetchRoutes();
      } else {
        await alert(data.error || 'Failed to delete route', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting route:', error);
      await alert('An error occurred while deleting route', { title: 'Error', type: 'error' });
    }
  };

  const handleCloseRouteModal = () => {
    setShowRouteModal(false);
    setEditingRoute(null);
  };

  const handleAssignVehicleToRoute = (route: any) => {
    setPreSelectedRoute(route);
    setShowVehicleAssignmentModal(true);
  };

  const handleCloseVehicleAssignmentModal = () => {
    setShowVehicleAssignmentModal(false);
    setPreSelectedRoute(null);
  };

  const handleDeleteVehicleAssignment = async () => {
    if (!deletingVehicleAssignment) return;

    try {
      const response = await fetch(
        `/api/transport/route-assignments/${deletingVehicleAssignment.id}`,
        { method: 'DELETE' },
      );

      const data = await response.json();
      if (data.success) {
        setDeletingVehicleAssignment(null);
        fetchRouteAssignments();
      } else {
        await alert(data.error || 'Failed to unassign vehicle', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error unassigning vehicle:', error);
      await alert('An error occurred while unassigning vehicle', { title: 'Error', type: 'error' });
    }
  };

  const loading = loadingRoutes || loadingRouteAssignments;

  return (
    <div className="space-y-6">
      <TransportPageHeader
        title="Routes & Stops"
        description="Create routes, pickup stops, and assign vehicles"
        action={
          <button
            onClick={() => setShowRouteModal(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center space-x-2"
          >
            <FiPlus />
            <span>Add Route</span>
          </button>
        }
      />

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-base font-semibold text-gray-900">Routes & Stops</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : routes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No routes found. Click &quot;Add Route&quot; to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                    Route Name
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                    Route Number
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                    Assigned Vehicle
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                    Driver
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                    Stops
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                    Students
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {routes.map((route) => {
                  const vehicleAssignment = routeAssignments.find((ra) => ra.route_id === route.id);

                  return (
                    <tr key={route.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {route.route_name}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {route.route_number || 'N/A'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        {vehicleAssignment ? (
                          <div>
                            <div className="font-medium text-gray-900">
                              {vehicleAssignment.vehicle_number}
                            </div>
                            <div className="text-xs text-gray-500 capitalize">
                              {vehicleAssignment.vehicle_type} • {vehicleAssignment.capacity} seats
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAssignVehicleToRoute(route)}
                            className="text-xs text-primary-600 hover:text-primary-900 font-medium"
                          >
                            + Assign Vehicle
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {vehicleAssignment?.driver_name || (
                          <span className="text-gray-400 italic">Not assigned</span>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {route.total_stops || 0}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {route.total_students || 0}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            route.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {route.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleViewRoute(route)}
                            disabled={loadingRouteId === route.id}
                            className="text-primary-600 hover:text-primary-900 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={
                              loadingRouteId === route.id ? 'Loading route details...' : 'View Details'
                            }
                          >
                            {loadingRouteId === route.id ? (
                              <div className="animate-spin h-4 w-4 border-2 border-primary-600 border-t-transparent rounded-full"></div>
                            ) : (
                              <FiEye size={18} />
                            )}
                          </button>
                          <button
                            onClick={() => handleEditRoute(route)}
                            disabled={loadingRouteId !== null}
                            className="text-blue-600 hover:text-blue-900 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Edit"
                          >
                            <FiEdit size={18} />
                          </button>
                          {vehicleAssignment && (
                            <button
                              onClick={() => setDeletingVehicleAssignment(vehicleAssignment)}
                              className="text-orange-600 hover:text-orange-900 p-1"
                              title="Unassign Vehicle"
                            >
                              <FiX size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => setDeletingRoute(route)}
                            disabled={loadingRouteId !== null}
                            className="text-red-600 hover:text-red-900 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete"
                          >
                            <FiTrash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddRouteModal
        isOpen={showRouteModal}
        onClose={handleCloseRouteModal}
        onSuccess={fetchRoutes}
        editingRoute={editingRoute}
      />

      <ViewRouteModal
        isOpen={!!viewingRoute}
        onClose={() => setViewingRoute(null)}
        route={viewingRoute}
      />

      <AssignVehicleToRouteModal
        isOpen={showVehicleAssignmentModal}
        onClose={handleCloseVehicleAssignmentModal}
        onSuccess={fetchRouteAssignments}
        editingAssignment={null}
        preSelectedRoute={preSelectedRoute}
      />

      <ConfirmDialog
        isOpen={!!deletingRoute}
        title="Delete Route"
        message={`Are you sure you want to delete route "${deletingRoute?.route_name}"? This will also remove all stops. This action cannot be undone.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteRoute}
        onCancel={() => setDeletingRoute(null)}
        type="danger"
      />

      <ConfirmDialog
        isOpen={!!deletingVehicleAssignment}
        title="Unassign Vehicle from Route"
        message={`Are you sure you want to unassign vehicle "${deletingVehicleAssignment?.vehicle_number}" from route "${deletingVehicleAssignment?.route_name}"?`}
        confirmText="Yes, Unassign"
        cancelText="Cancel"
        onConfirm={handleDeleteVehicleAssignment}
        onCancel={() => setDeletingVehicleAssignment(null)}
        type="warning"
      />
    </div>
  );
}
