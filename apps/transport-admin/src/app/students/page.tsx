'use client';

import React, { useState, useEffect } from 'react';
import { FiUser, FiMapPin, FiSearch, FiPhone, FiMail } from 'react-icons/fi';
import { formatCurrency, formatDate } from '@EduLakhya/utils';

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/assignments');
      const data = await res.json();
      if (data.success) {
        setStudents(data.data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) =>
    student.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    student.last_name?.toLowerCase().includes(search.toLowerCase()) ||
    student.admission_number?.toLowerCase().includes(search.toLowerCase()) ||
    student.route_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-50 text-red-600';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search students by name, admission number, or route..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-xl text-gray-900 mt-1">{students.length}</p>
            </div>
            <FiUser className="text-blue-600 text-3xl" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Transports</p>
              <p className="text-xl text-gray-900 mt-1">
                {students.filter(s => s.status === 'active').length}
              </p>
            </div>
            <FiMapPin className="text-green-600 text-3xl" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Monthly Revenue</p>
              <p className="text-xl text-gray-900 mt-1">
                {formatCurrency(
                  students
                    .filter(s => s.status === 'active')
                    .reduce((sum, s) => sum + (parseFloat(s.transport_fee) || 0), 0)
                )}
              </p>
            </div>
            <div className="text-yellow-600 text-3xl">₹</div>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pickup Stop</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee (₹/Month)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Loading students...
                </td>
              </tr>
            ) : filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  {search ? 'No students found matching your search' : 'No students assigned to transport'}
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 border-b border-gray-100">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="font-medium text-gray-900">
                          {student.first_name} {student.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {student.admission_number}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {student.class_name || '-'}
                    </div>
                    <div className="text-sm text-gray-500">
                      Section {student.section || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <FiMapPin className="text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {student.route_name || '-'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {student.route_number || ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {student.stop_name || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {student.transport_fee ? formatCurrency(student.transport_fee) : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {student.start_date ? formatDate(new Date(student.start_date)) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(student.status)}`}>
                      {student.status || 'N/A'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      {filteredStudents.length > 0 && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-gray-600">Showing: </span>
              <span className="font-medium text-gray-900">
                {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Active: </span>
              <span className="font-medium text-green-600">
                {filteredStudents.filter(s => s.status === 'active').length}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Inactive: </span>
              <span className="font-medium text-red-600">
                {filteredStudents.filter(s => s.status === 'inactive').length}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Suspended: </span>
              <span className="font-medium text-red-700">
                {filteredStudents.filter(s => s.status === 'suspended').length}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Total Monthly Fee: </span>
              <span className="font-medium text-blue-600">
                {formatCurrency(
                  filteredStudents
                    .filter(s => s.status === 'active')
                    .reduce((sum, s) => sum + (parseFloat(s.transport_fee) || 0), 0)
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

