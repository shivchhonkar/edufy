'use client';

import Link from 'next/link';
import {
  FiCreditCard,
  FiLayers,
  FiSearch,
  FiSettings,
  FiTrendingUp,
} from 'react-icons/fi';

const actions = [
  {
    title: 'Add New School',
    description: 'Register a new organization campus',
    href: '/organizations',
    icon: FiLayers,
    color: 'bg-blue-50 text-blue-600',
  },
  {
    title: 'Add Subscription Plan',
    description: 'Create or update a subscription',
    href: '/subscriptions',
    icon: FiTrendingUp,
    color: 'bg-purple-50 text-purple-600',
  },
  {
    title: 'View Payments',
    description: 'Review billing and pending dues',
    href: '/subscriptions',
    icon: FiCreditCard,
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    title: 'School Audit',
    description: 'Inspect school data and admin access',
    href: '/school-audit',
    icon: FiSearch,
    color: 'bg-amber-50 text-amber-600',
  },
  {
    title: 'System Settings',
    description: 'Manage organizations and limits',
    href: '/organizations',
    icon: FiSettings,
    color: 'bg-slate-100 text-slate-700',
  },
];

export default function QuickActionsCard() {
  return (
    <div className="dashboard-panel h-full">
      <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
      <div className="mt-4 space-y-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.title} href={action.href} className="dashboard-quick-action">
              <span className={`dashboard-quick-action-icon ${action.color}`}>
                <Icon size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">{action.title}</span>
                <span className="block text-xs text-slate-500">{action.description}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
