'use client';

import React, { useState, useEffect } from 'react';
import { FiEdit, FiTrash2, FiPlus, FiSearch, FiTruck, FiAlertCircle } from 'react-icons/fi';
import { Button } from '@EduLakhya/ui';
import { formatDate } from '@EduLakhya/utils';
import Link from 'next/link';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await fetch('/api/vehicles');
      const data = await res.json();
      if (data.success) {
        setVehicles(data.data);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;
    
    try {
      const res = await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchVehicles();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      alert('Failed to delete vehicle');
    }
  };

  const openModal = (vehicle: any = null) => {
    setEditingVehicle(vehicle);
    setShowModal(true);
  };

  const filteredVehicles = vehicles.filter((v) =>
    v.vehicle_number.toLowerCase().includes(search.toLowerCase()) ||
    (v.model && v.model.toLowerCase().includes(search.toLowerCase()))
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isExpiringSoon = (date: string) => {
    if (!date) return false;
    const expiryDate = new Date(date);
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return expiryDate < thirtyDaysFromNow;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Search and Actions */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search vehicles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button onClick={() => openModal()}>
            <FiPlus className="mr-2" />
            Add Vehicle
          </Button>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Driver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Certificates
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No vehicles found
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <FiTruck className="text-gray-400 mr-3" />
                        <div>
                          <div className="font-medium text-gray-900">{vehicle.vehicle_number}</div>
                          <div className="text-sm text-gray-500">{vehicle.model}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 capitalize">
                      {vehicle.vehicle_type}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {vehicle.capacity} seats
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{vehicle.driver_name || '-'}</div>
                      <div className="text-xs text-gray-500">{vehicle.driver_phone || ''}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(vehicle.status)}`}>
                        {vehicle.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs space-y-1">
                        <div className={isExpiringSoon(vehicle.insurance_expiry) ? 'text-red-600 flex items-center' : 'text-gray-600'}>
                          {isExpiringSoon(vehicle.insurance_expiry) && <FiAlertCircle className="mr-1" size={12} />}
                          Insurance: {vehicle.insurance_expiry ? formatDate(new Date(vehicle.insurance_expiry)) : '-'}
                        </div>
                        <div className={isExpiringSoon(vehicle.pollution_certificate_expiry) ? 'text-red-600 flex items-center' : 'text-gray-600'}>
                          {isExpiringSoon(vehicle.pollution_certificate_expiry) && <FiAlertCircle className="mr-1" size={12} />}
                          Pollution: {vehicle.pollution_certificate_expiry ? formatDate(new Date(vehicle.pollution_certificate_expiry)) : '-'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => openModal(vehicle)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <FiEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(vehicle.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      {/* Modal */}
      {showModal && (
        <VehicleModal
          vehicle={editingVehicle}
          onClose={() => {
            setShowModal(false);
            setEditingVehicle(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingVehicle(null);
            fetchVehicles();
          }}
        />
      )}
    </div>
  );
}

function VehicleModal({ vehicle, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    vehicle_number: vehicle?.vehicle_number || '',
    vehicle_type: vehicle?.vehicle_type || 'bus',
    model: vehicle?.model || '',
    capacity: vehicle?.capacity || '',
    registration_date: vehicle?.registration_date?.split('T')[0] || '',
    insurance_expiry: vehicle?.insurance_expiry?.split('T')[0] || '',
    pollution_certificate_expiry: vehicle?.pollution_certificate_expiry?.split('T')[0] || '',
    fitness_certificate_expiry: vehicle?.fitness_certificate_expiry?.split('T')[0] || '',
    owner_name: vehicle?.owner_name || '',
    owner_phone: vehicle?.owner_phone || '',
    driver_name: vehicle?.driver_name || '',
    driver_phone: vehicle?.driver_phone || '',
    driver_license: vehicle?.driver_license || '',
    status: vehicle?.status || 'active',
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = vehicle ? `/api/vehicles/${vehicle.id}` : '/api/vehicles';
      const method = vehicle ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        onSave();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error saving vehicle:', error);
      alert('Failed to save vehicle');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white max-w-3xl w-full max-h-[100vh-20px] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl mb-4">
            {vehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Number *
                </label>
                <input
                  type="text"
                  required
                  value={formData.vehicle_number}
                  onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Type *
                </label>
                <select
                  required
                  value={formData.vehicle_type}
                  onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="bus">Bus</option>
                  <option value="van">Van</option>
                  <option value="car">Car</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model
                </label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity *
                </label>
                <input
                  type="number"
                  required
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Registration Date
                </label>
                <input
                  type="date"
                  value={formData.registration_date}
                  onChange={(e) => setFormData({ ...formData, registration_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Insurance Expiry
                </label>
                <input
                  type="date"
                  value={formData.insurance_expiry}
                  onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pollution Certificate Expiry
                </label>
                <input
                  type="date"
                  value={formData.pollution_certificate_expiry}
                  onChange={(e) => setFormData({ ...formData, pollution_certificate_expiry: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fitness Certificate Expiry
                </label>
                <input
                  type="date"
                  value={formData.fitness_certificate_expiry}
                  onChange={(e) => setFormData({ ...formData, fitness_certificate_expiry: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Owner Name
                </label>
                <input
                  type="text"
                  value={formData.owner_name}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Owner Phone
                </label>
                <input
                  type="tel"
                  value={formData.owner_phone}
                  onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Driver Name
                </label>
                <input
                  type="text"
                  value={formData.driver_name}
                  onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Driver Phone
                </label>
                <input
                  type="tel"
                  value={formData.driver_phone}
                  onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Driver License
                </label>
                <input
                  type="text"
                  value={formData.driver_license}
                  onChange={(e) => setFormData({ ...formData, driver_license: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Vehicle'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

