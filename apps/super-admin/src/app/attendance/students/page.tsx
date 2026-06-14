'use client';

import React, { useState, useEffect } from 'react';
import { FiUsers, FiClock, FiCalendar, FiEdit } from 'react-icons/fi';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import RecordStudentAttendanceModal from '@/features/attendance/components/RecordStudentAttendanceModal';
import MarkStudentAttendancePanel from '@/features/attendance/components/MarkStudentAttendancePanel';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_name?: string;
}

interface Class {
  id: number;
  name: string;
}

interface Section {
  id: number;
  class_id: number;
  name: string;
}

interface AttendanceRecord {
  id: number;
  student_id: number;
  date: string;
  status: string;
  remarks?: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_name?: string;
  section_name?: string;
}

interface AttendanceStats {
  total_students: number;
  present_today: number;
  absent_today: number;
  late_today: number;
  on_leave_today: number;
}

function buildAttendanceStats(records: AttendanceRecord[], studentCount: number): AttendanceStats {
  return {
    total_students: studentCount,
    present_today: records.filter((r) => r.status === 'present').length,
    absent_today: records.filter((r) => r.status === 'absent').length,
    late_today: records.filter((r) => r.status === 'late').length,
    on_leave_today: records.filter((r) => r.status === 'on_leave').length,
  };
}

export default function StudentAttendancePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    total_students: 0,
    present_today: 0,
    absent_today: 0,
    late_today: 0,
    on_leave_today: 0,
  });
  const [loading, setLoading] = useState(true);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'mark' | 'today' | 'history'>('mark');
  const [filters, setFilters] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    class_id: '',
    section_id: '',
    status: '',
  });

  const loadStudents = async () => {
    const response = await fetch('/api/students?limit=500&status=active');
    const data = await response.json();
    if (data.success) {
      setStudents(
        data.data.map((s: Student & { class_name?: string }) => ({
          id: s.id,
          first_name: s.first_name,
          last_name: s.last_name,
          admission_number: s.admission_number,
          class_name: s.class_name,
        }))
      );
      return data.data.length;
    }
    return 0;
  };

  const loadStats = async () => {
    const studentCount = await loadStudents();
    const today = new Date().toISOString().split('T')[0];
    const statsResponse = await fetch(`/api/attendance/students?start_date=${today}&end_date=${today}`);
    const statsData = await statsResponse.json();
    if (statsData.success) {
      setStats(buildAttendanceStats(statsData.data, studentCount));
      setMigrationRequired(false);
    } else if (statsData.migration_required) {
      setMigrationRequired(true);
    }
  };

  const loadRecords = async () => {
    if (activeTab === 'mark') return;

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const params = new URLSearchParams();

      if (activeTab === 'today') {
        params.append('start_date', today);
        params.append('end_date', today);
      } else {
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);
        if (filters.class_id) params.append('class_id', filters.class_id);
        if (filters.section_id) params.append('section_id', filters.section_id);
        if (filters.status) params.append('status', filters.status);
      }

      const response = await fetch(`/api/attendance/students?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setAttendanceRecords(data.data);
        setMigrationRequired(false);
      } else if (data.migration_required) {
        setMigrationRequired(true);
        setAttendanceRecords([]);
      } else {
        setAttendanceRecords([]);
      }

      await loadStats();
    } catch (error) {
      console.error('Error loading student attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/classes')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setClasses(data.data);
      })
      .catch(console.error);

    loadStats().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (filters.class_id) {
      fetch(`/api/sections?class_id=${filters.class_id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setSections(data.data);
        })
        .catch(console.error);
    } else {
      setSections([]);
      setFilters((prev) => ({ ...prev, section_id: '' }));
    }
  }, [filters.class_id]);

  useEffect(() => {
    if (activeTab !== 'mark') {
      loadRecords();
    }
  }, [activeTab, filters]);

  const handleRecordSuccess = () => {
    loadStats();
    if (activeTab !== 'mark') loadRecords();
    setShowRecordModal(false);
    setSelectedRecord(null);
  };

  const handleMarkSaved = () => {
    loadStats();
    if (activeTab === 'today') loadRecords();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'half_day': return 'bg-orange-100 text-orange-800';
      case 'on_leave': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && activeTab !== 'mark') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-xl text-gray-900">Student Attendance</h1>
            <p className="text-gray-600 mt-1">
              Mark attendance by class or individually, then review today&apos;s records and history.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Students</p>
                    <p className="text-xl text-gray-900">{stats.total_students}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <FiUsers className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Present Today</p>
                    <p className="text-xl text-green-600">{stats.present_today}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <FiClock className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Absent Today</p>
                    <p className="text-xl text-red-600">{stats.absent_today}</p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-full">
                    <FiCalendar className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Late Today</p>
                    <p className="text-xl text-yellow-600">{stats.late_today}</p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <FiClock className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">On Leave</p>
                    <p className="text-xl text-blue-600">{stats.on_leave_today}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <FiCalendar className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
            </div>

          {migrationRequired && (
            <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
              Student attendance table is not set up for this school yet.
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-5">
                <button
                  onClick={() => setActiveTab('mark')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'mark'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Mark Attendance
                </button>
                <button
                  onClick={() => setActiveTab('today')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'today'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Today&apos;s Records
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'history'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Attendance History
                </button>
              </nav>
            </div>

            <div className="p-5">
              {activeTab === 'mark' && (
                <MarkStudentAttendancePanel classes={classes} onSaved={handleMarkSaved} />
              )}

              {activeTab === 'history' && (
                <div className="mb-5 grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={filters.start_date}
                      onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={filters.end_date}
                      onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                    <select
                      value={filters.class_id}
                      onChange={(e) => setFilters({ ...filters, class_id: e.target.value, section_id: '' })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">All Classes</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                    <select
                      value={filters.section_id}
                      onChange={(e) => setFilters({ ...filters, section_id: e.target.value })}
                      disabled={!filters.class_id}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                    >
                      <option value="">All Sections</option>
                      {sections.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">All Status</option>
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="late">Late</option>
                      <option value="half_day">Half Day</option>
                      <option value="on_leave">On Leave</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab !== 'mark' && (
                attendanceRecords.length === 0 ? (
                  <div className="text-center py-16 text-gray-500 text-sm">
                    No attendance records found.
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-5">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="px-5 py-3 text-left">Student</th>
                          <th className="px-5 py-3 text-left">Admission No.</th>
                          <th className="px-5 py-3 text-left">Class</th>
                          <th className="px-5 py-3 text-left">Date</th>
                          <th className="px-5 py-3 text-left">Status</th>
                          <th className="px-5 py-3 text-left">Remarks</th>
                          <th className="px-5 py-3 text-left w-12">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {attendanceRecords.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-5 py-3 font-medium text-gray-900">
                              {record.first_name} {record.last_name}
                            </td>
                            <td className="px-5 py-3 text-gray-600">{record.admission_number}</td>
                            <td className="px-5 py-3 text-gray-600">
                              {record.class_name || '—'}
                              {record.section_name ? ` · ${record.section_name}` : ''}
                            </td>
                            <td className="px-5 py-3 text-gray-600">
                              {new Date(record.date).toLocaleDateString('en-IN')}
                            </td>
                            <td className="px-5 py-3">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                                {record.status.replace('_', ' ').toUpperCase()}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-gray-500 max-w-xs truncate">
                              {record.remarks || '—'}
                            </td>
                            <td className="px-5 py-3">
                              <button
                                onClick={() => {
                                  setSelectedRecord(record);
                                  setShowRecordModal(true);
                                }}
                                className="text-primary-600 hover:text-primary-800 p-1"
                                title="Edit"
                              >
                                <FiEdit className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {showRecordModal && (
          <RecordStudentAttendanceModal
            isOpen={showRecordModal}
            onClose={() => {
              setShowRecordModal(false);
              setSelectedRecord(null);
            }}
            onSuccess={handleRecordSuccess}
            students={students}
            editingRecord={selectedRecord}
          />
        )}
    </DashboardLayout>
  );
}
