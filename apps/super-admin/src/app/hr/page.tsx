'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import HrNav from '@/features/hr/components/HrNav';
import Link from 'next/link';
import RupeeIcon from '@/shared/components/icons/RupeeIcon';
import { FiBriefcase, FiUsers, FiCalendar, FiClock, FiTrendingUp } from 'react-icons/fi';

export default function HrOverviewPage() {
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => {
    Promise.all([
      fetch('/api/hr/reports?type=headcount').then((r) => r.json()),
      fetch('/api/leaves?status=pending').then((r) => r.json()),
      fetch('/api/resignations?status=pending').then((r) => r.json()),
    ]).then(([headcount, leaves, resignations]) => {
      if (headcount.success) {
        setStats({
          active: headcount.data.summary?.active || 0,
          total: headcount.data.summary?.total || 0,
          pendingLeaves: leaves.data?.length || 0,
          pendingResignations: resignations.data?.length || 0,
        });
      }
    }).catch(() => {});
  }, []);

  const cards = [
    { label: 'Active Staff', value: stats.active, icon: FiUsers, href: '/staff', color: 'text-blue-600' },
    { label: 'Pending Leaves', value: stats.pendingLeaves, icon: FiCalendar, href: '/hr/leave-management', color: 'text-amber-600' },
    { label: 'Pending Resignations', value: stats.pendingResignations, icon: FiBriefcase, href: '/hr/resignations', color: 'text-red-600' },
    { label: 'Payroll', value: '0', icon: RupeeIcon, href: '/payroll', color: 'text-green-600' },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl text-gray-900">HR Management</h1>
          <p className="text-gray-600 mt-1">Manage departments, leaves, payroll, and employee lifecycle</p>
        </div>
        <HrNav />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map((c) => (
            <Link key={c.label} href={c.href} className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <c.icon className={`w-6 h-6 ${c.color} mb-2`} />
              <p className="text-xs text-gray-500">{c.label}</p>
              <p className="text-xl text-gray-900">{c.value ?? '0'}</p>
            </Link>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Link href="/ess" className="bg-primary-50 border border-primary-200 rounded-xl p-6 hover:bg-primary-100 transition-colors">
            <FiTrendingUp className="w-6 h-6 text-primary-600 mb-2" />
            <h3 className="font-semibold text-primary-900">Employee Self Service</h3>
            <p className="text-sm text-primary-700 mt-1">Staff portal for leaves, attendance, and payslips</p>
          </Link>
          <Link href="/attendance/staff" className="bg-white border rounded-xl p-6 hover:shadow-md transition-shadow">
            <FiClock className="w-6 h-6 text-gray-600 mb-2" />
            <h3 className="font-semibold">Staff Attendance</h3>
            <p className="text-sm text-gray-600 mt-1">Mark attendance, punch logs, and reports</p>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
