'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { 
  FiHome, 
  FiDollarSign, 
  FiBook, 
  FiCalendar, 
  FiFileText,
  FiUser,
  FiMenu,
  FiChevronsLeft,
  FiLogOut,
  FiAward
} from 'react-icons/fi';

interface SidebarProps {
  onToggle?: (collapsed: boolean) => void;
}

export default function Sidebar({ onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  // Initialize state from localStorage
  const initialCollapsedState = useMemo(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('parentSidebarCollapsed');
      if (savedState === null) {
        localStorage.setItem('parentSidebarCollapsed', 'false');
        return false;
      }
      return savedState === 'true';
    }
    return false;
  }, []);
  
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsedState);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  
  // Get selected child from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // First check if there's a saved selected child ID
      const savedChildId = localStorage.getItem('selectedChildId');
      
      if (savedChildId) {
        setSelectedChildId(savedChildId);
      } else {
        // Fallback to first child if no selection saved
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            if (user.children && user.children.length > 0) {
              const firstChildId = user.children[0].id.toString();
              setSelectedChildId(firstChildId);
              localStorage.setItem('selectedChildId', firstChildId);
            }
          } catch (error) {
            console.error('Error parsing user data:', error);
          }
        }
      }
    }

    // Listen for changes to selectedChildId in localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'selectedChildId' && e.newValue) {
        setSelectedChildId(e.newValue);
      }
    };

    // Listen for custom event when child is selected
    const handleChildSelected = (e: any) => {
      if (e.detail && e.detail.childId) {
        setSelectedChildId(e.detail.childId);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('childSelected', handleChildSelected);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('childSelected', handleChildSelected);
    };
  }, []);

  // Notify parent of state changes
  useEffect(() => {
    if (onToggle) {
      onToggle(isCollapsed);
    }
  }, [isCollapsed, onToggle]);

  // Don't show sidebar on login page
  if (pathname === '/login' || pathname === '/') {
    return null;
  }

  const menuItems = [
    { name: 'Dashboard', icon: FiHome, path: '/dashboard' },
    { name: 'Profile', icon: FiUser, path: selectedChildId ? `/profile/${selectedChildId}` : '/dashboard' },
    { name: 'Homework', icon: FiBook, path: selectedChildId ? `/homework/${selectedChildId}` : '/dashboard' },
    { name: 'Fees', icon: FiDollarSign, path: selectedChildId ? `/fees/${selectedChildId}` : '/dashboard' },
    { name: 'Attendance', icon: FiCalendar, path: selectedChildId ? `/attendance/${selectedChildId}` : '/dashboard' },
    { name: 'Results', icon: FiAward, path: '/results' },
    { name: 'Report Card', icon: FiFileText, path: selectedChildId ? `/grades/${selectedChildId}` : '/dashboard' },
  ];

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('parentSidebarCollapsed', String(newState));
    if (onToggle) {
      onToggle(newState);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div 
      className={`sidebar-container h-full text-white fixed left-0 top-0 overflow-y-auto transition-all duration-300 z-50 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
      style={{ 
        backgroundColor: '#1e40af', // blue-700
        color: 'white'
      }}
    >
      {/* Header */}
      <div className="p-6">
        {isCollapsed ? (
          <div className="flex justify-center">
            <button
              onClick={toggleSidebar}
              className="relative p-2 hover:bg-blue-600 rounded-lg transition-all duration-300"
              title="Expand Menu"
            >
              <FiMenu size={22} className="text-blue-200" />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiUser className="text-white" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg font-bold text-white truncate">Shribi Edufy</h1>
                  <p className="text-xs text-blue-200 truncate">Parent Portal</p>
                </div>
              </div>
              <button
                onClick={toggleSidebar}
                className="flex-shrink-0 p-2 hover:bg-blue-600 rounded-lg transition-all duration-300 ml-2"
                title="Collapse Menu"
              >
                <FiChevronsLeft size={20} className="text-blue-200" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Menu Items */}
      <nav className="px-3 flex-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(item.path);
          return (
            <Link
              key={item.name}
              href={item.path}
              className={`group relative flex items-center my-1 px-3 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-blue-100 hover:bg-blue-600 hover:text-white'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? item.name : ''}
            >
              <item.icon 
                className={`flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} 
                size={20}
                style={{ minWidth: '20px' }}
              />
              {!isCollapsed && (
                <span className="text-sm font-medium truncate flex-1">
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

      {/* Logout Button */}
      <div className="p-3 border-t border-blue-600">
        <button
          onClick={handleLogout}
          className={`group relative flex items-center w-full px-3 py-3 rounded-lg transition-all duration-200 text-blue-100 hover:bg-blue-600 hover:text-white ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? 'Logout' : ''}
        >
          <FiLogOut 
            className={`flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} 
            size={20}
            style={{ minWidth: '20px' }}
          />
          {!isCollapsed && (
            <span className="text-sm font-medium truncate flex-1">
              Logout
            </span>
          )}
          
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
  );
}

