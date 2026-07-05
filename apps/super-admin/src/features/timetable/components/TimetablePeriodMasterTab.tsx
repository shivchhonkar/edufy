'use client';

import TimetablePeriodMasterSection from '@/features/timetable/components/TimetablePeriodMasterSection';

export default function TimetablePeriodMasterTab() {
  return (
    <div className="space-y-4">
      {/* <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
        <p className="font-medium">Step 2 — Period Master</p>
        <p className="text-xs mt-0.5 text-blue-700">
          Define the school-wide bell schedule. Break and lunch slots are shown but cannot be scheduled.
        </p>
      </div> */}
      <TimetablePeriodMasterSection />
    </div>
  );
}
