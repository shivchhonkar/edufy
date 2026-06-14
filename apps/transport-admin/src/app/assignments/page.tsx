'use client';

import React, { useState, useEffect } from 'react';
import { FiPlus, FiUser, FiMapPin } from 'react-icons/fi';
import { Button } from '@EduLakhya/ui';
import { formatCurrency, formatDate } from '@EduLakhya/utils';

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const res = await fetch('/api/assignments');
      const data = await res.json();
      if (data.success) {
        setAssignments(data.data);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setShowModal(true)}>
          <FiPlus className="mr-2" />Assign Student
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stop</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transport Fee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
              ) : assignments.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No assignments found</td></tr>
              ) : (
                assignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <FiUser className="text-gray-400 mr-3" />
                        <div>
                          <div className="font-medium text-gray-900">
                            {assignment.first_name} {assignment.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{assignment.admission_number}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <FiMapPin className="text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{assignment.route_name || '-'}</div>
                          <div className="text-xs text-gray-500">{assignment.route_number || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {assignment.stop_name || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {assignment.transport_fee ? formatCurrency(assignment.transport_fee) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        assignment.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {assignment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {assignment.start_date ? formatDate(new Date(assignment.start_date)) : '-'}
                      {assignment.end_date && ` to ${formatDate(new Date(assignment.end_date))}`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      
      {showModal && (
        <AssignmentModal
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); fetchAssignments(); }}
        />
      )}
    </div>      
    )
}

function AssignmentModal({ onClose, onSave }: any) {
  const [routes, setRoutes] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [stops, setStops] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [formData, setFormData] = useState({
    student_id: '',
    route_id: '',
    stop_id: '',
    transport_fee: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    status: 'active',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRoutes();
  }, []);

  useEffect(() => {
    if (studentSearch.length >= 2) {
      searchStudents();
    } else {
      setStudents([]);
    }
  }, [studentSearch]);

  useEffect(() => {
    if (formData.route_id) {
      fetchStops(formData.route_id);
    }
  }, [formData.route_id]);

  const fetchRoutes = async () => {
    try {
      const res = await fetch('/api/routes');
      const data = await res.json();
      if (data.success) {
        setRoutes(data.data.filter((r: any) => r.status === 'active'));
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
  };

  const searchStudents = async () => {
    try {
      const res = await fetch(`/api/students/search?q=${studentSearch}`);
      const data = await res.json();
      if (data.success) {
        setStudents(data.data);
      }
    } catch (error) {
      console.error('Error searching students:', error);
    }
  };

  const fetchStops = async (routeId: string) => {
    try {
      const res = await fetch(`/api/routes/${routeId}`);
      const data = await res.json();
      if (data.success) {
        setStops(data.data.stops || []);
      }
    } catch (error) {
      console.error('Error fetching stops:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
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
      console.error('Error saving assignment:', error);
      alert('Failed to save assignment');
    } finally {
      setSaving(false);
    }
  };

  const selectedStudent = students.find((s) => s.id.toString() === formData.student_id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <h2 className="text-xl mb-4">Assign Student to Route</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Student *</label>
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Search by name or admission number..."
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {students.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto border rounded-lg">
                {students.map((student) => (
                  <div
                    key={student.id}
                    onClick={() => {
                      setFormData({ ...formData, student_id: student.id.toString() });
                      setStudentSearch(`${student.first_name} ${student.last_name}`);
                      setStudents([]);
                    }}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                  >
                    <p className="text-sm font-medium">{student.first_name} {student.last_name}</p>
                    <p className="text-xs text-gray-500">{student.admission_number}</p>
                  </div>
                ))}
              </div>
            )}
            {selectedStudent && (
              <p className="text-sm text-gray-600 mt-1">Selected: {selectedStudent.first_name} {selectedStudent.last_name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Route *</label>
              <select
                required
                value={formData.route_id}
                onChange={(e) => setFormData({ ...formData, route_id: e.target.value, stop_id: '' })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Route</option>
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.route_name} ({route.route_number})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stop</label>
              <select
                value={formData.stop_id}
                onChange={(e) => setFormData({ ...formData, stop_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!formData.route_id}
              >
                <option value="">Select Stop</option>
                {stops.map((stop) => (
                  <option key={stop.id} value={stop.id}>
                    {stop.stop_name} {stop.pickup_fee && `- ${formatCurrency(stop.pickup_fee)}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transport Fee *</label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.transport_fee}
                onChange={(e) => setFormData({ ...formData, transport_fee: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !formData.student_id}>
              {saving ? 'Saving...' : 'Save Assignment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

