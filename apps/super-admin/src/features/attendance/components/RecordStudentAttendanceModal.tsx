'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiUser, FiCalendar } from 'react-icons/fi';
import { useDialog } from '@/shared/context/DialogContext';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_name?: string;
}

interface StudentAttendanceRecord {
  id: number;
  student_id: number;
  date: string;
  status: string;
  remarks?: string;
  first_name?: string;
  last_name?: string;
  admission_number?: string;
}

interface RecordStudentAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  students: Student[];
  editingRecord?: StudentAttendanceRecord | null;
}

export default function RecordStudentAttendanceModal({
  isOpen,
  onClose,
  onSuccess,
  students,
  editingRecord,
}: RecordStudentAttendanceModalProps) {
  const { confirm } = useDialog();
  const [formData, setFormData] = useState({
    student_id: '',
    date: new Date().toISOString().split('T')[0],
    status: 'present',
    remarks: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const filteredStudents = students.filter((s) => {
    const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
    return (
      fullName.includes(searchTerm.toLowerCase()) ||
      s.admission_number.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const selectedStudent = students.find((s) => s.id.toString() === formData.student_id);

  useEffect(() => {
    if (editingRecord) {
      setFormData({
        student_id: editingRecord.student_id.toString(),
        date: editingRecord.date,
        status: editingRecord.status,
        remarks: editingRecord.remarks || '',
      });
      const name = editingRecord.first_name
        ? `${editingRecord.first_name} ${editingRecord.last_name}`
        : '';
      setSearchTerm(name);
      setHasUnsavedChanges(false);
    } else {
      setFormData({
        student_id: '',
        date: new Date().toISOString().split('T')[0],
        status: 'present',
        remarks: '',
      });
      setSearchTerm('');
      setHasUnsavedChanges(false);
    }
    setError('');
  }, [editingRecord, isOpen]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleClose = async () => {
    if (hasUnsavedChanges) {
      const ok = await confirm('You have unsaved changes. Discard them?', {
        title: 'Discard changes',
        confirmLabel: 'Discard',
        type: 'warning',
      });
      if (!ok) return;
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.student_id) {
      setError('Please select a student');
      return;
    }
    if (!formData.date) {
      setError('Please select attendance date');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/attendance/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: parseInt(formData.student_id, 10),
          date: formData.date,
          status: formData.status,
          remarks: formData.remarks || null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || 'Failed to save attendance record');
      }
    } catch (err) {
      console.error('Error saving student attendance:', err);
      setError('An error occurred while saving attendance');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={modalContentRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {editingRecord ? 'Edit Student Attendance' : 'Record Student Attendance'}
          </h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FiUser className="inline w-4 h-4 mr-1" />
              Student
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowStudentDropdown(true);
                if (!editingRecord) {
                  setFormData((prev) => ({ ...prev, student_id: '' }));
                }
              }}
              onFocus={() => setShowStudentDropdown(true)}
              disabled={!!editingRecord}
              placeholder="Search by name or admission number..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
            />
            {showStudentDropdown && !editingRecord && filteredStudents.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {filteredStudents.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, student_id: student.id.toString() }));
                      setSearchTerm(`${student.first_name} ${student.last_name}`);
                      setShowStudentDropdown(false);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50"
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {student.first_name} {student.last_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {student.admission_number}
                      {student.class_name ? ` • ${student.class_name}` : ''}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {selectedStudent && (
              <p className="mt-1 text-xs text-gray-500">
                {selectedStudent.admission_number}
                {selectedStudent.class_name ? ` • ${selectedStudent.class_name}` : ''}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FiCalendar className="inline w-4 h-4 mr-1" />
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => handleInputChange('remarks', e.target.value)}
              rows={3}
              placeholder="Optional notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : editingRecord ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
