'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import SettingsNav from '@/features/settings/components/SettingsNav';
import { useDialog } from '@/shared/context/DialogContext';
import RupeeIcon from '@/shared/components/icons/RupeeIcon';
import { 
  FiSettings, 
  FiUsers, 
  FiRefreshCw,
  FiAlertCircle,
  FiCheckCircle,
  FiInfo,
  FiShield,
  FiCalendar,
  FiBookOpen,
  FiDownload,
  FiUpload,
  FiDatabase,
  FiArchive,
  FiClock,
  FiActivity,
  FiMonitor,
  FiSettings as FiCog,
  FiPlus,
  FiEdit3,
  FiTrash2,
  FiSave,
  FiPlay,
  FiPause,
  FiRotateCcw,
  FiKey,
  FiLock,
  FiUnlock,
  FiUserCheck,
  FiUserX,
  FiMail,
  FiEye,
  FiEyeOff,
  FiSearch,
  FiX
} from 'react-icons/fi';

function SettingsPageContent() {
  const { confirm } = useDialog();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const [systemStats, setSystemStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Academic Year Management State
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [currentAcademicYear, setCurrentAcademicYear] = useState<any>(null);
  const [newAcademicYear, setNewAcademicYear] = useState({
    name: '',
    start_date: '',
    end_date: '',
    is_active: false
  });
  const [showDeleteYearConfirm, setShowDeleteYearConfirm] = useState(false);
  const [yearToDelete, setYearToDelete] = useState<any>(null);
  const [showEditYearModal, setShowEditYearModal] = useState(false);
  const [yearToEdit, setYearToEdit] = useState<any>(null);
  const [editAcademicYear, setEditAcademicYear] = useState({
    name: '',
    start_date: '',
    end_date: '',
  });
  
  // System Settings State
  const [systemSettings, setSystemSettings] = useState({
    school_name: '',
    school_address: '',
    school_phone: '',
    school_email: '',
    academic_year: '',
    currency: 'INR',
    date_format: 'DD/MM/YYYY',
    timezone: 'Asia/Kolkata',
    late_fee_percentage: 0,
    late_fee_days: 7,
    auto_assign_fees: true,
    send_notifications: true
  });
  
  // System Performance State
  const [systemPerformance, setSystemPerformance] = useState({
    database_size: 0,
    last_backup: null,
    active_users: 0,
    system_uptime: 0,
    memory_usage: 0,
    cpu_usage: 0
  });

  // User Management State
  const [users, setUsers] = useState<any[]>([]);
  const [userFilter, setUserFilter] = useState('all'); // all, student, teacher, transport
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'student',
    status: 'active',
    phone: ''
  });

  useEffect(() => {
    fetchSystemStats();
    fetchAcademicYears();
    fetchSystemSettings();
    fetchSystemPerformance();
    fetchUsers();
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    const validTabs = new Set([
      'overview',
      'academic',
      'users',
      'system',
      'backup',
      'performance',
      'maintenance',
      'fees',
    ]);
    if (tab && validTabs.has(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, userFilter]);

  // Calculate password strength
  useEffect(() => {
    if (newPassword) {
      let strength = 0;
      if (newPassword.length >= 8) strength += 25;
      if (newPassword.match(/[a-z]/) && newPassword.match(/[A-Z]/)) strength += 25;
      if (newPassword.match(/[0-9]/)) strength += 25;
      if (newPassword.match(/[^a-zA-Z0-9]/)) strength += 25;
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(0);
    }
  }, [newPassword]);

  const fetchAcademicYears = async () => {
    try {
      const response = await fetch('/api/academic-years');
      const data = await response.json();
      if (data.success) {
        setAcademicYears(data.data);
        const activeYear = data.data.find((year: any) => year.is_active);
        setCurrentAcademicYear(activeYear);
        
        // Auto-load active academic year into system settings
        if (activeYear) {
          setSystemSettings(prev => ({
            ...prev,
            academic_year: activeYear.name
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching academic years:', error);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (data.success) {
        setSystemSettings({ ...systemSettings, ...data.data });
      }
    } catch (error) {
      console.error('Error fetching system settings:', error);
    }
  };

  const fetchSystemPerformance = async () => {
    try {
      const response = await fetch('/api/system/performance');
      const data = await response.json();
      if (data.success) {
        setSystemPerformance(data.data);
      }
    } catch (error) {
      console.error('Error fetching system performance:', error);
    }
  };

  const fetchSystemStats = async () => {
    try {
      const [studentsResponse, feesResponse, feeStructuresResponse] = await Promise.all([
        fetch('/api/students?status=active&limit=100'),
        fetch('/api/fees/stats'),
        fetch('/api/fees/structures?is_active=true')
      ]);

      const [studentsData, feesData, feeStructuresData] = await Promise.all([
        studentsResponse.json(),
        feesResponse.json(),
        feeStructuresResponse.json()
      ]);

      if (studentsData.success && feesData.success && feeStructuresData.success) {
        const studentsWithFees = studentsData.data.filter((student: any) => 
          student.fee_status === 'fees_assigned'
        ).length;

      setSystemStats({
          totalStudents: studentsData.data.length,
          studentsWithFees: studentsWithFees,
          totalFeeStructures: feeStructuresData.data.length,
          totalPending: feesData.data?.total_pending || 0,
          totalCollected: feesData.data?.total_collected || 0,
          thisMonth: feesData.data?.this_month || 0
        });
      }
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  };

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleInitializeSystemFees = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/initialize-system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'initialize_fees' }),
      });
      const data = await response.json();
      
      if (data.success) {
        showMessage('success', data.message || 'System fees initialized successfully');
        fetchSystemStats();
      } else {
        showMessage('error', data.error);
      }
    } catch (error) {
      console.error('Error initializing fees:', error);
      showMessage('error', 'An error occurred while initializing fees');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignMissingFees = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/fees/assign-missing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      
      if (data.success) {
        if (data.data.studentsProcessed === 0) {
          showMessage('info', 'All students already have fee records assigned!');
        } else {
          showMessage('success', `Successfully assigned fees to ${data.data.studentsProcessed} students (${data.data.feesAssigned} fee records created).`);
        }
        fetchSystemStats();
      } else {
        showMessage('error', data.error);
      }
    } catch (error) {
      console.error('Error assigning missing fees:', error);
      showMessage('error', 'An error occurred while assigning fees');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAllFees = async () => {
    const confirmed = await confirm(
      'Are you sure you want to reset all fees? This will permanently delete ALL payment records and ALL student fee assignments. This action cannot be undone.',
      {
        title: 'Reset All Fees',
        type: 'danger',
        confirmText: 'Reset All',
      }
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const response = await fetch('/api/fees/clear-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deleteAllFees: true }), // Delete all fee records completely
      });
      const data = await response.json();
      
      if (data.success) {
        showMessage('success', `Successfully reset all fees: ${data.data.paymentsDeleted} payments deleted, ${data.data.feesDeleted} fee records deleted. All student fees have been cleared and will need to be regenerated.`);
        fetchSystemStats();
      } else {
        showMessage('error', data.error);
      }
    } catch (error) {
      console.error('Error resetting fees:', error);
      showMessage('error', 'An error occurred while resetting fees');
    } finally {
      setLoading(false);
    }
  };

  // Academic Year Management Handlers
  const handleCreateAcademicYear = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/academic-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAcademicYear),
      });
      const data = await response.json();
      
      if (data.success) {
        showMessage('success', 'Academic year created successfully');
        setNewAcademicYear({ name: '', start_date: '', end_date: '', is_active: false });
        fetchAcademicYears();
      } else {
        showMessage('error', data.error);
      }
    } catch (error) {
      showMessage('error', 'Error creating academic year');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateAcademicYear = async (yearId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/academic-years/${yearId}/activate`, {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        showMessage('success', 'Academic year activated successfully');
        fetchAcademicYears();
      } else {
        showMessage('error', data.error);
      }
    } catch (error) {
      showMessage('error', 'Error activating academic year');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAcademicYear = async () => {
    if (!yearToDelete) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/academic-years/${yearToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      
      if (data.success) {
        showMessage('success', 'Academic year deleted successfully');
        setShowDeleteYearConfirm(false);
        setYearToDelete(null);
        fetchAcademicYears();
      } else {
        showMessage('error', data.error);
      }
    } catch (error) {
      showMessage('error', 'Error deleting academic year');
    } finally {
      setLoading(false);
    }
  };

  const openEditAcademicYear = (year: any) => {
    setYearToEdit(year);
    setEditAcademicYear({
      name: year.name,
      start_date: year.start_date?.slice(0, 10) || '',
      end_date: year.end_date?.slice(0, 10) || '',
    });
    setShowEditYearModal(true);
  };

  const handleUpdateAcademicYear = async () => {
    if (!yearToEdit) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/academic-years/${yearToEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editAcademicYear),
      });
      const data = await response.json();

      if (data.success) {
        showMessage('success', 'Academic year updated successfully');
        setShowEditYearModal(false);
        setYearToEdit(null);
        fetchAcademicYears();
        fetchSystemSettings();
      } else {
        showMessage('error', data.error);
      }
    } catch (error) {
      showMessage('error', 'Error updating academic year');
    } finally {
      setLoading(false);
    }
  };

  // System Settings Handlers
  const handleSaveSystemSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(systemSettings),
      });
      const data = await response.json();
      
      if (data.success) {
        showMessage('success', 'System settings saved successfully');
      } else {
        showMessage('error', data.error);
      }
    } catch (error) {
      showMessage('error', 'Error saving system settings');
    } finally {
      setLoading(false);
    }
  };

  // Data Management Handlers
  const handleExportData = async (type: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/export/${type}`, {
        method: 'GET',
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showMessage('success', `${type} data exported successfully`);
      } else {
        showMessage('error', 'Error exporting data');
      }
    } catch (error) {
      showMessage('error', 'Error exporting data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/backup/create', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        showMessage('success', 'Backup created successfully');
        fetchSystemPerformance();
      } else {
        showMessage('error', data.error);
      }
    } catch (error) {
      showMessage('error', 'Error creating backup');
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeDatabase = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/system/optimize', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        showMessage('success', 'Database optimized successfully');
        fetchSystemPerformance();
      } else {
        showMessage('error', data.error);
      }
    } catch (error) {
      showMessage('error', 'Error optimizing database');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/system/clear-cache', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        showMessage('success', 'System cache cleared successfully');
      } else {
        showMessage('error', data.error);
      }
    } catch (error) {
      showMessage('error', 'Error clearing cache');
    } finally {
      setLoading(false);
    }
  };

  // User Management Handlers
  const fetchUsers = async () => {
    try {
      const endpoint = userFilter === 'all' ? '/api/users' : `/api/users?role=${userFilter}`;
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) {
      showMessage('error', 'Please provide a valid password');
      return;
    }

    if (passwordStrength < 50) {
      showMessage('error', 'Password is too weak. Use at least 8 characters with mixed case, numbers, and symbols');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await response.json();
      
      if (data.success) {
        showMessage('success', `Password reset successfully for ${selectedUser.name}`);
        setShowPasswordModal(false);
        setSelectedUser(null);
        setNewPassword('');
      } else {
        showMessage('error', data.error);
      }
    } catch (error) {
      showMessage('error', 'Error resetting password');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    setLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();
      
      if (data.success) {
        showMessage('success', `User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
        fetchUsers();
      } else {
        showMessage('error', data.error);
      }
    } catch (error) {
      showMessage('error', 'Error updating user status');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCredentials = async (userId: number, userEmail: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}/send-credentials`, {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        showMessage('success', `Credentials sent to ${userEmail}`);
      } else {
        showMessage('error', data.error);
      }
    } catch (error) {
      showMessage('error', 'Error sending credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!userFormData.name || !userFormData.email || !userFormData.username) {
      showMessage('error', 'Please fill in all required fields');
      return;
    }

    if (!editingUser && !userFormData.password) {
      showMessage('error', 'Password is required for new users');
      return;
    }

    setLoading(true);
    try {
      const endpoint = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userFormData),
      });
      const data = await response.json();
      
      if (data.success) {
        showMessage('success', `User ${editingUser ? 'updated' : 'created'} successfully`);
        setShowUserModal(false);
        setEditingUser(null);
        setUserFormData({
          name: '',
          email: '',
          username: '',
          password: '',
          role: 'student',
          status: 'active',
          phone: ''
        });
        fetchUsers();
      } else {
        showMessage('error', data.error);
      }
    } catch (error) {
      showMessage('error', `Error ${editingUser ? 'updating' : 'creating'} user`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setUserFormData({
      name: user.name,
      email: user.email,
      username: user.username,
      password: '',
      role: user.role,
      status: user.status,
      phone: user.phone || ''
    });
    setShowUserModal(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      
      if (data.success) {
        showMessage('success', 'User deleted successfully');
        setShowDeleteConfirm(false);
        setUserToDelete(null);
        fetchUsers();
      } else {
        showMessage('error', data.error);
      }
    } catch (error) {
      showMessage('error', 'Error deleting user');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.username?.toLowerCase().includes(query) ||
        user.role?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Format date to readable format (DD MMM YYYY)
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    };
    return date.toLocaleDateString('en-GB', options);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <SettingsNav />
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl text-gray-900">System Administration</h1>
            <p className="text-gray-600 mt-1">Manage and configure your educational system</p>
          </div>
          <div className="flex items-center gap-2">
            <FiShield className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">Admin Access</span>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {message.type === 'success' ? <FiCheckCircle className="w-5 h-5" /> : 
             message.type === 'error' ? <FiAlertCircle className="w-5 h-5" /> : <FiInfo className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {[
              { id: 'overview', name: 'Overview', icon: FiSettings },
              { id: 'academic', name: 'Academic Years', icon: FiCalendar },
              { id: 'users', name: 'User Management', icon: FiUsers },
              { id: 'system', name: 'System Settings', icon: FiCog },
              { id: 'backup', name: 'Backup & Export', icon: FiDownload },
              { id: 'performance', name: 'Performance', icon: FiMonitor },
              { id: 'maintenance', name: 'Maintenance', icon: FiActivity },
              { id: 'fees', name: 'Fee Management', icon: RupeeIcon }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-xl  text-gray-900">System Overview</h2>

        {/* System Statistics */}
        {systemStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Students</p>
                  <p className="text-xl text-blue-700 mt-1">
                    {systemStats.totalStudents}
                  </p>
                </div>
                <FiUsers className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Students with Fees</p>
                  <p className="text-xl text-green-700 mt-1">
                    {systemStats.studentsWithFees}
                  </p>
                </div>
                <RupeeIcon className="w-8 h-8 text-green-600" />
              </div>
            </div>

                  <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                        <p className="text-sm font-medium text-yellow-600">Fee Structures</p>
                        <p className="text-xl text-yellow-700 mt-1">
                    {systemStats.totalFeeStructures}
                  </p>
                </div>
                      <FiSettings className="w-8 h-8 text-yellow-600" />
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                        <p className="text-sm font-medium text-purple-600">System Health</p>
                  <p className="text-xl text-purple-700 mt-1">
                          {systemStats.totalStudents > 0 && systemStats.studentsWithFees > 0 ? 'Good' : 'Setup'}
                  </p>
                </div>
                      <FiShield className="w-8 h-8 text-purple-600" />
              </div>
            </div>
                </div>
              )}

              {/* Current Academic Year */}
              {currentAcademicYear && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Academic Year</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Academic Year</p>
                      <p className="text-lg font-semibold text-gray-900">{currentAcademicYear.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Start Date</p>
                      <p className="text-lg font-semibold text-gray-900">{formatDate(currentAcademicYear.start_date)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">End Date</p>
                      <p className="text-lg font-semibold text-gray-900">{formatDate(currentAcademicYear.end_date)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setActiveTab('academic')}
                    className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <FiCalendar className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-900">Manage Academic Years</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('backup')}
                    className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                  >
                    <FiDownload className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-900">Backup & Export</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('performance')}
                    className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                  >
                    <FiMonitor className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-purple-900">System Performance</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Academic Years Tab */}
          {activeTab === 'academic' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl  text-gray-900">Academic Year Management</h2>
              </div>

              {/* Create New Academic Year */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Academic Year</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year Name</label>
                    <input
                      type="text"
                      value={newAcademicYear.name}
                      onChange={(e) => setNewAcademicYear({...newAcademicYear, name: e.target.value})}
                      placeholder="e.g., 2024-25"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={newAcademicYear.start_date}
                      onChange={(e) => setNewAcademicYear({...newAcademicYear, start_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={newAcademicYear.end_date}
                      onChange={(e) => setNewAcademicYear({...newAcademicYear, end_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleCreateAcademicYear}
                      disabled={loading || !newAcademicYear.name || !newAcademicYear.start_date || !newAcademicYear.end_date}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <FiPlus className="w-4 h-4" />
                      Create Year
                    </button>
                  </div>
                </div>
              </div>

              {/* Academic Years List */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Academic Years</h3>
                <div className="space-y-3">
                  {academicYears.map((year) => (
                    <div key={year.id} className={`p-4 border rounded-lg ${
                      year.is_active ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <h4 className="font-semibold text-gray-900">{year.name}</h4>
                            <p className="text-sm text-gray-600">
                              {formatDate(year.start_date)} - {formatDate(year.end_date)}
                  </p>
                </div>
                          {year.is_active && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditAcademicYear(year)}
                            className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200 flex items-center gap-1"
                            title="Edit Academic Year"
                          >
                            <FiEdit3 className="w-3 h-3" />
                            Edit
                          </button>
                          {!year.is_active && (
                            <>
                              <button
                                onClick={() => handleActivateAcademicYear(year.id)}
                                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center gap-1"
                              >
                                <FiPlay className="w-3 h-3" />
                                Activate
                              </button>
                              <button
                                onClick={() => {
                                  setYearToDelete(year);
                                  setShowDeleteYearConfirm(true);
                                }}
                                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 flex items-center gap-1"
                                title="Delete Academic Year"
                              >
                                <FiTrash2 className="w-3 h-3" />
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

          </div>
        )}

          {/* Edit Academic Year Modal */}
          {showEditYearModal && yearToEdit && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Edit Academic Year</h3>
                  <button
                    onClick={() => {
                      setShowEditYearModal(false);
                      setYearToEdit(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year Name</label>
                    <input
                      type="text"
                      value={editAcademicYear.name}
                      onChange={(e) => setEditAcademicYear({ ...editAcademicYear, name: e.target.value })}
                      placeholder="e.g. 2026-27"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={editAcademicYear.start_date}
                      onChange={(e) => setEditAcademicYear({ ...editAcademicYear, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={editAcademicYear.end_date}
                      onChange={(e) => setEditAcademicYear({ ...editAcademicYear, end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowEditYearModal(false);
                      setYearToEdit(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateAcademicYear}
                    disabled={loading || !editAcademicYear.name || !editAcademicYear.start_date || !editAcademicYear.end_date}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <FiSave className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Academic Year Confirmation Modal */}
          {showDeleteYearConfirm && yearToDelete && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <FiAlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Academic Year</h3>
          </div>

                <p className="text-gray-600 mb-2">
                  Are you sure you want to delete academic year <span className="font-semibold">"{yearToDelete.name}"</span>?
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Period: {formatDate(yearToDelete.start_date)} - {formatDate(yearToDelete.end_date)}
                </p>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> This action will permanently remove this academic year. Make sure no important data is associated with it.
                  </p>
                </div>

                <div className="flex gap-3">
              <button
                    onClick={() => {
                      setShowDeleteYearConfirm(false);
                      setYearToDelete(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAcademicYear}
                disabled={loading}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <FiTrash2 className="w-4 h-4" />
                    Delete Year
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* User Management Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl  text-gray-900">User Management</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setEditingUser(null);
                      setUserFormData({
                        name: '',
                        email: '',
                        username: '',
                        password: '',
                        role: 'student',
                        status: 'active',
                        phone: ''
                      });
                      setShowUserModal(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
                  >
                    <FiPlus className="w-4 h-4" />
                    Add User
                  </button>
                </div>
              </div>

              {/* User Filters */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setUserFilter('all')}
                  className={`px-4 py-2 rounded-md font-medium ${
                    userFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Users
                </button>
                <button
                  onClick={() => setUserFilter('student')}
                  className={`px-4 py-2 rounded-md font-medium ${
                    userFilter === 'student'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Students
                </button>
                <button
                  onClick={() => setUserFilter('teacher')}
                  className={`px-4 py-2 rounded-md font-medium ${
                    userFilter === 'teacher'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Teachers
                </button>
                <button
                  onClick={() => setUserFilter('parent')}
                  className={`px-4 py-2 rounded-md font-medium ${
                    userFilter === 'parent'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Parents
                </button>
                <button
                  onClick={() => setUserFilter('transport_manager')}
                  className={`px-4 py-2 rounded-md font-medium ${
                    userFilter === 'transport_manager'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Transport
                </button>
                <button
                  onClick={() => setUserFilter('admin')}
                  className={`px-4 py-2 rounded-md font-medium ${
                    userFilter === 'admin'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Admins
                </button>
              </div>

              {/* Users List */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Username
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                            No users found
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-blue-600 font-semibold">
                                    {user.name?.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                  <div className="text-sm text-gray-500">{user.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                user.role === 'student' ? 'bg-blue-100 text-blue-800' :
                                user.role === 'teacher' ? 'bg-green-100 text-green-800' :
                                user.role === 'parent' ? 'bg-yellow-100 text-yellow-800' :
                                user.role === 'transport_manager' ? 'bg-purple-100 text-purple-800' :
                                user.role === 'inventory_manager' ? 'bg-orange-100 text-orange-800' :
                                user.role === 'admin' ? 'bg-red-100 text-red-800' :
                                user.role === 'super_admin' ? 'bg-pink-100 text-pink-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {user.role === 'transport_manager' ? 'Transport Manager' :
                                 user.role === 'inventory_manager' ? 'Inventory Manager' :
                                 user.role === 'super_admin' ? 'Super Admin' :
                                 user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.username || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {user.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEditUser(user)}
                                  className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1"
                                  title="Edit User"
                                >
                                  <FiEdit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowPasswordModal(true);
                                  }}
                                  className="text-green-600 hover:text-green-900 inline-flex items-center gap-1"
                                  title="Reset Password"
                                >
                                  <FiKey className="w-4 h-4" />
                                </button>
                                {user.role !== 'super_admin' ? (
                                  <button
                                    onClick={() => handleToggleUserStatus(user.id, user.status)}
                                    className={`${
                                      user.status === 'active' ? 'text-orange-600 hover:text-orange-900' : 'text-teal-600 hover:text-teal-900'
                                    } inline-flex items-center gap-1`}
                                    title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                                  >
                                    {user.status === 'active' ? <FiUserX className="w-4 h-4" /> : <FiUserCheck className="w-4 h-4" />}
                                  </button>
                                ) : (
                                  <button
                                    disabled
                                    className="text-gray-300 cursor-not-allowed inline-flex items-center gap-1"
                                    title="Super Admin accounts must remain active"
                                  >
                                    <FiLock className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleSendCredentials(user.id, user.email)}
                                  className="text-purple-600 hover:text-purple-900 inline-flex items-center gap-1"
                                  title="Send Credentials"
                                >
                                  <FiMail className="w-4 h-4" />
              </button>
                                {user.role !== 'super_admin' ? (
                                  <button
                                    onClick={() => {
                                      setUserToDelete(user);
                                      setShowDeleteConfirm(true);
                                    }}
                                    className="text-red-600 hover:text-red-900 inline-flex items-center gap-1"
                                    title="Delete User"
                                  >
                                    <FiTrash2 className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    disabled
                                    className="text-gray-300 cursor-not-allowed inline-flex items-center gap-1"
                                    title="Super Admin accounts cannot be deleted"
                                  >
                                    <FiShield className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
            </div>

              {/* User Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Total Users</p>
                      <p className="text-xl text-blue-700 mt-1">{users.length}</p>
                    </div>
                    <FiUsers className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Active Users</p>
                      <p className="text-xl text-green-700 mt-1">
                        {users.filter(u => u.status === 'active').length}
                      </p>
                    </div>
                    <FiUserCheck className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-600">Students</p>
                      <p className="text-xl text-yellow-700 mt-1">
                        {users.filter(u => u.role === 'student').length}
                      </p>
                    </div>
                    <FiBookOpen className="w-8 h-8 text-yellow-600" />
                  </div>
                </div>
                <div className="bg-teal-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-teal-600">Teachers</p>
                      <p className="text-xl text-teal-700 mt-1">
                        {users.filter(u => u.role === 'teacher').length}
                      </p>
                    </div>
                    <FiUsers className="w-8 h-8 text-teal-600" />
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Transport</p>
                      <p className="text-xl text-purple-700 mt-1">
                        {users.filter(u => u.role === 'transport_manager').length}
                      </p>
                    </div>
                    <FiActivity className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Password Reset Modal */}
          {showPasswordModal && selectedUser && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Reset Password</h3>
              <button
                    onClick={() => {
                      setShowPasswordModal(false);
                      setSelectedUser(null);
                      setNewPassword('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX className="w-5 h-5" />
              </button>
            </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Resetting password for: <span className="font-semibold">{selectedUser.name}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Role: <span className="font-semibold">{selectedUser.role}</span>
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    />
              <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">Password Strength</span>
                      <span className={`text-xs font-semibold ${
                        passwordStrength >= 75 ? 'text-green-600' :
                        passwordStrength >= 50 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {passwordStrength >= 75 ? 'Strong' :
                         passwordStrength >= 50 ? 'Medium' :
                         'Weak'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          passwordStrength >= 75 ? 'bg-green-500' :
                          passwordStrength >= 50 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${passwordStrength}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Use 8+ characters with mixed case, numbers, and symbols
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowPasswordModal(false);
                      setSelectedUser(null);
                      setNewPassword('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={loading || passwordStrength < 50}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <FiLock className="w-4 h-4" />
                    Reset Password
              </button>
            </div>
              </div>
            </div>
          )}

          {/* Create/Edit User Modal */}
          {showUserModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingUser ? 'Edit User' : 'Create New User'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowUserModal(false);
                      setEditingUser(null);
                      setUserFormData({
                        name: '',
                        email: '',
                        username: '',
                        password: '',
                        role: 'student',
                        status: 'active',
                        phone: ''
                      });
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={userFormData.name}
                      onChange={(e) => setUserFormData({...userFormData, name: e.target.value})}
                      placeholder="Enter full name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Email & Username */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={userFormData.email}
                        onChange={(e) => setUserFormData({...userFormData, email: e.target.value})}
                        placeholder="user@example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Username <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={userFormData.username}
                        onChange={(e) => setUserFormData({...userFormData, username: e.target.value})}
                        placeholder="username"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Phone & Password */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={userFormData.phone}
                        onChange={(e) => setUserFormData({...userFormData, phone: e.target.value})}
                        placeholder="+91 1234567890"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password {!editingUser && <span className="text-red-500">*</span>}
                        {editingUser && <span className="text-gray-500 text-xs">(Leave blank to keep current)</span>}
                      </label>
                      <input
                        type="password"
                        value={userFormData.password}
                        onChange={(e) => setUserFormData({...userFormData, password: e.target.value})}
                        placeholder={editingUser ? "Leave blank to keep current password" : "Enter password"}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Role & Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={userFormData.role}
                        onChange={(e) => setUserFormData({...userFormData, role: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="parent">Parent</option>
                        <option value="transport_manager">Transport Manager</option>
                        <option value="inventory_manager">Inventory Manager</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={userFormData.status}
                        onChange={(e) => setUserFormData({...userFormData, status: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowUserModal(false);
                      setEditingUser(null);
                      setUserFormData({
                        name: '',
                        email: '',
                        username: '',
                        password: '',
                        role: 'student',
                        status: 'active',
                        phone: ''
                      });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateUser}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <FiSave className="w-4 h-4" />
                    {editingUser ? 'Update User' : 'Create User'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && userToDelete && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <FiAlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete User</h3>
                </div>

                <p className="text-gray-600 mb-4">
                  Are you sure you want to delete <span className="font-semibold">{userToDelete.name}</span>? This action cannot be undone.
                </p>

                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-800">
                    <strong>Warning:</strong> Deleting this user will permanently remove all associated data and cannot be recovered.
                  </p>
                </div>

                <div className="flex gap-3">
              <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setUserToDelete(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteUser}
                disabled={loading}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <FiTrash2 className="w-4 h-4" />
                    Delete User
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* System Settings Tab */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl  text-gray-900">System Settings</h2>
                <button
                  onClick={handleSaveSystemSettings}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <FiSave className="w-4 h-4" />
                  Save Settings
              </button>
            </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* School Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">School Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
                      <input
                        type="text"
                        value={systemSettings.school_name}
                        onChange={(e) => setSystemSettings({...systemSettings, school_name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <textarea
                        value={systemSettings.school_address}
                        onChange={(e) => setSystemSettings({...systemSettings, school_address: e.target.value})}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="text"
                          value={systemSettings.school_phone}
                          onChange={(e) => setSystemSettings({...systemSettings, school_phone: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={systemSettings.school_email}
                          onChange={(e) => setSystemSettings({...systemSettings, school_email: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
          </div>
        </div>

                {/* System Configuration */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">System Configuration</h3>
          <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                        <select
                          value={systemSettings.currency}
                          onChange={(e) => setSystemSettings({...systemSettings, currency: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="INR">INR (₹)</option>
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Academic Year
                        </label>
                        <select
                          value={systemSettings.academic_year}
                          onChange={(e) => setSystemSettings({...systemSettings, academic_year: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-green-50"
                        >
                          {academicYears.filter(year => year.is_active).length === 0 ? (
                            <option value="">No active academic year available</option>
                          ) : (
                            academicYears.filter(year => year.is_active).map((year) => (
                              <option key={year.id} value={year.name}>
                                {year.name} ✓ Active
                              </option>
                            ))
                          )}
                        </select>
                        <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                          <FiInfo className="w-3 h-3" />
                          {currentAcademicYear ? (
                            <>
                              <span className="font-semibold text-green-600">{currentAcademicYear.name}</span> ({formatDate(currentAcademicYear.start_date)} - {formatDate(currentAcademicYear.end_date)})
                              <br />
                              <span className="text-blue-600">Only active academic years are shown in system dropdowns.</span>
                            </>
                          ) : (
                            <span className="text-orange-600">No active academic year set. Please activate one in the Academic Years tab.</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Late Fee Percentage</label>
                        <input
                          type="number"
                          value={systemSettings.late_fee_percentage}
                          onChange={(e) => setSystemSettings({...systemSettings, late_fee_percentage: parseFloat(e.target.value)})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Late Fee Days</label>
                        <input
                          type="number"
                          value={systemSettings.late_fee_days}
                          onChange={(e) => setSystemSettings({...systemSettings, late_fee_days: parseInt(e.target.value)})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={systemSettings.auto_assign_fees}
                          onChange={(e) => setSystemSettings({...systemSettings, auto_assign_fees: e.target.checked})}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Auto-assign fees to new students</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={systemSettings.send_notifications}
                          onChange={(e) => setSystemSettings({...systemSettings, send_notifications: e.target.checked})}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Send notifications</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Backup & Export Tab */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <h2 className="text-xl  text-gray-900">Backup & Export</h2>

              {/* Create Backup */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Create System Backup</h3>
                <p className="text-gray-600 mb-4">Create a complete backup of your system data including students, fees, and settings.</p>
                <button
                  onClick={handleCreateBackup}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <FiDatabase className="w-4 h-4" />
                  Create Backup
              </button>
            </div>

              {/* Export Data */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Data</h3>
                <p className="text-gray-600 mb-4">Export specific data types as CSV files for analysis or migration.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <button
                    onClick={() => handleExportData('students')}
                    disabled={loading}
                    className="flex items-center gap-2 p-3 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 text-green-800 disabled:opacity-50"
                  >
                    <FiUsers className="w-4 h-4" />
                    Export Students
                  </button>
                  <button
                    onClick={() => handleExportData('fees')}
                    disabled={loading}
                    className="flex items-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 text-blue-800 disabled:opacity-50"
                  >
                    <RupeeIcon className="w-4 h-4" />
                    Export Fees
                  </button>
                  <button
                    onClick={() => handleExportData('payments')}
                    disabled={loading}
                    className="flex items-center gap-2 p-3 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 text-purple-800 disabled:opacity-50"
                  >
                    <FiDownload className="w-4 h-4" />
                    Export Payments
                  </button>
                  <button
                    onClick={() => handleExportData('attendance')}
                    disabled={loading}
                    className="flex items-center gap-2 p-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg border border-yellow-200 text-yellow-800 disabled:opacity-50"
                  >
                    <FiClock className="w-4 h-4" />
                    Export Attendance
                  </button>
                  <button
                    onClick={() => handleExportData('complete')}
                    disabled={loading}
                    className="flex items-center gap-2 p-3 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 text-red-800 disabled:opacity-50"
                  >
                    <FiArchive className="w-4 h-4" />
                    Complete Export
                  </button>
          </div>
        </div>
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              <h2 className="text-xl  text-gray-900">System Performance</h2>

              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
            <div>
                      <p className="text-sm font-medium text-gray-600">Database Size</p>
                      <p className="text-xl text-gray-900">
                        {(systemPerformance.database_size / 1024 / 1024).toFixed(2)} MB
                      </p>
            </div>
                    <FiDatabase className="w-8 h-8 text-blue-600" />
          </div>
        </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Users</p>
                      <p className="text-xl text-gray-900">
                        {systemPerformance.active_users}
                      </p>
      </div>
                    <FiUsers className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">System Uptime</p>
                      <p className="text-xl text-gray-900">
                        {Math.floor(systemPerformance.system_uptime / 3600)}h
                      </p>
                    </div>
                    <FiClock className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
              </div>

              {/* System Resources */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">System Resources</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Memory Usage</span>
                      <span className="text-sm text-gray-600">{systemPerformance.memory_usage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${systemPerformance.memory_usage > 80 ? 'bg-red-500' : systemPerformance.memory_usage > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${systemPerformance.memory_usage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">CPU Usage</span>
                      <span className="text-sm text-gray-600">{systemPerformance.cpu_usage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${systemPerformance.cpu_usage > 80 ? 'bg-red-500' : systemPerformance.cpu_usage > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${systemPerformance.cpu_usage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Maintenance Tab */}
          {activeTab === 'maintenance' && (
            <div className="space-y-6">
              <h2 className="text-xl  text-gray-900">System Maintenance</h2>

              {/* Database Maintenance */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Maintenance</h3>
                <p className="text-gray-600 mb-4">Optimize database performance and clean up old data.</p>
                <div className="space-y-3">
                  <button
                    onClick={handleOptimizeDatabase}
                    disabled={loading}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    <FiDatabase className="w-4 h-4" />
                    Optimize Database
                  </button>
              <button
                    onClick={handleClearCache}
                disabled={loading}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    <FiRefreshCw className="w-4 h-4" />
                    Clear System Cache
                  </button>
                </div>
              </div>

              {/* System Health Check */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health Check</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FiCheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-800">Database Connection</span>
                    </div>
                    <span className="text-green-600 font-medium">Healthy</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FiCheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-800">File System</span>
                    </div>
                    <span className="text-green-600 font-medium">Healthy</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FiCheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-800">API Endpoints</span>
                    </div>
                    <span className="text-green-600 font-medium">Healthy</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fee Management Tab */}
          {activeTab === 'fees' && (
            <div className="space-y-6">
              <h2 className="text-xl  text-gray-900">Fee Management</h2>

              {/* Fee Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <FiSettings className="w-6 h-6 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Initialize System Fees</h3>
                  </div>
                  <p className="text-gray-600 mb-4">Create default fee structures for all classes.</p>
                  <button
                    onClick={handleInitializeSystemFees}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Initialize Fees
              </button>
            </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <FiUsers className="w-6 h-6 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Assign Missing Fees</h3>
                  </div>
                  <p className="text-gray-600 mb-4">Assign fee records to students who don't have them.</p>
              <button
                onClick={handleAssignMissingFees}
                disabled={loading}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Assign Fees
              </button>
            </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <FiAlertCircle className="w-6 h-6 text-red-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Reset All Fees</h3>
                  </div>
                  <p className="text-gray-600 mb-4">Permanently delete ALL payment records and ALL student fee assignments. This will completely clear all fee data and requires regeneration.</p>
              <button
                onClick={handleResetAllFees}
                disabled={loading}
                    className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Reset Fees
              </button>
            </div>
          </div>

              {/* Fee Statistics */}
              {systemStats && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Fee Statistics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-xl text-blue-700">₹{systemStats.totalPending?.toLocaleString() || '0'}</p>
                      <p className="text-sm text-blue-600">Total Pending</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-xl text-green-700">₹{systemStats.totalCollected?.toLocaleString() || '0'}</p>
                      <p className="text-sm text-green-600">Total Collected</p>
        </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-xl text-purple-700">₹{systemStats.thisMonth?.toLocaleString() || '0'}</p>
                      <p className="text-sm text-purple-600">This Month</p>
            </div>
          </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center py-16 text-gray-500">Loading…</div>
        </DashboardLayout>
      }
    >
      <SettingsPageContent />
    </Suspense>
  );
}
