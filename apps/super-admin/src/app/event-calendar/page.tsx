'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import EventCalendarView from '@/features/calendar/components/EventCalendarView';

export default function EventCalendarPage() {
  return (
    <DashboardLayout>
      <EventCalendarView />
    </DashboardLayout>
  );
}
