'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { FiClock, FiArrowLeft } from 'react-icons/fi';

const FEATURE_LABELS: Record<string, string> = {
  analytics: 'Analytics',
  'activity-logs': 'Activity Logs',
  'student-id-cards': 'Student ID Cards',
  'lesson-plans': 'Lesson Plans',
  biometric: 'Biometric Integration',
  'result-analytics': 'Result Analytics',
  hostel: 'Hostel Management',
  circulars: 'Circulars',
  notifications: 'Notifications',
  'email-campaigns': 'Email Campaigns',
  permissions: 'Permissions',
  'audit-logs': 'Audit Logs',
  integrations: 'Integrations',
};

function ComingSoonContent() {
  const searchParams = useSearchParams();
  const feature = searchParams.get('feature') || 'feature';
  const label =
    FEATURE_LABELS[feature] ||
    feature.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="max-w-lg mx-auto mt-16 text-center space-y-6">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-50 text-amber-600">
        <FiClock className="w-8 h-8" />
      </div>
      <div>
        <h1 className="text-2xl text-gray-900">{label}</h1>
        <p className="text-gray-600 mt-2">
          This module is planned and will be available in a future release.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
      >
        <FiArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>
    </div>
  );
}

export default function ComingSoonPage() {
  return (
    <DashboardLayout>
      <Suspense
        fallback={
          <div className="max-w-lg mx-auto mt-16 text-center text-gray-500">Loading…</div>
        }
      >
        <ComingSoonContent />
      </Suspense>
    </DashboardLayout>
  );
}
