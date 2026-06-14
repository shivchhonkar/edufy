'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { FiX, FiChevronDown, FiSearch } from 'react-icons/fi';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';

interface AddTransportAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingAssignment?: any | null;
}

interface Student {
  id: number;
  admission_number: string;
  first_name: string;
  last_name: string;
  class_name?: string;
  section_name?: string;
}

interface Route {
  id: number;
  route_name: string;
  route_number?: string;
  monthly_fee?: number;
}

interface RouteStop {
  id: number;
  stop_name: string;
  pickup_fee?: number;
}

interface ClassOption {
  id: number;
  name: string;
}

interface SectionOption {
  id: number;
  class_id?: number;
  name: string;
}

const STUDENTS_FETCH_LIMIT = 5000;

export default function AddTransportAssignmentModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  editingAssignment 
}: AddTransportAssignmentModalProps) {
  const sidebarCollapsed = useMemo(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    }
    return false;
  }, [isOpen]);

  const modalContentRef = useRef<HTMLDivElement>(null);
  const studentDropdownRef = useRef<HTMLDivElement>(null);
  const routeDropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    student_ids: [] as string[], // Changed to array for multiple selection
    route_id: '',
    stop_id: '',
    transport_fee: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    status: 'active' as 'active' | 'inactive',
  });

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classFilter, setClassFilter] = useState('');
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [sectionFilter, setSectionFilter] = useState('');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [assignedStudentIds, setAssignedStudentIds] = useState<number[]>([]);
  const [studentAssignments, setStudentAssignments] = useState<{ [studentId: number]: { route_name: string, route_number?: string } }>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [loadingStops, setLoadingStops] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [initialFormData, setInitialFormData] = useState(formData);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  const [studentSearchInput, setStudentSearchInput] = useState('');
  const [routeSearchInput, setRouteSearchInput] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [showRouteDropdown, setShowRouteDropdown] = useState(false);
  const [hideAssignedStudents, setHideAssignedStudents] = useState(true);
  const [selectedStudentDetails, setSelectedStudentDetails] = useState<Student[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchClasses();
      fetchRoutes();
      fetchAssignedStudents();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !editingAssignment) {
      fetchStudents(classFilter, sectionFilter);
    }
  }, [isOpen, classFilter, sectionFilter, editingAssignment]);

  useEffect(() => {
    if (!classFilter) {
      setSections([]);
      setSectionFilter('');
      return;
    }

    fetchSections(classFilter);
  }, [classFilter]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (studentDropdownRef.current && !studentDropdownRef.current.contains(event.target as Node)) {
        setShowStudentDropdown(false);
      }
      if (routeDropdownRef.current && !routeDropdownRef.current.contains(event.target as Node)) {
        setShowRouteDropdown(false);
      }
    };

    if (showStudentDropdown || showRouteDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showStudentDropdown, showRouteDropdown]);

  useEffect(() => {
    if (formData.route_id) {
      fetchStops(formData.route_id);
    } else {
      setStops([]);
      setFormData({ ...formData, stop_id: '' });
    }
  }, [formData.route_id]);

  useEffect(() => {
    if (editingAssignment) {
      const data = {
        student_ids: editingAssignment.student_id ? [editingAssignment.student_id.toString()] : [],
        route_id: editingAssignment.route_id?.toString() || '',
        stop_id: editingAssignment.stop_id?.toString() || '',
        transport_fee: editingAssignment.transport_fee?.toString() || '',
        start_date: editingAssignment.start_date ? editingAssignment.start_date.split('T')[0] : '',
        end_date: editingAssignment.end_date ? editingAssignment.end_date.split('T')[0] : '',
        status: editingAssignment.status || 'active',
      };
      setFormData(data);
      setInitialFormData(data);
    } else {
      const data = {
        student_ids: [] as string[],
        route_id: '',
        stop_id: '',
        transport_fee: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        status: 'active' as 'active' | 'inactive',
      };
      setFormData(data);
      setInitialFormData(data);
    }
    setError('');
    setStudentSearchInput('');
    setRouteSearchInput('');
    setClassFilter('');
    setSectionFilter('');
    setSections([]);
    setSelectedStudentDetails([]);
  }, [editingAssignment, isOpen]);

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes');
      const data = await response.json();
      if (data.success) {
        setClasses(data.data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchStudents = async (selectedClassId = '', selectedSectionId = '') => {
    setLoadingStudents(true);
    try {
      const params = new URLSearchParams({
        status: 'active',
        limit: String(STUDENTS_FETCH_LIMIT),
        page: '1',
      });
      if (selectedClassId) {
        params.set('class_id', selectedClassId);
      }
      if (selectedSectionId) {
        params.set('section_id', selectedSectionId);
      }

      const response = await fetch(`/api/students?${params}`);
      const data = await response.json();
      if (data.success) {
        setStudents(data.data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchSections = async (classId: string) => {
    try {
      const response = await fetch(`/api/sections?class_id=${classId}`);
      const data = await response.json();
      if (data.success) {
        setSections(data.data);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const fetchAssignedStudents = async () => {
    try {
      // Fetch all active transport assignments to get assigned student IDs
      const response = await fetch('/api/transport/assignments?status=active&limit=1000');
      const data = await response.json();
      if (data.success) {
        // Extract student IDs from assignments (exclude current editing student)
        const assignedIds = data.data
          .filter((assignment: any) => !editingAssignment || assignment.student_id !== editingAssignment.student_id)
          .map((assignment: any) => assignment.student_id);
        setAssignedStudentIds(assignedIds);

        // Create a map of student_id -> route info
        const assignmentMap: { [studentId: number]: { route_name: string, route_number?: string } } = {};
        data.data.forEach((assignment: any) => {
          if (!editingAssignment || assignment.student_id !== editingAssignment.student_id) {
            assignmentMap[assignment.student_id] = {
              route_name: assignment.route_name,
              route_number: assignment.route_number,
            };
          }
        });
        setStudentAssignments(assignmentMap);
      }
    } catch (error) {
      console.error('Error fetching assigned students:', error);
    }
  };

  const fetchRoutes = async () => {
    setLoadingRoutes(true);
    try {
      const response = await fetch('/api/transport/routes?status=active');
      const data = await response.json();
      if (data.success) {
        setRoutes(data.data);
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
    } finally {
      setLoadingRoutes(false);
    }
  };

  const fetchStops = async (routeId: string) => {
    setLoadingStops(true);
    try {
      const response = await fetch(`/api/transport/routes/${routeId}`);
      const data = await response.json();
      if (data.success && data.data.stops) {
        setStops(data.data.stops);
      }
    } catch (error) {
      console.error('Error fetching stops:', error);
    } finally {
      setLoadingStops(false);
    }
  };

  const hasUnsavedChanges = JSON.stringify(formData) !== JSON.stringify(initialFormData);

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowCancelConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelConfirm(false);
    onClose();
  };

  // Filter students based on search
  const filteredStudents = students.filter(student => {
    const searchLower = studentSearchInput.toLowerCase();
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    const parentPhone = (student as any).parent_phone?.toLowerCase() || '';
    
    const matchesSearch = (
      fullName.includes(searchLower) ||
      student.admission_number.toLowerCase().includes(searchLower) ||
      parentPhone.includes(searchLower)
    );

    // Optionally hide already assigned students
    const isAlreadyAssigned = assignedStudentIds.includes(student.id);
    if (hideAssignedStudents && isAlreadyAssigned) {
      return false;
    }
    
    return matchesSearch;
  });

  // Filter routes based on search
  const filteredRoutes = routes.filter(route => {
    const searchLower = routeSearchInput.toLowerCase();
    const routeNumber = route.route_number?.toLowerCase() || '';
    
    return (
      route.route_name.toLowerCase().includes(searchLower) ||
      routeNumber.includes(searchLower)
    );
  });

  // Get selected students details
  const selectedStudents = editingAssignment
    ? students.filter((s) => formData.student_ids.includes(s.id.toString()))
    : selectedStudentDetails;
  const availableStudents = students.filter((student) => !assignedStudentIds.includes(student.id));
  const selectedClassName = classes.find((cls) => cls.id.toString() === classFilter)?.name;
  const selectedSectionName = sections.find((section) => section.id.toString() === sectionFilter)?.name;
  const filterScopeLabel = [selectedClassName, selectedSectionName].filter(Boolean).join(' · ');

  // Get selected route details
  const selectedRoute = routes.find(r => r.id.toString() === formData.route_id);

  // Handle student selection (toggle)
  const handleToggleStudent = (studentId: string) => {
    // Check if student is already assigned to transport
    const isAlreadyAssigned = assignedStudentIds.includes(parseInt(studentId));
    if (isAlreadyAssigned) {
      return; // Don't allow selection
    }

    const student = students.find((item) => item.id.toString() === studentId);
    const isSelected = formData.student_ids.includes(studentId);
    if (isSelected) {
      setFormData({
        ...formData,
        student_ids: formData.student_ids.filter((id) => id !== studentId),
      });
      setSelectedStudentDetails((prev) => prev.filter((item) => item.id.toString() !== studentId));
    } else if (student) {
      setFormData({
        ...formData,
        student_ids: [...formData.student_ids, studentId],
      });
      setSelectedStudentDetails((prev) =>
        prev.some((item) => item.id === student.id) ? prev : [...prev, student]
      );
    }
  };

  // Remove a selected student
  const handleRemoveStudent = (studentId: string) => {
    setFormData({
      ...formData,
      student_ids: formData.student_ids.filter((id) => id !== studentId),
    });
    setSelectedStudentDetails((prev) => prev.filter((item) => item.id.toString() !== studentId));
  };

  // Handle route selection
  const handleSelectRoute = (routeId: string) => {
    const route = routes.find(r => r.id.toString() === routeId);
    setFormData({
      ...formData,
      route_id: routeId,
      stop_id: '',
      transport_fee: route?.monthly_fee != null ? String(route.monthly_fee) : '',
    });
    setShowRouteDropdown(false);
    setRouteSearchInput('');
  };

  // Handle ESC key to close dropdowns
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowStudentDropdown(false);
        setShowRouteDropdown(false);
      }
    };

    if (showStudentDropdown || showRouteDropdown) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [showStudentDropdown, showRouteDropdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.student_ids.length === 0 || !formData.route_id || !formData.start_date) {
      setError('At least one student, route, and start date are required');
      return;
    }

    setSubmitting(true);

    try {
      if (editingAssignment) {
        // Edit single assignment
        const url = `/api/transport/assignments/${editingAssignment.id}`;
        const response = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            route_id: parseInt(formData.route_id),
            stop_id: formData.stop_id ? parseInt(formData.stop_id) : null,
            transport_fee: formData.transport_fee ? parseFloat(formData.transport_fee) : null,
            start_date: formData.start_date,
            end_date: formData.end_date || null,
            status: formData.status,
          }),
        });

        const data = await response.json();
        if (data.success) {
          onSuccess();
          onClose();
        } else {
          setError(data.error || 'Failed to update assignment');
        }
      } else {
        const response = await fetch('/api/transport/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_ids: formData.student_ids.map((id) => parseInt(id, 10)),
            route_id: parseInt(formData.route_id, 10),
            stop_id: formData.stop_id ? parseInt(formData.stop_id, 10) : null,
            transport_fee: formData.transport_fee ? parseFloat(formData.transport_fee) : null,
            start_date: formData.start_date,
            end_date: formData.end_date || null,
          }),
        });

        const data = await response.json();
        if (data.success) {
          onSuccess();
          if (data.skipped_count > 0) {
            setError(data.message || `${data.created_count} assigned, ${data.skipped_count} already on transport`);
          } else {
            onClose();
          }
        } else {
          setError(data.error || 'Failed to assign students');
        }
      }
    } catch (error) {
      console.error('Error saving assignment:', error);
      setError('An error occurred while saving assignment');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed top-0 bottom-0 right-0 bg-black bg-opacity-50 z-[60] transition-all duration-300 ${
      sidebarCollapsed ? 'left-16' : 'left-56'
    }`} style={{ width: sidebarCollapsed ? 'calc(100% - 64px)' : 'calc(100% - 224px)' }}>
      <div ref={modalContentRef} className="bg-white shadow-2xl w-full h-full overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-3 flex justify-between items-center z-10 shadow-sm">
          <h2 className="text-lg sm:text-xl text-gray-900">
            {editingAssignment ? 'Edit Transport Assignment' : 'Assign Student to Transport'}
          </h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            type="button"
          >
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Student Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Student Information</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {editingAssignment ? 'Student' : 'Select Students'} <span className="text-red-500">*</span>
                </label>
                
                {editingAssignment ? (
                  <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-900">
                    {selectedStudents[0] ? (
                      <span>
                        {selectedStudents[0].admission_number} - {selectedStudents[0].first_name} {selectedStudents[0].last_name}
                        {selectedStudents[0].class_name ? ` (${selectedStudents[0].class_name})` : ''}
                      </span>
                    ) : (
                      'Student not found'
                    )}
                  </div>
                ) : (
                  <div ref={studentDropdownRef}>
                    {/* Selected Students Chips */}
                    {selectedStudents.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {selectedStudents.map(student => (
                          <div 
                            key={student.id}
                            className="flex items-center space-x-1 px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm"
                          >
                            <span>{student.first_name} {student.last_name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveStudent(student.id.toString())}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              <FiX size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mb-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="transport-student-class-filter" className="block text-xs font-medium text-gray-600 mb-1">
                          Filter by class
                        </label>
                        <select
                          id="transport-student-class-filter"
                          value={classFilter}
                          onChange={(e) => {
                            setClassFilter(e.target.value);
                            setSectionFilter('');
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm text-gray-900 bg-white"
                        >
                          <option value="">All classes</option>
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="transport-student-section-filter" className="block text-xs font-medium text-gray-600 mb-1">
                          Filter by section
                        </label>
                        <select
                          id="transport-student-section-filter"
                          value={sectionFilter}
                          onChange={(e) => setSectionFilter(e.target.value)}
                          disabled={!classFilter}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm text-gray-900 bg-white disabled:bg-gray-50 disabled:cursor-not-allowed"
                        >
                          <option value="">
                            {!classFilter ? 'Select class first' : 'All sections'}
                          </option>
                          {sections.map((section) => (
                            <option key={section.id} value={section.id}>
                              {section.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Search Input Field */}
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-3 text-gray-400" size={16} />
                      <input
                        type="text"
                        placeholder="Type to search students by name, admission number, or phone..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                        value={studentSearchInput}
                        onChange={(e) => setStudentSearchInput(e.target.value)}
                        onFocus={() => setShowStudentDropdown(true)}
                      />
                    </div>

                    {/* Dropdown with filtered students */}
                    {showStudentDropdown && (
                      <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-xl max-h-80 overflow-hidden">
                        <div className="p-2 border-b bg-gray-50">
                          <div className="flex items-center justify-between gap-2">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={hideAssignedStudents}
                                onChange={(e) => setHideAssignedStudents(e.target.checked)}
                                className="w-3.5 h-3.5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              />
                              <span className="text-xs text-gray-600">Hide already assigned</span>
                            </label>
                            <p className="text-xs text-gray-600">
                              {filteredStudents.length} result{filteredStudents.length !== 1 ? 's' : ''}
                              {filterScopeLabel ? ` in ${filterScopeLabel}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {loadingStudents ? (
                            <div className="p-4 text-center text-gray-500">Loading students...</div>
                          ) : filteredStudents.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                              {studentSearchInput
                                ? `No students found matching "${studentSearchInput}"`
                                : filterScopeLabel
                                  ? `No students found in ${filterScopeLabel}`
                                  : 'Select a class or start typing to search students'}
                            </div>
                          ) : (
                            filteredStudents.map((student) => {
                              const isSelected = formData.student_ids.includes(student.id.toString());
                              const isAlreadyAssigned = assignedStudentIds.includes(student.id);
                              const assignedRoute = studentAssignments[student.id];
                              
                              return (
                                <div
                                  key={student.id}
                                  className={`px-4 py-2 transition-colors ${
                                    isAlreadyAssigned 
                                      ? 'bg-gray-100 cursor-not-allowed opacity-60' 
                                      : isSelected 
                                        ? 'bg-primary-100 cursor-pointer hover:bg-primary-50' 
                                        : 'cursor-pointer hover:bg-primary-50'
                                  }`}
                                  onClick={() => !isAlreadyAssigned && handleToggleStudent(student.id.toString())}
                                  title={isAlreadyAssigned ? `Student already assigned to ${assignedRoute?.route_name || 'a route'}` : ''}
                                >
                                  <div className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      disabled={isAlreadyAssigned}
                                      onChange={() => {}}
                                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 mr-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <div className="flex-1">
                                      <div className={`text-sm font-medium ${isAlreadyAssigned ? 'text-gray-500' : 'text-gray-900'}`}>
                                        {student.admission_number} - {student.first_name} {student.last_name}
                                        {isAlreadyAssigned && assignedRoute && (
                                          <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                            📍 {assignedRoute.route_name}{assignedRoute.route_number ? ` (${assignedRoute.route_number})` : ''}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {[student.class_name, student.section_name].filter(Boolean).join(' · ') ||
                                          'No class'}
                                        {(student as any).parent_phone && ` • ${(student as any).parent_phone}`}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                        
                        {/* Footer with stats and done button */}
                        <div className="p-2 border-t bg-gray-50">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                              {selectedStudents.length > 0 && (
                                <span className="text-xs font-medium text-primary-700">
                                  ✓ {selectedStudents.length} selected
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                {availableStudents.length} available
                                {filterScopeLabel ? ` in ${filterScopeLabel}` : ''}
                                {assignedStudentIds.length > 0 && !hideAssignedStudents && (
                                  <span className="ml-1 text-red-600">
                                    • {students.filter(s => assignedStudentIds.includes(s.id)).length} assigned
                                  </span>
                                )}
                              </span>
                            </div>
                            {selectedStudents.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setShowStudentDropdown(false)}
                                className="px-3 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
                              >
                                Done
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {editingAssignment && (
                  <p className="text-xs text-gray-500 mt-1">
                    Student cannot be changed. Delete and create new assignment to change student.
                  </p>
                )}
                {!editingAssignment && (
                  <div className="mt-1 space-y-1">
                    <p className="text-xs text-gray-500">
                      ✓ Filter by class and section first, then search or select students for the same route
                    </p>
                    {assignedStudentIds.length > 0 && (
                      <p className="text-xs text-amber-600">
                        ⓘ Students with active assignments show their assigned route and are {hideAssignedStudents ? 'hidden' : 'disabled'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Route & Stop Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Route Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative" ref={routeDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Route <span className="text-red-500">*</span>
                </label>
                
                {/* Selected Route Display */}
                {selectedRoute && (
                  <div className="mb-2 flex items-center justify-between px-3 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm">
                    <span>
                      <strong>{selectedRoute.route_name}</strong>
                      {selectedRoute.route_number && <span className="ml-1 text-blue-600">({selectedRoute.route_number})</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, route_id: '', stop_id: '' });
                        setRouteSearchInput('');
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <FiX size={16} />
                    </button>
                  </div>
                )}

                {/* Search Input Field */}
                <div className="relative">
                  <FiSearch className="absolute left-3 top-3 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Type to search routes by name or number..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                    value={routeSearchInput}
                    onChange={(e) => setRouteSearchInput(e.target.value)}
                    onFocus={() => setShowRouteDropdown(true)}
                  />
                </div>

                {/* Dropdown with filtered routes */}
                {showRouteDropdown && filteredRoutes.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-xl max-h-80 overflow-hidden">
                    {routeSearchInput && (
                      <div className="px-3 py-2 border-b bg-gray-50">
                        <p className="text-xs text-gray-600">
                          {filteredRoutes.length} route{filteredRoutes.length !== 1 ? 's' : ''} found
                        </p>
                      </div>
                    )}
                    <div className="max-h-64 overflow-y-auto">
                      {loadingRoutes ? (
                        <div className="p-4 text-center text-gray-500">Loading routes...</div>
                      ) : (
                        filteredRoutes.map((route) => (
                          <div
                            key={route.id}
                            className="px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-100 last:border-0"
                            onClick={() => handleSelectRoute(route.id.toString())}
                          >
                            <div className="text-sm font-medium text-gray-900">
                              {route.route_name}
                            </div>
                            {route.route_number && (
                              <div className="text-xs text-gray-500">
                                Route Number: {route.route_number}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Stop (Optional)
                </label>
                <select
                  disabled={!formData.route_id || loadingStops}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={formData.stop_id}
                  onChange={(e) => {
                    const selectedStop = stops.find(s => s.id.toString() === e.target.value);
                    const routeFee = selectedRoute?.monthly_fee != null ? String(selectedRoute.monthly_fee) : '';
                    setFormData({
                      ...formData,
                      stop_id: e.target.value,
                      transport_fee: selectedStop?.pickup_fee != null
                        ? String(selectedStop.pickup_fee)
                        : routeFee,
                    });
                  }}
                >
                  <option value="">-- Select Stop --</option>
                  {loadingStops ? (
                    <option value="">Loading stops...</option>
                  ) : (
                    stops.map((stop) => (
                      <option key={stop.id} value={stop.id}>
                        {stop.stop_name} {stop.pickup_fee ? `(₹${stop.pickup_fee})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Fee & Dates */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Fee & Duration</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Transport Fee (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.transport_fee}
                  onChange={(e) => setFormData({ ...formData, transport_fee: e.target.value })}
                  placeholder="Auto-fills from stop or route"
                />
                <p className="text-xs text-gray-500 mt-1">Leave as-is to use stop/route default fee</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Status (only when editing) */}
          {editingAssignment && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assignment Status
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="sticky bottom-0 bg-white border-t pt-4 pb-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting 
                ? (editingAssignment ? 'Updating...' : `Assigning ${formData.student_ids.length} student(s)...`) 
                : (editingAssignment 
                    ? 'Update Assignment' 
                    : `Assign ${formData.student_ids.length || ''} Student${formData.student_ids.length !== 1 ? 's' : ''}`)}
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Dialog for Unsaved Changes */}
      <ConfirmDialog
        isOpen={showCancelConfirm}
        title="Discard Changes?"
        message="You have unsaved changes. Are you sure you want to close this form? All changes will be lost."
        confirmText="Discard Changes"
        cancelText="Continue Editing"
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelConfirm(false)}
        type="warning"
      />
    </div>
  );
}

