'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiClock, FiUser, FiCalendar, FiMapPin } from 'react-icons/fi';
import { useDialog } from '@/shared/context/DialogContext';

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
  break_start_time?: string;
  break_end_time?: string;
  status: string;
  attendance_type: string;
  device_id?: string;
  location?: string;
  remarks?: string;
}

interface RecordAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  staff: Staff[];
  editingRecord?: AttendanceRecord | null;
}

export default function RecordAttendanceModal({
  isOpen,
  onClose,
  onSuccess,
  staff,
  editingRecord
}: RecordAttendanceModalProps) {
  const { confirm } = useDialog();
  const [formData, setFormData] = useState({
    staff_id: '',
    attendance_date: new Date().toISOString().split('T')[0],
    check_in_time: '',
    check_out_time: '',
    break_start_time: '',
    break_end_time: '',
    status: 'present',
    attendance_type: 'manual',
    device_id: '',
    location: '',
    remarks: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const filteredStaff = staff.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedStaff = staff.find(s => s.id.toString() === formData.staff_id);

  useEffect(() => {
    if (editingRecord) {
      setFormData({
        staff_id: editingRecord.staff_id.toString(),
        attendance_date: editingRecord.attendance_date,
        check_in_time: editingRecord.check_in_time || '',
        check_out_time: editingRecord.check_out_time || '',
        break_start_time: editingRecord.break_start_time || '',
        break_end_time: editingRecord.break_end_time || '',
        status: editingRecord.status,
        attendance_type: editingRecord.attendance_type,
        device_id: editingRecord.device_id || '',
        location: editingRecord.location || '',
        remarks: editingRecord.remarks || '',
      });
      setSearchTerm(`${editingRecord.first_name} ${editingRecord.last_name}`);
      setHasUnsavedChanges(false);
    } else {
      setFormData({
        staff_id: '',
        attendance_date: new Date().toISOString().split('T')[0],
        check_in_time: '',
        check_out_time: '',
        break_start_time: '',
        break_end_time: '',
        status: 'present',
        attendance_type: 'manual',
        device_id: '',
        location: '',
        remarks: '',
      });
      setSearchTerm('');
      setHasUnsavedChanges(false);
    }
  }, [editingRecord, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleStaffSelect = (staff: Staff) => {
    setFormData(prev => ({ ...prev, staff_id: staff.id.toString() }));
    setSearchTerm(`${staff.first_name} ${staff.last_name}`);
    setShowStaffDropdown(false);
    setHasUnsavedChanges(true);
  };

  const calculateWorkingHours = () => {
    if (!formData.check_in_time || !formData.check_out_time) return 0;
    
    const checkIn = new Date(`2000-01-01T${formData.check_in_time}`);
    const checkOut = new Date(`2000-01-01T${formData.check_out_time}`);
    const breakStart = formData.break_start_time ? new Date(`2000-01-01T${formData.break_start_time}`) : null;
    const breakEnd = formData.break_end_time ? new Date(`2000-01-01T${formData.break_end_time}`) : null;
    
    let totalMinutes = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60);
    
    if (breakStart && breakEnd) {
      const breakMinutes = (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60);
      totalMinutes -= breakMinutes;
    }
    
    return Math.max(0, totalMinutes / 60);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.staff_id) {
      setError('Please select a staff member');
      return;
    }

    if (!formData.attendance_date) {
      setError('Please select attendance date');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          staff_id: parseInt(formData.staff_id),
          created_by: 1, // TODO: Get from auth context
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
        setHasUnsavedChanges(false);
      } else {
        setError(data.error || 'Failed to save attendance record');
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (hasUnsavedChanges) {
      const confirmed = await confirm('You have unsaved changes. Are you sure you want to close?', {
        title: 'Unsaved Changes',
        type: 'warning',
        confirmText: 'Close',
        cancelText: 'Keep Editing',
      });
      if (confirmed) onClose();
    } else {
      onClose();
    }
  };

  return (
    <AppModal open={isOpen} onClose={onClose}>
      <div
        ref={modalContentRef}
        className={APP_MODAL_PANEL}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl  text-gray-900">
            {editingRecord ? 'Edit Attendance Record' : 'Record Staff Attendance'}
          </h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Staff Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Staff Member <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowStaffDropdown(true);
                  if (e.target.value === '') {
                    setFormData(prev => ({ ...prev, staff_id: '' }));
                  }
                }}
                onFocus={() => setShowStaffDropdown(true)}
                placeholder="Search by name, employee ID, or department..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {showStaffDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredStaff.length === 0 ? (
                    <div className="px-3 py-2 text-gray-500">No staff found</div>
                  ) : (
                    filteredStaff.map((staffMember) => (
                      <button
                        key={staffMember.id}
                        type="button"
                        onClick={() => handleStaffSelect(staffMember)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-3"
                      >
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <FiUser className="w-4 h-4 text-primary-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {staffMember.first_name} {staffMember.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {staffMember.employee_id} • {staffMember.department}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {selectedStaff && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <FiUser className="w-4 h-4 text-primary-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {selectedStaff.first_name} {selectedStaff.last_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {selectedStaff.employee_id} • {selectedStaff.department}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attendance Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="date"
                value={formData.attendance_date}
                onChange={(e) => handleInputChange('attendance_date', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>

          {/* Time Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Check In Time
              </label>
              <div className="relative">
                <FiClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="time"
                  value={formData.check_in_time}
                  onChange={(e) => handleInputChange('check_in_time', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Check Out Time
              </label>
              <div className="relative">
                <FiClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="time"
                  value={formData.check_out_time}
                  onChange={(e) => handleInputChange('check_out_time', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Break Start Time
              </label>
              <div className="relative">
                <FiClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="time"
                  value={formData.break_start_time}
                  onChange={(e) => handleInputChange('break_start_time', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Break End Time
              </label>
              <div className="relative">
                <FiClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="time"
                  value={formData.break_end_time}
                  onChange={(e) => handleInputChange('break_end_time', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Working Hours Display */}
          {formData.check_in_time && formData.check_out_time && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-center gap-2">
                <FiClock className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-800">
                  Total Working Hours: {calculateWorkingHours().toFixed(1)} hours
                </span>
              </div>
            </div>
          )}

          {/* Status and Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="half_day">Half Day</option>
                <option value="on_leave">On Leave</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attendance Type
              </label>
              <select
                value={formData.attendance_type}
                onChange={(e) => handleInputChange('attendance_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="manual">Manual Entry</option>
                <option value="punch_machine">Punch Machine</option>
                <option value="biometric">Biometric</option>
                <option value="mobile_app">Mobile App</option>
              </select>
            </div>
          </div>

          {/* Device and Location */}
          {(formData.attendance_type === 'punch_machine' || formData.attendance_type === 'biometric') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Device ID
                </label>
                <input
                  type="text"
                  value={formData.device_id}
                  onChange={(e) => handleInputChange('device_id', e.target.value)}
                  placeholder="Enter device ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <div className="relative">
                  <FiMapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="Enter location"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Remarks
            </label>
            <textarea
              value={formData.remarks}
              onChange={(e) => handleInputChange('remarks', e.target.value)}
              placeholder="Enter any additional remarks..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : editingRecord ? 'Update Record' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </AppModal>
  );
}







