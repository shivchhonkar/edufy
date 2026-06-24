'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import AcademicCalendarView from '@/features/academics/components/AcademicCalendarView';
import { FiCalendar } from 'react-icons/fi';

export default function AcademicCalendarPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary-50 p-2 text-primary-600">
            <FiCalendar className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl text-gray-900">Academic Calendar</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage holidays, exams, PTMs, events, and term dates for the academic year.
            </p>
          </div>
        </div>

        <AcademicCalendarView />
      </div>
    </DashboardLayout>
  );
}
