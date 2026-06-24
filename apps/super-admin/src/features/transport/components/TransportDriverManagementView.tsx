'use client';

import { useEffect, useState } from 'react';
import { FiEdit } from 'react-icons/fi';
import { Vehicle } from '@/shared/types';
import AddVehicleModal from '@/features/transport/components/AddVehicleModal';
import TransportPageHeader from '@/features/transport/components/TransportPageHeader';

export default function TransportDriverManagementView() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

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

  const driverVehicles = vehicles.filter((v) => v.driver_name || v.owner_name);

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setShowVehicleModal(true);
  };

  const handleCloseVehicleModal = () => {
    setShowVehicleModal(false);
    setEditingVehicle(null);
  };

  return (
    <div className="space-y-6">
      <TransportPageHeader
        title="Driver Management"
        description="View and update driver details linked to fleet vehicles"
      />

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-base font-semibold text-gray-900">Drivers & Owners</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : driverVehicles.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No driver or owner details found. Add driver information when creating or editing vehicles.
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
                    Driver / Owner
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                    Contact
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                    License
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
                {driverVehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      {vehicle.vehicle_number}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                      {vehicle.driver_name ? (
                        <div>
                          <div className="font-medium text-gray-900">{vehicle.driver_name}</div>
                          <div className="text-xs text-gray-500">Driver</div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium text-gray-900">{vehicle.owner_name}</div>
                          <div className="text-xs text-gray-500">Owner</div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {vehicle.driver_phone || vehicle.owner_phone || 'N/A'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {vehicle.driver_license || 'N/A'}
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
                      <button
                        onClick={() => handleEditVehicle(vehicle)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="Edit Driver Details"
                      >
                        <FiEdit size={18} />
                      </button>
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
    </div>
  );
}
