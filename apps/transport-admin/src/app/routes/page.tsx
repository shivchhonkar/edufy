'use client';

import React, { useState, useEffect } from 'react';
import { FiEdit, FiTrash2, FiPlus, FiMapPin } from 'react-icons/fi';
import { Button } from '@edulakhya/ui';

export default function RoutesPage() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any>(null);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      const res = await fetch('/api/routes');
      const data = await res.json();
      if (data.success) {
        setRoutes(data.data);
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this route?')) return;
    
    try {
      const res = await fetch(`/api/routes/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchRoutes();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error deleting route:', error);
      alert('Failed to delete route');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex justify-end">
        <Button onClick={() => { setEditingRoute(null); setShowModal(true); }}>
          <FiPlus className="mr-2" />Add Route
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Points</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stops</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
              ) : routes.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No routes found</td></tr>
              ) : (
                routes.map((route) => (
                  <tr key={route.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <FiMapPin className="text-gray-400 mr-3" />
                        <div>
                          <div className="font-medium text-gray-900">{route.route_name}</div>
                          <div className="text-sm text-gray-500">{route.route_number}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>{route.starting_point || '-'}</div>
                      <div className="text-gray-500">to {route.ending_point || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {route.total_distance ? `${route.total_distance} km` : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {route.stops_count || 0} stops
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        route.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {route.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <button onClick={() => { setEditingRoute(route); setShowModal(true); }} className="text-blue-600 hover:text-blue-900 mr-4">
                        <FiEdit />
                      </button>
                      <button onClick={() => handleDelete(route.id)} className="text-red-600 hover:text-red-900">
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      {showModal && (
        <RouteModal
          route={editingRoute}
          onClose={() => { setShowModal(false); setEditingRoute(null); }}
          onSave={() => { setShowModal(false); setEditingRoute(null); fetchRoutes(); }}
        />
      )}
    </div>
  );
}

function RouteModal({ route, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    route_name: route?.route_name || '',
    route_number: route?.route_number || '',
    starting_point: route?.starting_point || '',
    ending_point: route?.ending_point || '',
    total_distance: route?.total_distance || '',
    estimated_time: route?.estimated_time || '',
    status: route?.status || 'active',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = route ? `/api/routes/${route.id}` : '/api/routes';
      const method = route ? 'PUT' : 'POST';
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
      console.error('Error saving route:', error);
      alert('Failed to save route');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <h2 className="text-xl mb-4">{route ? 'Edit Route' : 'Add New Route'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Route Name *</label>
              <input type="text" required value={formData.route_name} onChange={(e) => setFormData({ ...formData, route_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Route Number</label>
              <input type="text" value={formData.route_number} onChange={(e) => setFormData({ ...formData, route_number: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Starting Point</label>
              <input type="text" value={formData.starting_point} onChange={(e) => setFormData({ ...formData, starting_point: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ending Point</label>
              <input type="text" value={formData.ending_point} onChange={(e) => setFormData({ ...formData, ending_point: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Distance (km)</label>
              <input type="number" step="0.1" value={formData.total_distance} onChange={(e) => setFormData({ ...formData, total_distance: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Time (min)</label>
              <input type="number" value={formData.estimated_time} onChange={(e) => setFormData({ ...formData, estimated_time: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Route'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

