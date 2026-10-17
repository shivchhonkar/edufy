'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { TimetableTab } from '@/features/timetable/types';
import TimetableAssignmentsTab from '@/features/timetable/components/TimetableAssignmentsTab';
import TimetableAvailabilityTab from '@/features/timetable/components/TimetableAvailabilityTab';
import TimetableBuilderTab from '@/features/timetable/components/TimetableBuilderTab';
import TimetableCurriculumTab from '@/features/timetable/components/TimetableCurriculumTab';
import TimetablePeriodMasterTab from '@/features/timetable/components/TimetablePeriodMasterTab';
import TimetableSetupTab from '@/features/timetable/components/TimetableSetupTab';
import TimetableTeacherViewTab from '@/features/timetable/components/TimetableTeacherViewTab';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { moduleTabBarClass, moduleTabClass } from '@/shared/components/common/ModuleTabs';
import { FiBook } from 'react-icons/fi';

const TABS: { id: TimetableTab; label: string; step?: string }[] = [
  { id: 'setup', label: 'School Working Days', step: '1' },
  { id: 'periods', label: 'Period Master', step: '2' },
  { id: 'curriculum', label: 'Curriculum', step: '3' },
  { id: 'assignments', label: 'Assignments', step: '4' },
  { id: 'availability', label: 'Availability', step: '5' },
  { id: 'builder', label: 'Builder', step: '6–7' },
  { id: 'teacher', label: 'Teacher View' },
];

export default function TimetablePage() {
  const [activeTab, setActiveTab] = useState<TimetableTab>('builder');

  return (
    <DashboardLayout>
      <div className="min-w-0 max-w-full space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Timetable</h1>
            <p className="mt-0.5 text-xs text-gray-500">
              Set working days and periods, then drag subjects onto the class routine.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/academics/assignments"
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              Assignments
            </Link>
            <Link
              href="/academics/subjects"
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              <FiBook size={14} />
              Subjects
            </Link>
          </div>
        </div>

        <nav className={moduleTabBarClass} aria-label="Timetable tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={moduleTabClass(activeTab === tab.id)}
            >
              {tab.step && <span className="mr-1 text-[10px] opacity-70">{tab.step}</span>}
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === 'setup' && <TimetableSetupTab />}
        {activeTab === 'periods' && <TimetablePeriodMasterTab />}
        {activeTab === 'curriculum' && <TimetableCurriculumTab />}
        {activeTab === 'assignments' && <TimetableAssignmentsTab />}
        {activeTab === 'availability' && <TimetableAvailabilityTab />}
        {activeTab === 'builder' && <TimetableBuilderTab />}
        {activeTab === 'teacher' && <TimetableTeacherViewTab />}
      </div>
    </DashboardLayout>
  );
}
