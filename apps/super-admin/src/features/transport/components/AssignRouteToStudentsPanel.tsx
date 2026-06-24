'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiFilter,
  FiMapPin,
  FiSearch,
  FiUsers,
} from 'react-icons/fi';
import { useDialog } from '@/shared/context/DialogContext';

type WizardStep = 1 | 2 | 3;

interface RouteListItem {
  id: number;
  route_name: string;
  route_number?: string;
  starting_point?: string;
  ending_point?: string;
  estimated_time?: number;
  total_students?: number;
}

interface RouteStop {
  id: number;
  stop_name: string;
  stop_order: number;
  arrival_time?: string;
  pickup_fee?: number | string;
}

interface RouteDetail extends RouteListItem {
  monthly_fee?: number | string | null;
  stops: RouteStop[];
}

interface VehicleAssignment {
  vehicle_number: string;
  vehicle_type?: string;
  model?: string;
  capacity?: number;
  driver_name?: string;
}

interface StudentRow {
  id: number;
  admission_number: string;
  first_name: string;
  last_name: string;
  class_name?: string;
  section_name?: string;
  photo_url?: string;
}

interface RouteAssignmentRow {
  student_id: number;
  stop_name?: string;
  stop_id?: number;
  status: string;
}

interface AssignRouteToStudentsPanelProps {
  onAssigned?: () => void;
}

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 1, label: 'Select Route' },
  { id: 2, label: 'Select Students' },
  { id: 3, label: 'Review & Confirm' },
];

function formatTime(value?: string | null): string {
  if (!value) return '—';
  return value.length > 5 ? value.substring(0, 5) : value;
}

function studentInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export default function AssignRouteToStudentsPanel({ onAssigned }: AssignRouteToStudentsPanelProps) {
  const { alert } = useDialog();
  const [step, setStep] = useState<WizardStep>(1);
  const [routes, setRoutes] = useState<RouteListItem[]>([]);
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [routeId, setRouteId] = useState('');
  const [stopId, setStopId] = useState('');
  const [routeDetail, setRouteDetail] = useState<RouteDetail | null>(null);
  const [vehicleAssignment, setVehicleAssignment] = useState<VehicleAssignment | null>(null);
  const [routeStudentAssignments, setRouteStudentAssignments] = useState<RouteAssignmentRow[]>([]);
  const [allTransportStudentIds, setAllTransportStudentIds] = useState<number[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [sections, setSections] = useState<{ id: number; name: string }[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [loadingRouteDetail, setLoadingRouteDetail] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoadingRoutes(true);
      try {
        const [routesRes, classesRes, assignedRes] = await Promise.all([
          fetch('/api/transport/routes?status=active'),
          fetch('/api/classes'),
          fetch('/api/transport/assignments?status=active'),
        ]);
        const routesData = await routesRes.json();
        const classesData = await classesRes.json();
        const assignedData = await assignedRes.json();
        if (routesData.success) setRoutes(routesData.data);
        if (classesData.success) setClasses(classesData.data);
        if (assignedData.success) {
          setAllTransportStudentIds(
            assignedData.data.map((row: { student_id: number }) => row.student_id),
          );
        }
      } finally {
        setLoadingRoutes(false);
      }
    };
    load();
  }, []);

  const loadRouteContext = useCallback(async (selectedRouteId: string) => {
    if (!selectedRouteId) {
      setRouteDetail(null);
      setVehicleAssignment(null);
      setRouteStudentAssignments([]);
      return;
    }

    setLoadingRouteDetail(true);
    try {
      const [routeRes, vehicleRes, assignmentsRes] = await Promise.all([
        fetch(`/api/transport/routes/${selectedRouteId}`),
        fetch(`/api/transport/route-assignments?route_id=${selectedRouteId}&status=active`),
        fetch(`/api/transport/assignments?route_id=${selectedRouteId}&status=active`),
      ]);
      const routeData = await routeRes.json();
      const vehicleData = await vehicleRes.json();
      const assignmentsData = await assignmentsRes.json();

      if (routeData.success) setRouteDetail(routeData.data);
      if (vehicleData.success && vehicleData.data.length > 0) {
        setVehicleAssignment(vehicleData.data[0]);
      } else {
        setVehicleAssignment(null);
      }
      if (assignmentsData.success) {
        setRouteStudentAssignments(assignmentsData.data);
      }
    } finally {
      setLoadingRouteDetail(false);
    }
  }, []);

  useEffect(() => {
    setStopId('');
    setSelectedStudentIds([]);
    setStep(routeId ? 2 : 1);
    loadRouteContext(routeId);
  }, [routeId, loadRouteContext]);

  useEffect(() => {
    if (routeId && step === 1) {
      setStep(2);
    }
  }, [routeId, step]);

  useEffect(() => {
    if (!classFilter) {
      setSections([]);
      setSectionFilter('');
      return;
    }

    const loadSections = async () => {
      try {
        const res = await fetch(`/api/sections?class_id=${classFilter}`);
        const data = await res.json();
        if (data.success) {
          setSections(data.data);
        }
      } catch {
        setSections([]);
      }
    };
    loadSections();
    setSectionFilter('');
  }, [classFilter]);

  useEffect(() => {
    const loadStudents = async () => {
      setLoadingStudents(true);
      try {
        const params = new URLSearchParams({
          status: 'active',
          limit: '5000',
          page: '1',
        });
        if (studentSearch.trim()) params.set('search', studentSearch.trim());
        if (classFilter) params.set('class_id', classFilter);
        if (sectionFilter) params.set('section_id', sectionFilter);

        const res = await fetch(`/api/students?${params}`);
        const data = await res.json();
        if (data.success) setStudents(data.data);
      } finally {
        setLoadingStudents(false);
      }
    };

    const timer = window.setTimeout(loadStudents, 250);
    return () => window.clearTimeout(timer);
  }, [studentSearch, classFilter, sectionFilter]);

  const selectedRoute = routes.find((r) => r.id.toString() === routeId);
  const selectedStop = routeDetail?.stops.find((s) => s.id.toString() === stopId);

  const transportFee = useMemo(() => {
    if (selectedStop?.pickup_fee != null && selectedStop.pickup_fee !== '') {
      return parseFloat(String(selectedStop.pickup_fee));
    }
    if (routeDetail?.monthly_fee != null) {
      return parseFloat(String(routeDetail.monthly_fee));
    }
    return 0;
  }, [selectedStop, routeDetail]);

  const studentsOnRoute = useMemo(() => {
    const ids = new Set(routeStudentAssignments.map((a) => a.student_id));
    return ids;
  }, [routeStudentAssignments]);

  const filteredStudents = useMemo(() => {
    if (!routeId) return students;

    return students.filter((student) => {
      if (studentsOnRoute.has(student.id)) return true;
      return !allTransportStudentIds.includes(student.id);
    });
  }, [students, routeId, studentsOnRoute, allTransportStudentIds]);

  const selectedStudents = useMemo(
    () => students.filter((s) => selectedStudentIds.includes(s.id)),
    [students, selectedStudentIds],
  );

  const canGoStep2 = Boolean(routeId && stopId);
  const canGoStep3 = canGoStep2 && selectedStudentIds.length > 0;
  const stepperStep: WizardStep = step === 3 ? 3 : routeId ? 2 : 1;

  const toggleStudent = (studentId: number) => {
    if (!routeId || !stopId) return;
    if (studentsOnRoute.has(studentId) || allTransportStudentIds.includes(studentId)) return;
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    );
  };

  const handleAssign = async () => {
    if (!canGoStep3) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/transport/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_ids: selectedStudentIds,
          route_id: parseInt(routeId, 10),
          stop_id: parseInt(stopId, 10),
          transport_fee: transportFee > 0 ? transportFee : null,
          start_date: startDate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await alert(
          data.message ||
            `Assigned ${data.created_count ?? selectedStudentIds.length} student(s) successfully.`,
          { title: 'Success', type: 'success' },
        );
        setSelectedStudentIds([]);
        setStep(1);
        onAssigned?.();
        loadRouteContext(routeId);
        const assignedRes = await fetch('/api/transport/assignments?status=active');
        const assignedData = await assignedRes.json();
        if (assignedData.success) {
          setAllTransportStudentIds(
            assignedData.data.map((row: { student_id: number }) => row.student_id),
          );
        }
      } else {
        await alert(data.error || 'Failed to assign students', { title: 'Error', type: 'error' });
      }
    } catch {
      await alert('An error occurred while assigning students', { title: 'Error', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Assign Route to Students</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Select route and pickup stop, then choose students to assign transport.
        </p>
      </div>

      <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/80">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {STEPS.map((item, index) => (
            <div key={item.id} className="flex items-center gap-1.5">
              <div
                className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold ${
                  stepperStep >= item.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {stepperStep > item.id ? <FiCheck size={11} /> : item.id}
              </div>
              <span
                className={`text-xs font-medium ${
                  stepperStep >= item.id ? 'text-primary-700' : 'text-gray-500'
                }`}
              >
                {item.label}
              </span>
              {index < STEPS.length - 1 && (
                <div className="hidden sm:block w-6 h-px bg-gray-300 ml-1" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Route <span className="text-red-500">*</span>
            </label>
            <select
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
              disabled={loadingRoutes}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs text-gray-900 bg-white focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select route</option>
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.route_name}
                  {route.route_number ? ` (${route.route_number})` : ''}
                </option>
              ))}
            </select>
            {selectedRoute && (
              <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                {selectedRoute.starting_point || '—'} → {selectedRoute.ending_point || '—'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Vehicle <span className="text-red-500">*</span>
            </label>
            <div className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-xs bg-gray-50 text-gray-700 min-h-[30px] leading-snug">
              {loadingRouteDetail && routeId ? (
                <span className="text-gray-400">Loading...</span>
              ) : vehicleAssignment ? (
                <span>
                  {vehicleAssignment.vehicle_number}
                  {vehicleAssignment.model ? ` (${vehicleAssignment.model})` : ''}
                  {vehicleAssignment.capacity ? (
                    <span className="text-gray-500"> · {vehicleAssignment.capacity} seats</span>
                  ) : null}
                </span>
              ) : routeId ? (
                <span className="text-amber-700">No vehicle assigned</span>
              ) : (
                <span className="text-gray-400">Select route first</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Stop / Pickup Point <span className="text-red-500">*</span>
            </label>
            <select
              value={stopId}
              onChange={(e) => setStopId(e.target.value)}
              disabled={!routeId || loadingRouteDetail}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs text-gray-900 bg-white focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
            >
              <option value="">Select stop</option>
              {routeDetail?.stops.map((stop) => (
                <option key={stop.id} value={stop.id}>
                  {stop.stop_name}
                </option>
              ))}
            </select>
            {selectedStop && (
              <p className="text-[10px] text-gray-500 mt-0.5">
                {formatTime(selectedStop.arrival_time)}
                {transportFee > 0 ? ` · ₹${transportFee}/mo` : ''}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-6 gap-2">
          {routeDetail && (
            <div className="xl:col-span-1 border border-gray-200 rounded-md p-2.5 bg-gray-50/50">
              <h3 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1">
                <FiMapPin className="text-primary-600" size={12} />
                Route Details
              </h3>
              <div className="space-y-0">
                {routeDetail.stops.map((stop, index) => {
                  const isSelected = stop.id.toString() === stopId;
                  const isLast = index === routeDetail.stops.length - 1;
                  return (
                    <div key={stop.id} className="flex gap-2">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-2 h-2 rounded-full mt-1 ${
                            isSelected ? 'bg-primary-600 ring-2 ring-primary-100' : 'bg-gray-300'
                          }`}
                        />
                        {!isLast && <div className="w-px flex-1 bg-gray-200 my-0.5 min-h-[14px]" />}
                      </div>
                      <div className={`pb-2 ${isLast ? 'pb-0' : ''}`}>
                        <p
                          className={`text-[11px] font-medium leading-tight ${
                            isSelected ? 'text-primary-700' : 'text-gray-800'
                          }`}
                        >
                          {stop.stop_name}
                        </p>
                        <p className="text-[10px] text-gray-500">{formatTime(stop.arrival_time)}</p>
                      </div>
                    </div>
                  );
                })}
                {routeDetail.ending_point && (
                  <div className="flex gap-2 pt-1 border-t border-gray-200 mt-1">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1" />
                    <p className="text-[11px] text-gray-700 leading-tight">
                      {routeDetail.ending_point}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-1.5 mt-2 pt-2 border-t border-gray-200 text-[10px] text-gray-600">
                <span className="px-1.5 py-0.5 bg-white rounded border border-gray-100">
                  {routeDetail.stops.length} stops
                </span>
                <span className="px-1.5 py-0.5 bg-white rounded border border-gray-100">
                  {routeDetail.estimated_time ? `${routeDetail.estimated_time} min` : '—'}
                </span>
              </div>
            </div>
          )}

          <div
            className={`border border-gray-200 rounded-md overflow-hidden ${
              routeDetail ? 'xl:col-span-5' : 'xl:col-span-6'
            }`}
          >
              <div className="px-2.5 py-1.5 border-b border-gray-100 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-1 shrink-0">
                  <FiUsers className="text-primary-600" size={12} />
                  {step === 3 ? 'Review' : 'Students'}
                </h3>
                {step !== 3 && (
                  <div className="flex flex-wrap items-center gap-1.5 flex-1 sm:justify-end">
                    <div className="relative flex-1 min-w-[160px] max-w-md">
                      <FiSearch className="absolute left-2 top-1.5 text-gray-400" size={13} />
                      <input
                        type="text"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Search name, roll no., class..."
                        className="w-full pl-7 pr-2 py-1 border border-gray-300 rounded-md text-xs text-gray-900 bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFilters((v) => !v)}
                      className={`inline-flex items-center gap-1 px-2 py-1 border rounded-md text-xs transition-colors ${
                        showFilters || classFilter || sectionFilter
                          ? 'border-primary-300 bg-primary-50 text-primary-700'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <FiFilter size={12} />
                      Filter
                    </button>
                  </div>
                )}
              </div>

              {showFilters && step !== 3 && (
                <div className="px-2.5 py-1.5 border-b bg-gray-50 flex flex-wrap gap-1.5">
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="flex-1 min-w-[120px] px-2 py-1 border border-gray-300 rounded-md text-xs bg-white text-gray-900"
                  >
                    <option value="">All classes</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={sectionFilter}
                    onChange={(e) => setSectionFilter(e.target.value)}
                    disabled={!classFilter}
                    className="flex-1 min-w-[120px] px-2 py-1 border border-gray-300 rounded-md text-xs bg-white text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="">All sections</option>
                    {sections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.name}
                      </option>
                    ))}
                  </select>
                  {(classFilter || sectionFilter) && (
                    <button
                      type="button"
                      onClick={() => {
                        setClassFilter('');
                        setSectionFilter('');
                      }}
                      className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              {step === 3 ? (
                <div className="p-2.5 space-y-2">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded-md bg-gray-50 border border-gray-100">
                      <p className="text-gray-500 text-[10px]">Route</p>
                      <p className="font-medium text-gray-900 truncate">{selectedRoute?.route_name}</p>
                    </div>
                    <div className="p-2 rounded-md bg-gray-50 border border-gray-100">
                      <p className="text-gray-500 text-[10px]">Stop</p>
                      <p className="font-medium text-gray-900 truncate">{selectedStop?.stop_name}</p>
                    </div>
                    <div className="p-2 rounded-md bg-gray-50 border border-gray-100">
                      <p className="text-gray-500 text-[10px]">Fee</p>
                      <p className="font-medium text-gray-900">
                        {transportFee > 0 ? `₹${transportFee}` : 'Free'}
                      </p>
                    </div>
                    <div className="p-2 rounded-md bg-gray-50 border border-gray-100">
                      <label className="text-gray-500 text-[10px] block mb-0.5">Start</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs"
                      />
                    </div>
                  </div>
                  <ul className="divide-y divide-gray-100 border border-gray-100 rounded-md max-h-48 overflow-y-auto">
                    {selectedStudents.map((student) => (
                      <li
                        key={student.id}
                        className="px-2.5 py-2.5 text-xs flex justify-between gap-2"
                      >
                        <span className="truncate">
                          {student.first_name} {student.last_name}{' '}
                          <span className="text-gray-500">({student.admission_number})</span>
                        </span>
                        <span className="text-gray-500 shrink-0">
                          {student.class_name}
                          {student.section_name ? ` · ${student.section_name}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : loadingStudents ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary-600" />
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[min(520px,calc(100vh-320px))] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-2 py-1 w-8" />
                        <th className="px-2 py-1 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                          Student
                        </th>
                        <th className="px-2 py-1 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                          Class
                        </th>
                        <th className="px-2 py-1 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">
                          Stop
                        </th>
                        <th className="px-2 py-1 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wide w-20">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-2 py-6 text-center text-gray-500 text-xs">
                            No students found.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((student) => {
                          const onRoute = routeId ? studentsOnRoute.has(student.id) : false;
                          const assignedElsewhere =
                            routeId &&
                            !onRoute &&
                            allTransportStudentIds.includes(student.id);
                          const isSelected = selectedStudentIds.includes(student.id);
                          const assignment = routeStudentAssignments.find(
                            (a) => a.student_id === student.id,
                          );
                          const canSelect =
                            Boolean(routeId && stopId) && !onRoute && !assignedElsewhere;
                          const classSection = [student.class_name, student.section_name]
                            .filter(Boolean)
                            .join(' · ');
                          const pickupStop = onRoute
                            ? assignment?.stop_name || selectedStop?.stop_name || '—'
                            : selectedStop?.stop_name || '—';

                          return (
                            <tr key={student.id} className="hover:bg-gray-50/80">
                              <td className="px-2 py-2.5 align-middle">
                                <input
                                  type="checkbox"
                                  checked={onRoute || isSelected}
                                  disabled={!canSelect && !onRoute}
                                  onChange={() => toggleStudent(student.id)}
                                  className="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 disabled:opacity-50"
                                />
                              </td>
                              <td className="px-2 py-0.5 align-middle">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {student.photo_url ? (
                                    <img
                                      src={student.photo_url}
                                      alt=""
                                      className="h-5 w-5 rounded-full object-cover shrink-0"
                                    />
                                  ) : (
                                    <div className="h-5 w-5 rounded-full bg-primary-100 flex items-center justify-center text-[9px] font-semibold text-primary-700 shrink-0">
                                      {studentInitials(student.first_name, student.last_name)}
                                    </div>
                                  )}
                                  <div className="min-w-0 leading-tight">
                                    <span className="font-medium text-gray-900">
                                      {student.first_name} {student.last_name}
                                    </span>
                                    <span className="text-gray-400 hidden lg:inline">
                                      {' '}
                                      · {student.admission_number}
                                    </span>
                                    <div className="text-[10px] text-gray-500 sm:hidden truncate">
                                      {classSection || '—'}
                                      {pickupStop !== '—' ? ` · ${pickupStop}` : ''}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 py-0.5 text-gray-600 hidden sm:table-cell align-middle whitespace-nowrap">
                                {classSection || '—'}
                              </td>
                              <td className="px-2 py-0.5 text-gray-600 hidden md:table-cell align-middle whitespace-nowrap">
                                {pickupStop}
                              </td>
                              <td className="px-2 py-0.5 align-middle">
                                {onRoute ? (
                                  <span className="inline-flex px-1.5 py-0 rounded text-[10px] font-medium bg-green-100 text-green-800">
                                    Assigned
                                  </span>
                                ) : assignedElsewhere ? (
                                  <span className="inline-flex px-1.5 py-0 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                                    Other
                                  </span>
                                ) : isSelected ? (
                                  <span className="inline-flex px-1.5 py-0 rounded text-[10px] font-medium bg-blue-100 text-blue-800">
                                    Selected
                                  </span>
                                ) : (
                                  <span className="inline-flex px-1.5 py-0 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                                    Open
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

      <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-gray-600">
          {step === 2 && selectedStudentIds.length > 0 && (
            <span>
              {selectedStudentIds.length} student(s) selected
              {!stopId && ' · Select a pickup stop to continue'}
            </span>
          )}
          {step === 3 && (
            <span>Ready to assign {selectedStudentIds.length} student(s)</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {step === 3 && (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1 px-2.5 py-1 border border-gray-300 rounded-md text-xs text-gray-700 hover:bg-white"
            >
              <FiChevronLeft size={14} />
              Back
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              disabled={!canGoStep3}
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-600 text-white rounded-md text-xs hover:bg-primary-700 disabled:opacity-50"
            >
              Review
              <FiChevronRight size={14} />
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              disabled={submitting || !canGoStep3}
              onClick={handleAssign}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-600 text-white rounded-md text-xs hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? 'Assigning...' : 'Confirm'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
