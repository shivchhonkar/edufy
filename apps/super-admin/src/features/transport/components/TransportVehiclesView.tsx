'use client';

import { useEffect, useState } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiEye } from 'react-icons/fi';
import { useDialog } from '@/shared/context/DialogContext';
import { Vehicle } from '@/shared/types';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';
import AddVehicleModal from '@/features/transport/components/AddVehicleModal';
import ViewVehicleModal from '@/features/transport/components/ViewVehicleModal';
import TransportPageHeader from '@/features/transport/components/TransportPageHeader';

export default function TransportVehiclesView() {
  const { alert } = useDialog();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [viewingVehicle, setViewingVehicle] = useState<Vehicle | null>(null);
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/transport/vehicles');
      const data = await response.json();
      if (data.success) {
        setVehicles(data.data);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setShowVehicleModal(true);
  };

  const handleDeleteVehicle = async () => {
    if (!deletingVehicle) return;

    try {
      const response = await fetch(`/api/transport/vehicles/${deletingVehicle.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setDeletingVehicle(null);
        fetchVehicles();
      } else {
        await alert(data.error || 'Failed to delete vehicle', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      await alert('An error occurred while deleting vehicle', { title: 'Error', type: 'error' });
    }
  };

  const handleCloseVehicleModal = () => {
    setShowVehicleModal(false);
    setEditingVehicle(null);
  };

  return (
    <div className="space-y-6">
      <TransportPageHeader
        title="Vehicles"
        description="Manage buses, vans, and driver details"
        action={
          <button
            onClick={() => setShowVehicleModal(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center space-x-2"
          >
            <FiPlus />
            <span>Add Vehicle</span>
          </button>
        }
      />

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-base font-semibold text-gray-900">Vehicles</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No vehicles found. Click &quot;Add Vehicle&quot; to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                    Vehicle Number
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                    Model
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                    Capacity
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                    Driver/Owner
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
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      {vehicle.vehicle_number}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 capitalize">
                      {vehicle.vehicle_type}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {vehicle.model || 'N/A'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {vehicle.capacity} seats
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                      {vehicle.driver_name ? (
                        <div>
                          <div className="font-medium text-gray-900">{vehicle.driver_name}</div>
                          <div className="text-xs text-gray-500">
                            Driver {vehicle.driver_phone && `• ${vehicle.driver_phone}`}
                          </div>
                        </div>
                      ) : vehicle.owner_name ? (
                        <div>
                          <div className="font-medium text-gray-900">{vehicle.owner_name}</div>
                          <div className="text-xs text-gray-500">
                            Owner {vehicle.owner_phone && `• ${vehicle.owner_phone}`}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Not assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          vehicle.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : vehicle.status === 'maintenance'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {vehicle.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => setViewingVehicle(vehicle)}
                          className="text-primary-600 hover:text-primary-900 p-1"
                          title="View Details"
                        >
                          <FiEye size={18} />
                        </button>
                        <button
                          onClick={() => handleEditVehicle(vehicle)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Edit"
                        >
                          <FiEdit size={18} />
                        </button>
                        <button
                          onClick={() => setDeletingVehicle(vehicle)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddVehicleModal
        isOpen={showVehicleModal}
        onClose={handleCloseVehicleModal}
        onSuccess={fetchVehicles}
        editingVehicle={editingVehicle}
      />

      <ViewVehicleModal
        isOpen={!!viewingVehicle}
        onClose={() => setViewingVehicle(null)}
        vehicle={viewingVehicle}
      />

      <ConfirmDialog
        isOpen={!!deletingVehicle}
        title="Delete Vehicle"
        message={`Are you sure you want to delete vehicle ${deletingVehicle?.vehicle_number}? This action cannot be undone.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteVehicle}
        onCancel={() => setDeletingVehicle(null)}
        type="danger"
      />
    </div>
  );
}
