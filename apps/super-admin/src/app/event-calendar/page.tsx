'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import EventCalendarView from '@/features/calendar/components/EventCalendarView';
import { FiCalendar } from 'react-icons/fi';

export default function EventCalendarPage() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
              <FiCalendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl text-gray-900">Event Calendar</h1>
              <p className="text-gray-600 mt-1">
                Create school events and holidays visible to parents on the parent portal.
              </p>
            </div>
          </div>
        </div>
        <EventCalendarView />
      </div>
    </DashboardLayout>
  );
}
