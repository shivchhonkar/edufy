'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { FiX, FiDownload, FiCalendar, FiUsers, FiClock, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';

interface Staff {
  id: number;
  first_name: string;
  last_name: string;
  employee_id: string;
  department: string;
}

interface AttendanceRecord {
  id: number;
  staff_id: number;
  attendance_date: string;
  check_in_time?: string;
  check_out_time?: string;
  total_hours_worked?: number;
  status: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  department: string;
}

interface AttendanceStats {
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  average_hours: number;
  attendance_percentage: number;
}

interface AttendanceReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff[];
}

export default function AttendanceReportsModal({ isOpen, onClose, staff }: AttendanceReportsModalProps) {
  const [selectedStaff, setSelectedStaff] = useState<number[]>([]);
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });
  const [department, setDepartment] = useState('');
  const [reportType, setReportType] = useState<'summary' | 'detailed' | 'monthly'>('summary');
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAttendanceData();
    }
  }, [isOpen, dateRange, selectedStaff, department]);

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('start_date', dateRange.start_date);
      params.append('end_date', dateRange.end_date);
      
      if (department) {
        params.append('department', department);
      }

      const response = await fetch(`/api/attendance?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        let filteredData = data.data;
        
        // Filter by selected staff if any
        if (selectedStaff.length > 0) {
          filteredData = filteredData.filter((record: AttendanceRecord) => 
            selectedStaff.includes(record.staff_id)
          );
        }
        
        setAttendanceData(filteredData);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStaffStats = (staffId: number): AttendanceStats => {
    const staffRecords = attendanceData.filter(record => record.staff_id === staffId);
    const totalDays = new Date(dateRange.end_date).getTime() - new Date(dateRange.start_date).getTime();
    const workingDays = Math.ceil(totalDays / (1000 * 60 * 60 * 24)) + 1;
    
    const presentDays = staffRecords.filter(r => r.status === 'present').length;
    const absentDays = staffRecords.filter(r => r.status === 'absent').length;
    const lateDays = staffRecords.filter(r => r.status === 'late').length;
    
    const totalHours = staffRecords.reduce((sum, r) => sum + (r.total_hours_worked || 0), 0);
    const averageHours = staffRecords.length > 0 ? totalHours / staffRecords.length : 0;
    
    const attendancePercentage = workingDays > 0 ? (presentDays / workingDays) * 100 : 0;
    
    return {
      total_days: workingDays,
      present_days: presentDays,
      absent_days: absentDays,
      late_days: lateDays,
      average_hours: averageHours,
      attendance_percentage: attendancePercentage,
    };
  };

  const getOverallStats = () => {
    const uniqueStaff = [...new Set(attendanceData.map(r => r.staff_id))];
    const stats = uniqueStaff.map(staffId => getStaffStats(staffId));
    
    return {
      total_staff: uniqueStaff.length,
      average_attendance: stats.reduce((sum, s) => sum + s.attendance_percentage, 0) / stats.length || 0,
      total_present: stats.reduce((sum, s) => sum + s.present_days, 0),
      total_absent: stats.reduce((sum, s) => sum + s.absent_days, 0),
      average_hours: stats.reduce((sum, s) => sum + s.average_hours, 0) / stats.length || 0,
    };
  };

  const generateCSV = () => {
    const headers = [
      'Employee ID',
      'Name',
      'Department',
      'Date',
      'Check In',
      'Check Out',
      'Hours Worked',
      'Status',
      'Attendance Type'
    ];

    const csvContent = [
      headers.join(','),
      ...attendanceData.map(record => [
        record.employee_id,
        `"${record.first_name} ${record.last_name}"`,
        record.department,
        record.attendance_date,
        record.check_in_time || '',
        record.check_out_time || '',
        record.total_hours_worked || 0,
        record.status,
        record.attendance_type
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${dateRange.start_date}-to-${dateRange.end_date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const generateSummaryCSV = () => {
    const headers = [
      'Employee ID',
      'Name',
      'Department',
      'Total Days',
      'Present Days',
      'Absent Days',
      'Late Days',
      'Attendance %',
      'Average Hours'
    ];

    const uniqueStaff = [...new Set(attendanceData.map(r => r.staff_id))];
    const csvContent = [
      headers.join(','),
      ...uniqueStaff.map(staffId => {
        const staff = staff.find(s => s.id === staffId);
        const stats = getStaffStats(staffId);
        return [
          staff?.employee_id || '',
          `"${staff?.first_name} ${staff?.last_name}"`,
          staff?.department || '',
          stats.total_days,
          stats.present_days,
          stats.absent_days,
          stats.late_days,
          stats.attendance_percentage.toFixed(1),
          stats.average_hours.toFixed(1)
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-summary-${dateRange.start_date}-to-${dateRange.end_date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const overallStats = getOverallStats();

  const sidebarCollapsed = useMemo(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    }
    return false;
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={`fixed top-0 bottom-0 right-0 bg-black bg-opacity-50 z-[60] transition-all duration-300 ${
      sidebarCollapsed ? 'left-16' : 'left-56'
    }`} style={{ width: sidebarCollapsed ? 'calc(100% - 64px)' : 'calc(100% - 224px)' }}>
      <div className="bg-white shadow-2xl w-full h-full overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl  text-gray-900">Attendance Reports</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.start_date}
                onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.end_date}
                onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Departments</option>
                <option value="Teaching">Teaching</option>
                <option value="Administration">Administration</option>
                <option value="Support">Support</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="summary">Summary Report</option>
                <option value="detailed">Detailed Report</option>
                <option value="monthly">Monthly Report</option>
              </select>
            </div>
          </div>

          {/* Overall Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Staff</p>
                  <p className="text-xl text-blue-900">{overallStats.total_staff}</p>
                </div>
                <FiUsers className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Avg Attendance</p>
                  <p className="text-xl text-green-900">{overallStats.average_attendance.toFixed(1)}%</p>
                </div>
                <FiTrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600">Total Present</p>
                  <p className="text-xl text-yellow-900">{overallStats.total_present}</p>
                </div>
                <FiClock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Total Absent</p>
                  <p className="text-xl text-red-900">{overallStats.total_absent}</p>
                </div>
                <FiTrendingDown className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={generateCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FiDownload className="w-4 h-4" />
              Export Detailed CSV
            </button>
            <button
              onClick={generateSummaryCSV}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FiDownload className="w-4 h-4" />
              Export Summary CSV
            </button>
          </div>

          {/* Report Content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : reportType === 'summary' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Staff Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Present Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Absent Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Late Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attendance %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Hours
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[...new Set(attendanceData.map(r => r.staff_id))].map(staffId => {
                    const staffMember = staff.find(s => s.id === staffId);
                    const stats = getStaffStats(staffId);
                    
                    return (
                      <tr key={staffId}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {staffMember?.first_name} {staffMember?.last_name}
                            </div>
                            <div className="text-sm text-gray-500">{staffMember?.employee_id}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {staffMember?.department}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {stats.present_days}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {stats.absent_days}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {stats.late_days}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`font-medium ${
                            stats.attendance_percentage >= 90 ? 'text-green-600' :
                            stats.attendance_percentage >= 80 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {stats.attendance_percentage.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {stats.average_hours.toFixed(1)}h
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
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
                      Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendanceData.map((record) => (
                    <tr key={record.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {record.first_name} {record.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{record.employee_id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(record.attendance_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.check_in_time || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.check_out_time || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.total_hours_worked?.toFixed(1) || '-'}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          record.status === 'present' ? 'bg-green-100 text-green-800' :
                          record.status === 'absent' ? 'bg-red-100 text-red-800' :
                          record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {record.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}







