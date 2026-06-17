'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { 
  FiHome, 
  FiBook, 
  FiCalendar, 
  FiFileText,
  FiUser,
  FiMenu,
  FiChevronsLeft,
  FiLogOut,
  FiAward
} from 'react-icons/fi';
import RupeeIcon from '@/components/icons/RupeeIcon';
import SchoolLogo from '@/components/SchoolLogo';
import { useSchoolBranding } from '@/contexts/SchoolBrandingContext';
import { PARENT_PORTAL_LABEL } from '@/lib/site-seo';
import { isModuleAllowed, type PortalPermissionMap } from '@/lib/portal-access';

interface SidebarProps {
  onToggle?: (collapsed: boolean) => void;
}

type MenuItem = {
  name: string;
  icon: typeof FiHome;
  path: string;
  moduleKey: string;
};

export default function Sidebar({ onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { branding } = useSchoolBranding();
  const schoolName = branding.school_name?.trim() || 'School';
  const schoolLogo = branding.logo_url?.trim() || '';
  
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
  const [permissions, setPermissions] = useState<PortalPermissionMap | null>(null);
  
  const resolvePermissions = (childId: string | null) => {
    if (typeof window === 'undefined' || !childId) return null;
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    try {
      const user = JSON.parse(userData);
      const child = user.children?.find((c: { id: number }) => c.id.toString() === childId);
      return child?.effective_permissions ?? null;
    } catch {
      return null;
    }
  };

  // Get selected child from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // First check if there's a saved selected child ID
      const savedChildId = localStorage.getItem('selectedChildId');
      
      if (savedChildId) {
        setSelectedChildId(savedChildId);
        setPermissions(resolvePermissions(savedChildId));
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
              setPermissions(user.children[0].effective_permissions ?? null);
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
        setPermissions(resolvePermissions(e.newValue));
      }
    };

    // Listen for custom event when child is selected
    const handleChildSelected = (e: CustomEvent<{ childId: string }>) => {
      if (e.detail?.childId) {
        setSelectedChildId(e.detail.childId);
        setPermissions(resolvePermissions(e.detail.childId));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('childSelected', handleChildSelected as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('childSelected', handleChildSelected as EventListener);
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

  const allMenuItems: MenuItem[] = [
    { name: 'Dashboard', icon: FiHome, path: '/dashboard', moduleKey: 'dashboard' },
    { name: 'Profile', icon: FiUser, path: selectedChildId ? `/profile/${selectedChildId}` : '/dashboard', moduleKey: 'profile' },
    { name: 'Homework', icon: FiBook, path: selectedChildId ? `/homework/${selectedChildId}` : '/dashboard', moduleKey: 'homework' },
    { name: 'Fees', icon: RupeeIcon, path: selectedChildId ? `/fees/${selectedChildId}` : '/dashboard', moduleKey: 'fees' },
    { name: 'Attendance', icon: FiCalendar, path: selectedChildId ? `/attendance/${selectedChildId}` : '/dashboard', moduleKey: 'attendance' },
    { name: 'Results', icon: FiAward, path: '/results', moduleKey: 'results' },
    { name: 'Report Card', icon: FiFileText, path: selectedChildId ? `/grades/${selectedChildId}` : '/dashboard', moduleKey: 'report_card' },
  ];

  const menuItems = permissions
    ? allMenuItems.filter((item) => isModuleAllowed(permissions, item.moduleKey))
    : allMenuItems;

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
      <div className={isCollapsed ? 'p-4' : 'px-5 py-4'}>
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/40 p-1.5"
              title={schoolName}
            >
              <SchoolLogo
                variant="sidebar-collapsed"
                src={schoolLogo}
                alt={schoolName}
              />
            </div>
            <button
              onClick={toggleSidebar}
              className="relative p-2 hover:bg-blue-600 rounded-lg transition-all duration-300"
              title="Expand Menu"
            >
              <FiMenu size={22} className="text-blue-200" />
            </button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600/40 p-1.5">
                <SchoolLogo variant="sidebar" src={schoolLogo} alt={schoolName} />
              </div>
              <div className="min-w-0 flex-1">
                <h1
                  className="text-sm font-bold text-white leading-snug line-clamp-2"
                  title={schoolName}
                >
                  {schoolName}
                </h1>
                <p className="text-xs text-blue-200 truncate">{PARENT_PORTAL_LABEL}</p>
              </div>
            </div>
            <button
              onClick={toggleSidebar}
              className="flex-shrink-0 p-2 hover:bg-blue-600 rounded-lg transition-all duration-300 mt-0.5"
              title="Collapse Menu"
            >
              <FiChevronsLeft size={20} className="text-blue-200" />
            </button>
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

