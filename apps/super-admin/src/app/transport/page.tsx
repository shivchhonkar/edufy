'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import AddVehicleModal from '@/features/transport/components/AddVehicleModal';
import AddRouteModal from '@/features/transport/components/AddRouteModal';
import ViewVehicleModal from '@/features/transport/components/ViewVehicleModal';
import ViewRouteModal from '@/features/transport/components/ViewRouteModal';
import AddTransportAssignmentModal from '@/features/transport/components/AddTransportAssignmentModal';
import AssignVehicleToRouteModal from '@/features/transport/components/AssignVehicleToRouteModal';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';
import { useDialog } from '@/shared/context/DialogContext';
import { Vehicle, Route } from '@/shared/types';
import { FiTruck, FiPlus, FiEdit, FiTrash2, FiMapPin, FiUsers, FiMap, FiEye, FiSearch, FiX, FiPrinter, FiInfo, FiChevronDown, FiChevronUp } from 'react-icons/fi';

export default function TransportPage() {
  const { alert } = useDialog();
  const [activeTab, setActiveTab] = useState<'vehicles' | 'routes' | 'assignments'>('vehicles');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [routeAssignments, setRouteAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadingRouteAssignments, setLoadingRouteAssignments] = useState(false);
  const [loadingRouteId, setLoadingRouteId] = useState<number | null>(null);
  
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showVehicleAssignmentModal, setShowVehicleAssignmentModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<any | null>(null);
  const [editingVehicleAssignment, setEditingVehicleAssignment] = useState<any | null>(null);
  const [preSelectedRoute, setPreSelectedRoute] = useState<any | null>(null);
  const [viewingVehicle, setViewingVehicle] = useState<Vehicle | null>(null);
  const [viewingRoute, setViewingRoute] = useState<any | null>(null);
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null);
  const [deletingRoute, setDeletingRoute] = useState<any | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState<any | null>(null);
  const [deletingVehicleAssignment, setDeletingVehicleAssignment] = useState<any | null>(null);
  
  const [searchAssignment, setSearchAssignment] = useState('');
  const [filterRoute, setFilterRoute] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [statsExpanded, setStatsExpanded] = useState(false);

  useEffect(() => {
    fetchVehicles();
    fetchRoutes();
    fetchRouteAssignments();
    fetchAssignments();
    fetchClasses();
  }, []);

  useEffect(() => {
    if (activeTab === 'vehicles') fetchVehicles();
    if (activeTab === 'routes') {
      fetchRoutes();
      fetchRouteAssignments();
    }
    if (activeTab === 'assignments') fetchAssignments();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'assignments') {
      fetchAssignments();
    }
  }, [searchAssignment, filterRoute, filterClass, filterStatus]);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/transport/vehicles');
      const data = await response.json();
      if (data.success) {
        setVehicles(data.data);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoutes = async () => {
    setLoadingRoutes(true);
    try {
      const response = await fetch('/api/transport/routes');
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

  const fetchAssignments = async () => {
    setLoadingAssignments(true);
    try {
      let url = '/api/transport/assignments';
      const params = [];
      if (searchAssignment) params.push(`search=${searchAssignment}`);
      if (filterRoute) params.push(`route_id=${filterRoute}`);
      if (filterClass) params.push(`class_id=${filterClass}`);
      if (filterStatus) params.push(`status=${filterStatus}`);
      
      if (params.length > 0) {
        url += '?' + params.join('&');
      }

      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setAssignments(data.data);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoadingAssignments(false);
    }
  };

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

  const fetchRouteAssignments = async () => {
    setLoadingRouteAssignments(true);
    try {
      const response = await fetch('/api/transport/route-assignments?status=active');
      const data = await response.json();
      if (data.success) {
        setRouteAssignments(data.data);
      }
    } catch (error) {
      console.error('Error fetching route assignments:', error);
    } finally {
      setLoadingRouteAssignments(false);
    }
  };

  const handleViewVehicle = (vehicle: Vehicle) => {
    setViewingVehicle(vehicle);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setShowVehicleModal(true);
  };

  const handleViewRoute = async (route: any) => {
    setLoadingRouteId(route.id);
    try {
      // Fetch full route details with stops
      const response = await fetch(`/api/transport/routes/${route.id}`);
      const data = await response.json();
      
      if (data.success) {
        setViewingRoute(data.data);
      } else {
        await alert('Failed to load route details', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error fetching route details:', error);
      await alert('An error occurred while loading route details', { title: 'Error', type: 'error' });
    } finally {
      setLoadingRouteId(null);
    }
  };

  const handleEditRoute = async (route: any) => {
    setLoadingRouteId(route.id);
    try {
      // Fetch full route details with stops
      const response = await fetch(`/api/transport/routes/${route.id}`);
      const data = await response.json();
      
      if (data.success) {
        setEditingRoute(data.data);
        setShowRouteModal(true);
      } else {
        await alert('Failed to load route details', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error fetching route details:', error);
      await alert('An error occurred while loading route details', { title: 'Error', type: 'error' });
    } finally {
      setLoadingRouteId(null);
    }
  };

  const handleDeleteVehicle = async () => {
    if (!deletingVehicle) return;

    try {
      const response = await fetch(`/api/transport/vehicles/${deletingVehicle.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setDeletingVehicle(null);
        fetchVehicles();
      } else {
        await alert(data.error || 'Failed to delete vehicle', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      await alert('An error occurred while deleting vehicle', { title: 'Error', type: 'error' });
    }
  };

  const handleDeleteRoute = async () => {
    if (!deletingRoute) return;

    try {
      const response = await fetch(`/api/transport/routes/${deletingRoute.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setDeletingRoute(null);
        fetchRoutes();
      } else {
        await alert(data.error || 'Failed to delete route', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting route:', error);
      await alert('An error occurred while deleting route', { title: 'Error', type: 'error' });
    }
  };

  const handleCloseVehicleModal = () => {
    setShowVehicleModal(false);
    setEditingVehicle(null);
  };

  const handleCloseRouteModal = () => {
    setShowRouteModal(false);
    setEditingRoute(null);
  };

  const handleCloseAssignmentModal = () => {
    setShowAssignmentModal(false);
    setEditingAssignment(null);
  };

  const handleEditAssignment = (assignment: any) => {
    setEditingAssignment(assignment);
    setShowAssignmentModal(true);
  };

  const handleDeleteAssignment = async () => {
    if (!deletingAssignment) return;

    try {
      const response = await fetch(`/api/transport/assignments/${deletingAssignment.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setDeletingAssignment(null);
        fetchAssignments();
      } else {
        await alert(data.error || 'Failed to delete assignment', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      await alert('An error occurred while deleting assignment', { title: 'Error', type: 'error' });
    }
  };

  const handleAssignVehicleToRoute = (route: any) => {
    setPreSelectedRoute(route);
    setShowVehicleAssignmentModal(true);
  };

  const handleEditVehicleAssignment = (assignment: any) => {
    setEditingVehicleAssignment(assignment);
    setShowVehicleAssignmentModal(true);
  };

  const handleCloseVehicleAssignmentModal = () => {
    setShowVehicleAssignmentModal(false);
    setEditingVehicleAssignment(null);
    setPreSelectedRoute(null);
  };

  const handleDeleteVehicleAssignment = async () => {
    if (!deletingVehicleAssignment) return;

    try {
      const response = await fetch(`/api/transport/route-assignments/${deletingVehicleAssignment.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setDeletingVehicleAssignment(null);
        fetchRouteAssignments();
      } else {
        await alert(data.error || 'Failed to unassign vehicle', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error unassigning vehicle:', error);
      await alert('An error occurred while unassigning vehicle', { title: 'Error', type: 'error' });
    }
  };

  const printAssignments = async () => {
    if (assignments.length === 0) {
      await alert('No assignments to print', { title: 'Notice', type: 'warning' });
      return;
    }

    // Group assignments by route
    const groupedByRoute: { [key: string]: any[] } = {};
    assignments.forEach(assignment => {
      const routeKey = assignment.route_id;
      if (!groupedByRoute[routeKey]) {
        groupedByRoute[routeKey] = [];
      }
      groupedByRoute[routeKey].push(assignment);
    });

    // Create print content
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      await alert('Please allow popups to print', { title: 'Notice', type: 'warning' });
      return;
    }

    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Student Transport Assignments - Route Wise</title>
        <style>
          @media print {
            @page { margin: 2mm; }
            body { margin: 0; }
            .page-break { page-break-before: always; }
          }
          body {
            font-family: Arial, sans-serif;
            padding: 4px;
            color: #000;
          }
          .header {
            text-align: center;
            margin-bottom: 6px;
            border-bottom: 3px solid #333;
            padding-bottom: 3px;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            color: #333;
          }
          .header p {
            margin: 1px 0;
            color: #666;
            font-size: 14px;
          }
          .route-section {
            margin-bottom: 8px;
            page-break-inside: avoid;
          }
          .route-header {
            background: #f3f4f6;
            padding: 2px;
            border-left: 4px solid #2563eb;
            margin-bottom: 3px;
          }
          .route-header h2 {
            margin: 0;
            font-size: 18px;
            color: #1f2937;
          }
          .route-header p {
            margin: 1px 0 0 0;
            font-size: 12px;
            color: #6b7280;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 4px;
          }
          th {
            background: #e5e7eb;
            padding: 2px;
            text-align: left;
            font-size: 12px;
            font-weight: bold;
            border: 1px solid #d1d5db;
            text-transform: uppercase;
          }
          td {
            padding: 2px;
            border: 1px solid #d1d5db;
            font-size: 12px;
          }
          tr:nth-child(even) {
            background: #f9fafb;
          }
          .footer {
            margin-top: 6px;
            text-align: center;
            font-size: 11px;
            color: #9ca3af;
            border-top: 1px solid #e5e7eb;
            padding-top: 3px;
          }
          .summary {
            background: #fef3c7;
            padding: 2px;
            border-left: 4px solid #f59e0b;
            margin-bottom: 4px;
          }
          .summary p {
            margin: 2px 0;
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Student Transport Assignments - Route Wise</h1>
          <p>Shribi Edufy School Management System</p>
          <p>Generated on: ${currentDate}</p>
        </div>

        <div class="summary">
          <p><strong>Total Students:</strong> ${assignments.length}</p>
          <p><strong>Total Routes:</strong> ${Object.keys(groupedByRoute).length}</p>
        </div>
    `;

    // Add each route section
    Object.keys(groupedByRoute).forEach((routeKey, index) => {
      const routeAssignments = groupedByRoute[routeKey];
      const firstAssignment = routeAssignments[0];
      
      if (index > 0) {
        printContent += '<div class="page-break"></div>';
      }

      printContent += `
        <div class="route-section">
          <div class="route-header">
            <h2>${firstAssignment.route_name}</h2>
            <p>Route Number: ${firstAssignment.route_number || 'N/A'} | Total Students: ${routeAssignments.length}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 8%">S.No.</th>
                <th style="width: 20%">Student Name</th>
                <th style="width: 15%">Admission No.</th>
                <th style="width: 12%">Class</th>
                <th style="width: 20%">Pickup Point</th>
                <th style="width: 10%">Pickup Time</th>
                <th style="width: 15%">Contact Number</th>
              </tr>
            </thead>
            <tbody>
      `;

      // Add students for this route
      routeAssignments.forEach((assignment, idx) => {
        printContent += `
          <tr>
            <td>${idx + 1}</td>
            <td><strong>${assignment.first_name} ${assignment.last_name}</strong></td>
            <td>${assignment.admission_number}</td>
            <td>${assignment.class_name || 'N/A'}${assignment.section_name ? ` - ${assignment.section_name}` : ''}</td>
            <td>${assignment.stop_name || 'Not specified'}</td>
            <td>${assignment.arrival_time ? (assignment.arrival_time.length > 5 ? assignment.arrival_time.substring(0, 5) : assignment.arrival_time) : 'N/A'}</td>
            <td>${assignment.parent_phone || 'N/A'}</td>
          </tr>
        `;
      });

      printContent += `
            </tbody>
          </table>
        </div>
      `;
    });

    printContent += `
        <div class="footer">
          <p>This document is computer generated and does not require a signature.</p>
          <p>Printed on ${currentDate}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const activeVehicles = vehicles.filter(v => v.status === 'active').length;
  const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance').length;
  const activeRoutes = routes.filter(r => r.status === 'active').length;
  const activeStudentAssignments = assignments.filter(a => a.status === 'active').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl text-gray-900">Transport Management</h1>
              <div className="relative group">
                <button
                  type="button"
                  aria-label="Transport quick setup guide"
                  className="text-gray-400 hover:text-primary-600 transition-colors rounded-full p-0.5"
                >
                  <FiInfo size={18} />
                </button>
                <div
                  role="tooltip"
                  className="absolute left-0 top-full z-50 mt-2 w-80 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-lg opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto"
                >
                  <p className="font-medium text-gray-900 mb-2">Quick setup</p>
                  <ul className="space-y-1.5">
                    <li>
                      <strong>Vehicles</strong> — Add bus/van with driver details
                    </li>
                    <li>
                      <strong>Routes & Stops</strong> — Create route, add pickup stops with fees, assign a vehicle
                    </li>
                    <li>
                      <strong>Student Assignments</strong> — Pick students, route, and stop (fee auto-fills)
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <p className="text-gray-600 mt-1">Simple 3-step setup: Vehicles → Routes → Assign Students</p>
          </div>
          {activeTab === 'vehicles' && (
            <button 
              onClick={() => setShowVehicleModal(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center space-x-2"
            >
              <FiPlus />
              <span>Add Vehicle</span>
            </button>
          )}
          {activeTab === 'routes' && (
            <button 
              onClick={() => setShowRouteModal(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center space-x-2"
            >
              <FiPlus />
              <span>Add Route</span>
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div>
          <button
            type="button"
            onClick={() => setStatsExpanded((prev) => !prev)}
            aria-expanded={statsExpanded}
            className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-sm text-gray-700 transition-colors"
          >
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium text-gray-900">Statistics</span>
              {!statsExpanded && (
                <span className="text-xs text-gray-500">
                  {activeVehicles} vehicles · {maintenanceVehicles} maintenance · {activeRoutes} routes ·{' '}
                  {activeStudentAssignments} students
                </span>
              )}
            </span>
            {statsExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
          </button>

          {statsExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Active Vehicles</p>
                    <p className="text-xl text-blue-700 mt-1">{activeVehicles}</p>
                  </div>
                  <FiTruck className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-600">Maintenance</p>
                    <p className="text-xl text-yellow-700 mt-1">{maintenanceVehicles}</p>
                  </div>
                  <FiTruck className="w-8 h-8 text-yellow-600" />
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Active Routes</p>
                    <p className="text-xl text-green-700 mt-1">{activeRoutes}</p>
                  </div>
                  <FiMap className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Students on Transport</p>
                    <p className="text-xl text-purple-700 mt-1">{activeStudentAssignments}</p>
                  </div>
                  <FiUsers className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-6 px-4" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('vehicles')}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'vehicles'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiTruck className="inline mr-2" />
                Vehicles
              </button>
              <button
                onClick={() => setActiveTab('routes')}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'routes'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiMap className="inline mr-2" />
                Routes
              </button>
              <button
                onClick={() => setActiveTab('assignments')}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'assignments'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiUsers className="inline mr-2" />
                Students
              </button>
            </nav>
          </div>
        </div>

        {/* Vehicles Tab */}
        {activeTab === 'vehicles' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h3 className="text-base font-semibold text-gray-900">Vehicles</h3>
            </div>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : vehicles.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No vehicles found. Click &quot;Add Vehicle&quot; to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                        Vehicle Number
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                        Type
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                        Model
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                        Capacity
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                        Driver/Owner
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vehicles.map((vehicle) => (
                      <tr key={vehicle.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                          {vehicle.vehicle_number}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 capitalize">
                          {vehicle.vehicle_type}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {vehicle.model || 'N/A'}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {vehicle.capacity} seats
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          {vehicle.driver_name ? (
                            <div>
                              <div className="font-medium text-gray-900">{vehicle.driver_name}</div>
                              <div className="text-xs text-gray-500">
                                Driver {vehicle.driver_phone && `• ${vehicle.driver_phone}`}
                              </div>
                            </div>
                          ) : vehicle.owner_name ? (
                            <div>
                              <div className="font-medium text-gray-900">{vehicle.owner_name}</div>
                              <div className="text-xs text-gray-500">
                                Owner {vehicle.owner_phone && `• ${vehicle.owner_phone}`}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Not assigned</span>
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            vehicle.status === 'active' 
                              ? 'bg-green-100 text-green-800'
                              : vehicle.status === 'maintenance'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {vehicle.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-3">
                            <button 
                              onClick={() => handleViewVehicle(vehicle)}
                              className="text-primary-600 hover:text-primary-900 p-1"
                              title="View Details"
                            >
                              <FiEye size={18} />
                            </button>
                            <button 
                              onClick={() => handleEditVehicle(vehicle)}
                              className="text-blue-600 hover:text-blue-900 p-1"
                              title="Edit"
                            >
                              <FiEdit size={18} />
                            </button>
                            <button 
                              onClick={() => setDeletingVehicle(vehicle)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Delete"
                            >
                              <FiTrash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Routes Tab */}
        {activeTab === 'routes' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h3 className="text-base font-semibold text-gray-900">Routes & Stops</h3>
            </div>
            {loadingRoutes ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : routes.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No routes found. Click &quot;Add Route&quot; to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                        Route Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                        Route Number
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                        Assigned Vehicle
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                        Driver
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                        Stops
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                        Students
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {routes.map((route) => {
                      const vehicleAssignment = routeAssignments.find(ra => ra.route_id === route.id);
                      
                      return (
                        <tr key={route.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                            {route.route_name}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            {route.route_number || 'N/A'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            {vehicleAssignment ? (
                              <div>
                                <div className="font-medium text-gray-900">{vehicleAssignment.vehicle_number}</div>
                                <div className="text-xs text-gray-500 capitalize">{vehicleAssignment.vehicle_type} • {vehicleAssignment.capacity} seats</div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAssignVehicleToRoute(route)}
                                className="text-xs text-primary-600 hover:text-primary-900 font-medium"
                              >
                                + Assign Vehicle
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            {vehicleAssignment?.driver_name || (
                              <span className="text-gray-400 italic">Not assigned</span>
                            )}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            {route.total_stops || 0}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            {route.total_students || 0}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              route.status === 'active' 
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {route.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-3">
                              <button 
                                onClick={() => handleViewRoute(route)}
                                disabled={loadingRouteId === route.id}
                                className="text-primary-600 hover:text-primary-900 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={loadingRouteId === route.id ? "Loading route details..." : "View Details"}
                              >
                                {loadingRouteId === route.id ? (
                                  <div className="animate-spin h-4 w-4 border-2 border-primary-600 border-t-transparent rounded-full"></div>
                                ) : (
                                  <FiEye size={18} />
                                )}
                              </button>
                              <button 
                                onClick={() => handleEditRoute(route)}
                                disabled={loadingRouteId !== null}
                                className="text-blue-600 hover:text-blue-900 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Edit"
                              >
                                <FiEdit size={18} />
                              </button>
                              {vehicleAssignment && (
                                <button 
                                  onClick={() => setDeletingVehicleAssignment(vehicleAssignment)}
                                  className="text-orange-600 hover:text-orange-900 p-1"
                                  title="Unassign Vehicle"
                                >
                                  <FiX size={18} />
                                </button>
                              )}
                              <button 
                                onClick={() => setDeletingRoute(route)}
                                disabled={loadingRouteId !== null}
                                className="text-red-600 hover:text-red-900 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete"
                              >
                                <FiTrash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Student Assignments Tab */}
        {activeTab === 'assignments' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-base font-semibold text-gray-900">Student Transport Assignments</h3>
              <div className="flex space-x-3">
                <button
                  onClick={printAssignments}
                  disabled={assignments.length === 0}
                  className="flex items-center space-x-2 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiPrinter size={16} />
                  <span>Print Route-wise</span>
                </button>
                <button
                  onClick={() => setShowAssignmentModal(true)}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <FiPlus size={16} />
                  <span>Assign Student</span>
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="p-4 border-b bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by student name or admission number..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                    value={searchAssignment}
                    onChange={(e) => setSearchAssignment(e.target.value)}
                  />
                </div>
                <div>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                    value={filterRoute}
                    onChange={(e) => setFilterRoute(e.target.value)}
                  >
                    <option value="">All Routes</option>
                    {routes.map((route) => (
                      <option key={route.id} value={route.id}>
                        {route.route_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                  >
                    <option value="">All Classes</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
              {(searchAssignment || filterRoute || filterClass || filterStatus) && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Active filters:</span>
                    {searchAssignment && (
                      <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                        Search: "{searchAssignment}"
                      </span>
                    )}
                    {filterRoute && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        Route: {routes.find(r => r.id.toString() === filterRoute)?.route_name}
                      </span>
                    )}
                    {filterClass && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        Class: {classes.find(c => c.id.toString() === filterClass)?.name}
                      </span>
                    )}
                    {filterStatus && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        Status: {filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSearchAssignment('');
                      setFilterRoute('');
                      setFilterClass('');
                      setFilterStatus('');
                    }}
                    className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiX size={16} />
                    <span>Clear All</span>
                  </button>
                </div>
              )}
            </div>

            {loadingAssignments ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FiUsers className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                <p className="text-gray-500">
                  {searchAssignment || filterRoute || filterClass 
                    ? 'No assignments found matching your filters' 
                    : 'No student transport assignments found'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Click &quot;Assign Student&quot; to get started
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                        Student
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                        Class
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                        Route
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                        Pickup Stop
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                        Fee (₹/month)
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                        Start Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assignments.map((assignment) => (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="flex items-center">
                            {assignment.photo_url ? (
                              <img
                                src={assignment.photo_url}
                                alt={`${assignment.first_name} ${assignment.last_name}`}
                                className="h-8 w-8 rounded-full object-cover mr-2"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                                <span className="text-xs font-medium text-gray-600">
                                  {assignment.first_name.charAt(0)}{assignment.last_name.charAt(0)}
                                </span>
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {assignment.first_name} {assignment.last_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {assignment.admission_number}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {assignment.class_name || 'N/A'}
                          {assignment.section_name && ` - ${assignment.section_name}`}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {assignment.route_name}
                          </div>
                          {assignment.route_number && (
                            <div className="text-xs text-gray-500">
                              {assignment.route_number}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {assignment.stop_name || 'Not specified'}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {assignment.transport_fee ? `₹${assignment.transport_fee}` : 'Free'}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {new Date(assignment.start_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            assignment.status === 'active' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {assignment.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-3">
                            <button 
                              onClick={() => handleEditAssignment(assignment)}
                              className="text-blue-600 hover:text-blue-900 p-1"
                              title="Edit"
                            >
                              <FiEdit size={18} />
                            </button>
                            <button 
                              onClick={() => setDeletingAssignment(assignment)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Remove Assignment"
                            >
                              <FiTrash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Total Count */}
            {!loadingAssignments && assignments.length > 0 && (
              <div className="px-6 py-3 border-t bg-gray-50">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">
                    Total Assignments: <span className="font-semibold text-gray-900">{assignments.length}</span>
                  </span>
                  {filterRoute && (
                    <span className="text-gray-600">
                      Students on {routes.find(r => r.id.toString() === filterRoute)?.route_name}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add/Edit Vehicle Modal */}
        <AddVehicleModal
          isOpen={showVehicleModal}
          onClose={handleCloseVehicleModal}
          onSuccess={fetchVehicles}
          editingVehicle={editingVehicle}
        />

        {/* View Vehicle Modal */}
        <ViewVehicleModal
          isOpen={!!viewingVehicle}
          onClose={() => setViewingVehicle(null)}
          vehicle={viewingVehicle}
        />

        {/* Add/Edit Route Modal */}
        <AddRouteModal
          isOpen={showRouteModal}
          onClose={handleCloseRouteModal}
          onSuccess={fetchRoutes}
          editingRoute={editingRoute}
        />

        {/* View Route Modal */}
        <ViewRouteModal
          isOpen={!!viewingRoute}
          onClose={() => setViewingRoute(null)}
          route={viewingRoute}
        />

        {/* Add/Edit Assignment Modal */}
        <AddTransportAssignmentModal
          isOpen={showAssignmentModal}
          onClose={handleCloseAssignmentModal}
          onSuccess={fetchAssignments}
          editingAssignment={editingAssignment}
        />

        {/* Assign Vehicle to Route Modal */}
        <AssignVehicleToRouteModal
          isOpen={showVehicleAssignmentModal}
          onClose={handleCloseVehicleAssignmentModal}
          onSuccess={fetchRouteAssignments}
          editingAssignment={editingVehicleAssignment}
          preSelectedRoute={preSelectedRoute}
        />

        {/* Delete Vehicle Confirmation */}
        <ConfirmDialog
          isOpen={!!deletingVehicle}
          title="Delete Vehicle"
          message={`Are you sure you want to delete vehicle ${deletingVehicle?.vehicle_number}? This action cannot be undone.`}
          confirmText="Yes, Delete"
          cancelText="Cancel"
          onConfirm={handleDeleteVehicle}
          onCancel={() => setDeletingVehicle(null)}
          type="danger"
        />

        {/* Delete Route Confirmation */}
        <ConfirmDialog
          isOpen={!!deletingRoute}
          title="Delete Route"
          message={`Are you sure you want to delete route "${deletingRoute?.route_name}"? This will also remove all stops. This action cannot be undone.`}
          confirmText="Yes, Delete"
          cancelText="Cancel"
          onConfirm={handleDeleteRoute}
          onCancel={() => setDeletingRoute(null)}
          type="danger"
        />

        {/* Delete Assignment Confirmation */}
        <ConfirmDialog
          isOpen={!!deletingAssignment}
          title="Remove Transport Assignment"
          message={`Are you sure you want to remove transport assignment for ${deletingAssignment?.first_name} ${deletingAssignment?.last_name}? This action cannot be undone.`}
          confirmText="Yes, Remove"
          cancelText="Cancel"
          onConfirm={handleDeleteAssignment}
          onCancel={() => setDeletingAssignment(null)}
          type="danger"
        />

        {/* Unassign Vehicle from Route Confirmation */}
        <ConfirmDialog
          isOpen={!!deletingVehicleAssignment}
          title="Unassign Vehicle from Route"
          message={`Are you sure you want to unassign vehicle "${deletingVehicleAssignment?.vehicle_number}" from route "${deletingVehicleAssignment?.route_name}"?`}
          confirmText="Yes, Unassign"
          cancelText="Cancel"
          onConfirm={handleDeleteVehicleAssignment}
          onCancel={() => setDeletingVehicleAssignment(null)}
          type="warning"
        />
      </div>
    </DashboardLayout>
  );
}

