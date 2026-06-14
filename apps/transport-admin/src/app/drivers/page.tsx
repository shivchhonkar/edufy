'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiEdit, FiTrash2, FiPlus, FiUser } from 'react-icons/fi';
import { Button } from '@EduLakhya/ui';
import { formatDate } from '@EduLakhya/utils';

export default function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any>(null);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const res = await fetch('/api/drivers');
      const data = await res.json();
      console.log('Drivers API Response:', data); // Debug log
      if (data.success) {
        console.log('Drivers data:', data.data); // Debug log
        setDrivers(data.data);
      } else {
        console.error('API returned error:', data.error);
        alert(`Error loading drivers: ${data.error}`);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
      alert(`Failed to load drivers: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this driver?')) return;
    
    try {
      const res = await fetch(`/api/drivers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchDrivers();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error deleting driver:', error);
      alert('Failed to delete driver');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex justify-end">
        <Button onClick={() => { setEditingDriver(null); setShowModal(true); }}>
          <FiPlus className="mr-2" />Add Driver
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">License</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">License Expiry</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
              ) : drivers.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-4 text-center text-gray-500">No drivers found</td></tr>
              ) : (
                drivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <FiUser className="text-gray-400 mr-3" />
                        <div>
                          <div className="font-medium text-gray-900">{driver.name}</div>
                          {driver.source === 'vehicle' && (
                            <span className="text-xs text-blue-600">From Vehicle Record</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{driver.phone}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{driver.license_number || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {driver.license_expiry ? formatDate(new Date(driver.license_expiry)) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {driver.vehicle_number ? (
                        <div>
                          <div className="font-medium">{driver.vehicle_number}</div>
                          <div className="text-xs text-gray-500 capitalize">{driver.vehicle_type}</div>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        driver.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {driver.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      {driver.source === 'vehicle' ? (
                        <Link href="/vehicles">
                          <button className="text-blue-600 hover:text-blue-900 text-xs">
                            Edit in Vehicles
                          </button>
                        </Link>
                      ) : (
                        <>
                          <button onClick={() => { setEditingDriver(driver); setShowModal(true); }} className="text-blue-600 hover:text-blue-900 mr-4">
                            <FiEdit />
                          </button>
                          <button onClick={() => handleDelete(driver.id)} className="text-red-600 hover:text-red-900">
                            <FiTrash2 />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      {showModal && (
        <DriverModal
          driver={editingDriver}
          onClose={() => { setShowModal(false); setEditingDriver(null); }}
          onSave={() => { setShowModal(false); setEditingDriver(null); fetchDrivers(); }}
        />
      )}
    </div>
  );
}

function DriverModal({ driver, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    name: driver?.name || '',
    phone: driver?.phone || '',
    license_number: driver?.license_number || '',
    license_expiry: driver?.license_expiry?.split('T')[0] || '',
    address: driver?.address || '',
    status: driver?.status || 'active',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = driver ? `/api/drivers/${driver.id}` : '/api/drivers';
      const method = driver ? 'PUT' : 'POST';
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
      console.error('Error saving driver:', error);
      alert('Failed to save driver');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <h2 className="text-xl mb-4">{driver ? 'Edit Driver' : 'Add New Driver'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License Number *</label>
              <input type="text" required value={formData.license_number} onChange={(e) => setFormData({ ...formData, license_number: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License Expiry *</label>
              <input type="date" required value={formData.license_expiry} onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Driver'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

