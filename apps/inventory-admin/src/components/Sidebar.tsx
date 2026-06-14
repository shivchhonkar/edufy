'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { 
  FiHome, 
  FiPackage, 
  FiShoppingCart, 
  FiDollarSign,
  FiTag,
  FiBarChart,
  FiMenu,
  FiChevronsLeft,
  FiLogOut,
  FiBox
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
      const savedState = localStorage.getItem('inventorySidebarCollapsed');
      if (savedState === null) {
        localStorage.setItem('inventorySidebarCollapsed', 'false');
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

  const menuItems = [
    { name: 'Dashboard', icon: FiHome, path: '/' },
    { name: 'Items', icon: FiPackage, path: '/items' },
    { name: 'Categories', icon: FiTag, path: '/categories' },
    { name: 'Sales', icon: FiShoppingCart, path: '/sales' },
    { name: 'Transactions', icon: FiDollarSign, path: '/transactions' },
    { name: 'Reports', icon: FiBarChart, path: '/reports' },
  ];

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('inventorySidebarCollapsed', String(newState));
    if (onToggle) {
      onToggle(newState);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.cookie = 'token=; path=/; max-age=0';
    router.push('/login');
  };

  return (
    <div 
      className={`sidebar-container h-full text-white fixed left-0 top-0 overflow-y-auto transition-all duration-300 z-50 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
      style={{ 
        backgroundColor: '#4f46e5', // indigo-600
        color: 'white'
      }}
    >
      {/* Header */}
      <div className="p-6">
        {isCollapsed ? (
          <div className="flex justify-center">
            <button
              onClick={toggleSidebar}
              className="relative p-2 hover:bg-indigo-500 rounded-lg transition-all duration-300"
              title="Expand Menu"
            >
              <FiMenu size={22} className="text-indigo-200" />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiBox className="text-white" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg font-bold text-white truncate">Shribi Edufy</h1>
                  <p className="text-xs text-indigo-200 truncate">Inventory</p>
                </div>
              </div>
              <button
                onClick={toggleSidebar}
                className="flex-shrink-0 p-2 hover:bg-indigo-500 rounded-lg transition-all duration-300 ml-2"
                title="Collapse Menu"
              >
                <FiChevronsLeft size={20} className="text-indigo-200" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Menu Items */}
      <nav className="px-3 flex-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.name}
              href={item.path}
              className={`group relative flex items-center my-1 px-3 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-500 text-white'
                  : 'text-indigo-100 hover:bg-indigo-500 hover:text-white'
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
      <div className="p-3 border-t border-indigo-500">
        <button
          onClick={handleLogout}
          className={`group relative flex items-center w-full px-3 py-3 rounded-lg transition-all duration-200 text-indigo-100 hover:bg-indigo-500 hover:text-white ${
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

























































