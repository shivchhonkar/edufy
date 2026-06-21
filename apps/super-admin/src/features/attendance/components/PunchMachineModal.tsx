'use client';

import AppModal from '@/shared/components/common/AppModal';
import React, { useState, useEffect } from 'react';
import { FiX, FiPlus, FiEdit, FiTrash2, FiRefreshCw, FiActivity, FiMapPin, FiMonitor } from 'react-icons/fi';
import { useDialog } from '@/shared/context/DialogContext';

interface PunchMachine {
  id: number;
  device_id: string;
  device_name: string;
  location: string;
  device_type: string;
  ip_address?: string;
  port?: number;
  status: string;
  last_sync?: string;
  total_punches?: number;
  last_punch_time?: string;
}

interface PunchMachineLog {
  id: number;
  device_id: string;
  staff_id: number;
  punch_time: string;
  punch_type: string;
  raw_data?: any;
  processed: boolean;
  first_name: string;
  last_name: string;
  employee_id: string;
  device_name: string;
  device_location: string;
}

interface PunchMachineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PunchMachineModal({ isOpen, onClose }: PunchMachineModalProps) {
  const { confirm } = useDialog();
  const [machines, setMachines] = useState<PunchMachine[]>([]);
  const [logs, setLogs] = useState<PunchMachineLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'machines' | 'logs'>('machines');
  const [showAddMachine, setShowAddMachine] = useState(false);
  const [editingMachine, setEditingMachine] = useState<PunchMachine | null>(null);
  const [machineForm, setMachineForm] = useState({
    device_id: '',
    device_name: '',
    location: '',
    device_type: 'fingerprint',
    ip_address: '',
    port: '',
    status: 'active',
  });

  useEffect(() => {
    if (isOpen) {
      fetchMachines();
      fetchLogs();
    }
  }, [isOpen]);

  const fetchMachines = async () => {
    try {
      const response = await fetch('/api/attendance/punch-machines');
      const data = await response.json();
      if (data.success) {
        setMachines(data.data);
      }
    } catch (error) {
      console.error('Error fetching machines:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/attendance/punch-machine');
      const data = await response.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const handleSubmitMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = editingMachine ? '/api/attendance/punch-machines' : '/api/attendance/punch-machines';
      const method = editingMachine ? 'PUT' : 'POST';
      
      const payload = editingMachine 
        ? { id: editingMachine.id, ...machineForm }
        : machineForm;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        fetchMachines();
        setShowAddMachine(false);
        setEditingMachine(null);
        setMachineForm({
          device_id: '',
          device_name: '',
          location: '',
          device_type: 'fingerprint',
          ip_address: '',
          port: '',
          status: 'active',
        });
      } else {
        setError(data.error || 'Failed to save machine');
      }
    } catch (error) {
      console.error('Error saving machine:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMachine = async (id: number) => {
    const confirmed = await confirm('Are you sure you want to delete this punch machine?', {
      title: 'Delete Punch Machine',
      type: 'danger',
      confirmText: 'Delete',
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/attendance/punch-machines?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        fetchMachines();
      } else {
        setError(data.error || 'Failed to delete machine');
      }
    } catch (error) {
      console.error('Error deleting machine:', error);
      setError('An unexpected error occurred');
    }
  };

  const handleProcessLogs = async () => {
    const unprocessedLogs = logs.filter(log => !log.processed);
    if (unprocessedLogs.length === 0) {
      setError('No unprocessed logs found');
      return;
    }

    try {
      const response = await fetch('/api/attendance/punch-machine', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_ids: unprocessedLogs.map(log => log.id),
        }),
      });

      const data = await response.json();

      if (data.success) {
        fetchLogs();
        setError('');
      } else {
        setError(data.error || 'Failed to process logs');
      }
    } catch (error) {
      console.error('Error processing logs:', error);
      setError('An unexpected error occurred');
    }
  };

  const getDeviceTypeIcon = (type: string) => {
    switch (type) {
      case 'fingerprint': return '👆';
      case 'rfid': return '📱';
      case 'face_recognition': return '👤';
      case 'card_reader': return '💳';
      default: return '🖥️';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AppModal open={isOpen} onClose={onClose}>
      <div className="bg-white shadow-2xl w-full h-full overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl  text-gray-900">Punch Machine Management</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('machines')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'machines'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiMonitor className="w-4 h-4 inline mr-2" />
                Machines ({machines.length})
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'logs'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiActivity className="w-4 h-4 inline mr-2" />
                Punch Logs ({logs.filter(l => !l.processed).length} unprocessed)
              </button>
            </nav>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Machines Tab */}
          {activeTab === 'machines' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Punch Machines</h3>
                <button
                  onClick={() => setShowAddMachine(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <FiPlus className="w-4 h-4" />
                  Add Machine
                </button>
              </div>

              {/* Add/Edit Machine Form */}
              {showAddMachine && (
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">
                    {editingMachine ? 'Edit Machine' : 'Add New Machine'}
                  </h4>
                  <form onSubmit={handleSubmitMachine} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Device ID</label>
                      <input
                        type="text"
                        value={machineForm.device_id}
                        onChange={(e) => setMachineForm({ ...machineForm, device_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Device Name</label>
                      <input
                        type="text"
                        value={machineForm.device_name}
                        onChange={(e) => setMachineForm({ ...machineForm, device_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                      <input
                        type="text"
                        value={machineForm.location}
                        onChange={(e) => setMachineForm({ ...machineForm, location: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Device Type</label>
                      <select
                        value={machineForm.device_type}
                        onChange={(e) => setMachineForm({ ...machineForm, device_type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="fingerprint">Fingerprint</option>
                        <option value="rfid">RFID</option>
                        <option value="face_recognition">Face Recognition</option>
                        <option value="card_reader">Card Reader</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                      <input
                        type="text"
                        value={machineForm.ip_address}
                        onChange={(e) => setMachineForm({ ...machineForm, ip_address: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                      <input
                        type="number"
                        value={machineForm.port}
                        onChange={(e) => setMachineForm({ ...machineForm, port: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div className="md:col-span-2 flex gap-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                      >
                        {loading ? 'Saving...' : editingMachine ? 'Update' : 'Add Machine'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddMachine(false);
                          setEditingMachine(null);
                          setMachineForm({
                            device_id: '',
                            device_name: '',
                            location: '',
                            device_type: 'fingerprint',
                            ip_address: '',
                            port: '',
                            status: 'active',
                          });
                        }}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Machines List */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Machine
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Sync
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Punches
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {machines.map((machine) => (
                      <tr key={machine.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-2xl mr-3">
                              {getDeviceTypeIcon(machine.device_type)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {machine.device_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {machine.device_id} • {machine.device_type}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            <FiMapPin className="w-4 h-4 mr-1 text-gray-400" />
                            {machine.location}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(machine.status)}`}>
                            {machine.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {machine.last_sync ? new Date(machine.last_sync).toLocaleString() : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {machine.total_punches || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingMachine(machine);
                                setMachineForm({
                                  device_id: machine.device_id,
                                  device_name: machine.device_name,
                                  location: machine.location,
                                  device_type: machine.device_type,
                                  ip_address: machine.ip_address || '',
                                  port: machine.port?.toString() || '',
                                  status: machine.status,
                                });
                                setShowAddMachine(true);
                              }}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              <FiEdit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMachine(machine.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Punch Machine Logs</h3>
                <div className="flex gap-2">
                  <button
                    onClick={fetchLogs}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <FiRefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                  <button
                    onClick={handleProcessLogs}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <FiActivity className="w-4 h-4" />
                    Process Logs
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Staff
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Machine
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Punch Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id} className={log.processed ? 'bg-gray-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {log.first_name} {log.last_name}
                            </div>
                            <div className="text-sm text-gray-500">{log.employee_id}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {log.device_name}
                            </div>
                            <div className="text-sm text-gray-500">{log.device_location}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(log.punch_time).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {log.punch_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            log.processed 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {log.processed ? 'Processed' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
      </AppModal>
  );
}







