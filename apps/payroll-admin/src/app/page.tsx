'use client';

import React from 'react';
import { FiDollarSign, FiUsers, FiCreditCard, FiTrendingUp, FiFileText, FiSettings } from 'react-icons/fi';
import { StatCard } from '@EduLakhya/ui';
import { formatCurrency } from '@EduLakhya/utils';

export default function PayrollAdmin() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl text-gray-900">Fee Management</h1>
              <p className="text-sm text-gray-600">Shribi Edufy Payroll Admin</p>
            </div>
            <button className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Total Collected This Month" 
            value={formatCurrency(125000)} 
            icon={FiDollarSign} 
            color="green"
            trend={{ value: '+15%', isPositive: true }}
          />
          <StatCard 
            title="Pending Fees" 
            value={formatCurrency(45000)} 
            icon={FiCreditCard} 
            color="red" 
          />
          <StatCard 
            title="Students with Dues" 
            value="78" 
            icon={FiUsers} 
            color="yellow" 
          />
          <StatCard 
            title="Collection Rate" 
            value="85%" 
            icon={FiTrendingUp} 
            color="blue" 
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NavCard 
            title="Fee Structures" 
            description="Create and manage fee structures by class" 
            icon={FiSettings}
            href="/fee-structures"
          />
          <NavCard 
            title="Student Fees" 
            description="View and manage individual student fees" 
            icon={FiUsers}
            href="/student-fees"
          />
          <NavCard 
            title="Record Payment" 
            description="Record fee payments from students" 
            icon={FiDollarSign}
            href="/payments"
          />
          <NavCard 
            title="Generate Receipts" 
            description="Create and print fee receipts" 
            icon={FiFileText}
            href="/receipts"
          />
          <NavCard 
            title="Fee Reports" 
            description="View collection reports and analytics" 
            icon={FiTrendingUp}
            href="/reports"
          />
          <NavCard 
            title="Pending Collections" 
            description="Track overdue and pending fees" 
            icon={FiCreditCard}
            href="/pending"
          />
        </div>
      </div>
    </div>
  );
}

function NavCard({ title, description, icon: Icon, href }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
      <Icon className="w-10 h-10 text-green-600 mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

