'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar onToggle={setSidebarCollapsed} />
      
      {/* Main content */}
      <div 
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        {/* Mobile header spacing */}
        <div className="lg:hidden h-16" />
        
        <Header />
        
        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}


























































