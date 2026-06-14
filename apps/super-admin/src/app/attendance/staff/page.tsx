'use client';

import React, { useState, useEffect } from 'react';
import { FiUsers, FiClock, FiCalendar, FiPlus, FiEdit, FiEye, FiFilter, FiDownload, FiRefreshCw } from 'react-icons/fi';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import RecordAttendanceModal from '@/features/attendance/components/RecordAttendanceModal';
import MarkStaffAttendancePanel from '@/features/attendance/components/MarkStaffAttendancePanel';
import PunchMachineModal from '@/features/attendance/components/PunchMachineModal';
import AttendanceReportsModal from '@/features/attendance/components/AttendanceReportsModal';

interface Staff {
  id: number;
  first_name: string;
  last_name: string;
  employee_id: string;
  department: string;
  position: string;
}

interface AttendanceRecord {
  id: number;
  staff_id: number;
  attendance_date: string;
  check_in_time?: string;
  check_out_time?: string;
  break_start_time?: string;
  break_end_time?: string;
  total_hours_worked?: number;
  status: string;
  attendance_type: string;
  device_id?: string;
  location?: string;
  remarks?: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  department: string;
  position: string;
}

interface AttendanceStats {
  total_staff: number;
  present_today: number;
  absent_today: number;
  late_today: number;
  on_leave_today: number;
}

interface PunchLog {
  id: number;
  device_id: string;
  staff_id: number;
  punch_time: string;
  punch_type: string;
  processed: boolean;
  first_name: string;
  last_name: string;
  employee_id: string;
  device_name: string;
  device_location?: string;
}

function buildAttendanceStats(records: AttendanceRecord[], staffCount: number): AttendanceStats {
  return {
    total_staff: staffCount,
    present_today: records.filter((r) => r.status === 'present').length,
    absent_today: records.filter((r) => r.status === 'absent').length,
    late_today: records.filter((r) => r.status === 'late').length,
    on_leave_today: records.filter((r) => r.status === 'on_leave').length,
  };
}

export default function AttendancePage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [punchLogs, setPunchLogs] = useState<PunchLog[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    total_staff: 0,
    present_today: 0,
    absent_today: 0,
    late_today: 0,
    on_leave_today: 0,
  });
  const [loading, setLoading] = useState(true);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showPunchMachineModal, setShowPunchMachineModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'mark' | 'today' | 'history' | 'punch-machines'>('mark');
  const [filters, setFilters] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    department: '',
    status: '',
  });

  const loadStats = async () => {
    const staffResponse = await fetch('/api/staff?limit=500&status=active');
    const staffData = await staffResponse.json();
    const staffList: Staff[] = staffData.success ? staffData.data : [];
    setStaff(staffList);

    const today = new Date().toISOString().split('T')[0];
    const statsResponse = await fetch(`/api/attendance?start_date=${today}&end_date=${today}`);
    const statsData = await statsResponse.json();
    if (statsData.success) {
      setStats(buildAttendanceStats(statsData.data, staffList.length));
      setMigrationRequired(false);
    } else if (statsData.migration_required) {
      setMigrationRequired(true);
    }
    return staffList.length;
  };

  const loadData = async () => {
    if (activeTab === 'mark') return;

    setLoading(true);
    try {
      const staffResponse = await fetch('/api/staff?limit=500&status=active');
      const staffData = await staffResponse.json();
      const staffList: Staff[] = staffData.success ? staffData.data : [];
      setStaff(staffList);

      const today = new Date().toISOString().split('T')[0];

      if (activeTab === 'punch-machines') {
        const params = new URLSearchParams();
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);

        const response = await fetch(`/api/attendance/punch-machine?${params.toString()}`);
        const data = await response.json();
        if (data.success) {
          setPunchLogs(data.data);
          setMigrationRequired(false);
        } else {
          setPunchLogs([]);
        }

        const statsResponse = await fetch(`/api/attendance?start_date=${today}&end_date=${today}`);
        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStats(buildAttendanceStats(statsData.data, staffList.length));
          setMigrationRequired(false);
        } else if (statsData.migration_required) {
          setMigrationRequired(true);
        }
        return;
      }

      const params = new URLSearchParams();
      if (activeTab === 'today') {
        params.append('start_date', today);
        params.append('end_date', today);
      } else {
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);
        if (filters.department) params.append('department', filters.department);
        if (filters.status) params.append('status', filters.status);
      }

      const response = await fetch(`/api/attendance?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setAttendanceRecords(data.data);
        setMigrationRequired(false);
        if (activeTab === 'today') {
          setStats(buildAttendanceStats(data.data, staffList.length));
        }
      } else if (data.migration_required) {
        setMigrationRequired(true);
        setAttendanceRecords([]);
      } else {
        setAttendanceRecords([]);
      }

      if (activeTab !== 'today') {
        const statsResponse = await fetch(`/api/attendance?start_date=${today}&end_date=${today}`);
        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStats(buildAttendanceStats(statsData.data, staffList.length));
        } else if (statsData.migration_required) {
          setMigrationRequired(true);
        }
      }
    } catch (error) {
      console.error('Error loading attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab !== 'mark') {
      loadData();
    }
  }, [activeTab, filters]);

  const handleRecordSuccess = () => {
    loadStats();
    if (activeTab !== 'mark') loadData();
    setShowRecordModal(false);
    setSelectedRecord(null);
  };

  const handleMarkSaved = () => {
    loadStats();
    if (activeTab === 'today') loadData();
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

  const formatTime = (time: string | null | undefined) => {
    if (!time) return '-';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatHours = (hours: number | null | undefined) => {
    if (!hours) return '-';
    return `${hours.toFixed(1)}h`;
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getAttendanceTypeIcon = (type: string) => {
    switch (type) {
      case 'punch_machine': return '🖥️';
      case 'biometric': return '👆';
      case 'mobile_app': return '📱';
      default: return '✍️';
    }
  };

  if (loading && activeTab !== 'mark') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
      <div className="p-0">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-xl text-gray-900">Staff Attendance</h1>
              <p className="text-gray-600 mt-1 max-w-[400px] text-xs">
                Mark attendance for multiple staff at once, then review today&apos;s records and history.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPunchMachineModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FiUsers className="w-4 h-4" />
                Punch Machines
              </button>
              <button
                onClick={() => setShowReportsModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FiDownload className="w-4 h-4" />
                Reports
              </button>
              <button
                onClick={() => {
                  setSelectedRecord(null);
                  setShowRecordModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FiPlus className="w-4 h-4" />
                Detailed Entry
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Staff</p>
                  <p className="text-xl text-gray-900">{stats.total_staff}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <FiUsers className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
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

            <div className="bg-white p-6 rounded-lg shadow-sm border">
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

            <div className="bg-white p-6 rounded-lg shadow-sm border">
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

            <div className="bg-white p-6 rounded-lg shadow-sm border">
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
        </div>

        {migrationRequired && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Attendance tables are not set up for this school yet. Run the staff attendance migration on the tenant database to enable recording and reports.
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
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
              <button
                onClick={() => setActiveTab('punch-machines')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'punch-machines'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Punch Machine Logs
              </button>
            </nav>
        </div>

          <div className="p-6">
            {activeTab === 'mark' && (
              <MarkStaffAttendancePanel onSaved={handleMarkSaved} />
            )}

            {/* Filters for History / Punch Machine tabs */}
            {activeTab !== 'mark' && (activeTab === 'history' || activeTab === 'punch-machines') && (
              <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={filters.start_date}
                    onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                    value={filters.end_date}
                    onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  {activeTab === 'history' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <select
                          value={filters.department}
                          onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">All Departments</option>
                          <option value="Teaching">Teaching</option>
                          <option value="Administration">Administration</option>
                          <option value="Support">Support</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                          value={filters.status}
                          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">All Status</option>
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                          <option value="late">Late</option>
                          <option value="half_day">Half Day</option>
                          <option value="on_leave">On Leave</option>
                        </select>
                      </div>
                    </>
                  )}
              </div>
            )}

            {activeTab !== 'mark' && activeTab === 'punch-machines' ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Member</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Punch Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Processed</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {punchLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                          No punch machine logs found
                        </td>
                      </tr>
                    ) : (
                      punchLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {log.first_name} {log.last_name}
                            </div>
                            <div className="text-sm text-gray-500">{log.employee_id}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>{log.device_name}</div>
                            <div className="text-xs text-gray-500">{log.device_id}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDateTime(log.punch_time)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.punch_type.replace('_', ' ')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              log.processed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {log.processed ? 'Yes' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : activeTab !== 'mark' ? (
                <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Staff Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check Out
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hours Worked
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                  {attendanceRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                        No attendance records found
                          </td>
                    </tr>
                  ) : (
                    attendanceRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {record.first_name} {record.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {record.employee_id} • {record.department}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(record.attendance_date).toLocaleDateString('en-IN')}
                          </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(record.check_in_time)}
                            </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(record.check_out_time)}
                              </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatHours(record.total_hours_worked)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                            {record.status.replace('_', ' ').toUpperCase()}
                                </span>
                              </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="flex items-center gap-1">
                            <span>{getAttendanceTypeIcon(record.attendance_type)}</span>
                            {record.attendance_type.replace('_', ' ')}
                          </span>
                              </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                                    <button
                              onClick={() => {
                                setSelectedRecord(record);
                                setShowRecordModal(true);
                              }}
                              className="text-primary-600 hover:text-primary-900 p-1"
                                      title="Edit"
                                    >
                              <FiEdit className="w-4 h-4" />
                                    </button>
                                    <button
                              onClick={() => {
                                setSelectedRecord(record);
                                // Show view modal
                              }}
                              className="text-gray-600 hover:text-gray-900 p-1"
                              title="View Details"
                            >
                              <FiEye className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
            ) : null}
              </div>
            </div>
          </div>

      {/* Modals */}
      {showRecordModal && (
        <RecordAttendanceModal
          isOpen={showRecordModal}
          onClose={() => {
            setShowRecordModal(false);
            setSelectedRecord(null);
          }}
          onSuccess={handleRecordSuccess}
          staff={staff}
          editingRecord={selectedRecord}
        />
      )}

      {showPunchMachineModal && (
        <PunchMachineModal
          isOpen={showPunchMachineModal}
          onClose={() => setShowPunchMachineModal(false)}
        />
      )}

      {showReportsModal && (
        <AttendanceReportsModal
          isOpen={showReportsModal}
          onClose={() => setShowReportsModal(false)}
          staff={staff}
        />
      )}
      </div>
    </DashboardLayout>
  );
}