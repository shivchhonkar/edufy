'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  FiHome, 
  FiTruck, 
  FiMapPin, 
  FiUsers, 
  FiUserCheck, 
  FiMenu, 
  FiX,
  FiLogOut,
  FiBarChart2,
  FiBook,
  FiChevronsLeft
} from 'react-icons/fi';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: FiHome },
  { name: 'Vehicles', href: '/vehicles', icon: FiTruck },
  { name: 'Routes', href: '/routes', icon: FiMapPin },
  { name: 'Drivers', href: '/drivers', icon: FiUsers },
  { name: 'Students', href: '/students', icon: FiBook },
  { name: 'Assignments', href: '/assignments', icon: FiUserCheck },
  { name: 'Reports', href: '/reports', icon: FiBarChart2 },
];

interface SidebarProps {
  onToggle?: (collapsed: boolean) => void;
}

export default function Sidebar({ onToggle }: SidebarProps = {}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Initialize collapse state from localStorage
  const initialCollapsedState = useMemo(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('transportSidebarCollapsed');
      if (savedState === null) {
        localStorage.setItem('transportSidebarCollapsed', 'false');
        return false;
      }
      return savedState === 'true';
    }
    return false;
  }, []);

  const [isCollapsed, setIsCollapsed] = useState(initialCollapsedState);

  // Notify parent of state changes
  useEffect(() => {
    if (onToggle) {
      onToggle(isCollapsed);
    }
  }, [isCollapsed, onToggle]);

  // Don't show sidebar on login page
  if (pathname === '/login') {
    return null;
  }

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('transportSidebarCollapsed', String(newState));
    if (onToggle) {
      onToggle(newState);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <FiTruck className="text-blue-600 text-2xl mr-2" />
          <h1 className="text-xl text-gray-900">Transport Admin</h1>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-gray-500 hover:text-gray-700"
        >
          {sidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-gray-600 bg-opacity-75 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen transition-all duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 bg-gray-900
          ${isCollapsed ? 'w-20' : 'w-64'}
        `}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className={`flex items-center h-16 bg-gray-800 border-b border-gray-700 ${isCollapsed ? 'px-4 justify-center' : 'px-6'}`}>
            {isCollapsed ? (
              <button
                onClick={toggleSidebar}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Expand Menu"
              >
                <FiMenu size={22} className="text-blue-400" />
              </button>
            ) : (
              <>
                <FiTruck className="text-blue-400 text-2xl mr-3 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg font-bold text-white whitespace-nowrap">Transport</h1>
                  <p className="text-xs text-gray-400 whitespace-nowrap">Management System</p>
                </div>
                <button
                  onClick={toggleSidebar}
                  className="ml-2 p-2 hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
                  title="Collapse Menu"
                >
                  <FiChevronsLeft size={20} className="text-blue-400" />
                </button>
              </>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center text-sm font-medium rounded-lg
                    transition-colors duration-150 relative group
                    ${isCollapsed ? 'justify-center px-4' : 'px-4'}
                    py-3
                    ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }
                  `}
                  title={isCollapsed ? item.name : ''}
                >
                  <Icon 
                    className="text-lg flex-shrink-0" 
                    style={{ 
                      marginRight: isCollapsed ? '0' : '12px',
                      minWidth: '18px'
                    }}
                  />
                  {!isCollapsed && (
                    <span className="whitespace-nowrap flex-1">
                      {item.name}
                    </span>
                  )}
                  
                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
                      {item.name}
                      <div className="absolute top-1/2 right-full -translate-y-1/2 w-0 h-0 border-4 border-transparent border-r-gray-800"></div>
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User section & Logout */}
          <div className="border-t border-gray-700 p-4">
            {!isCollapsed && (
              <div className="flex items-center px-4 py-3 mb-2">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <FiUsers className="text-white text-sm" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-white">Transport Admin</p>
                  <p className="text-xs text-gray-400">admin@Shribi Edufy.com</p>
                </div>
              </div>
            )}
            
            <button
              onClick={handleLogout}
              className={`
                w-full flex items-center text-sm font-medium text-gray-300 
                hover:bg-gray-800 hover:text-white rounded-lg transition-colors duration-150
                relative group
                ${isCollapsed ? 'justify-center px-4' : 'px-4'}
                py-3
              `}
              title={isCollapsed ? 'Logout' : ''}
            >
              <FiLogOut 
                className="text-lg flex-shrink-0" 
                style={{ 
                  marginRight: isCollapsed ? '0' : '12px',
                  minWidth: '18px'
                }}
              />
              {!isCollapsed && <span>Logout</span>}
              
              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
                  Logout
                  <div className="absolute top-1/2 right-full -translate-y-1/2 w-0 h-0 border-4 border-transparent border-r-gray-800"></div>
                </div>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

