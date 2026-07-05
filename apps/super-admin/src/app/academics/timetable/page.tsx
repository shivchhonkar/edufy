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
import { FiBook, FiCalendar } from 'react-icons/fi';

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
      <div className="space-y-6 min-w-0 max-w-full">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-xl flex items-center gap-2 text-gray-900">
              <FiCalendar className="text-primary-600" />
              Timetable
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Three layers: curriculum allocation, teacher assignments, and drag-and-drop scheduling with conflict checks.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/academics/assignments"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100"
            >
              Assignments
            </Link>
            <Link
              href="/academics/subjects"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100"
            >
              <FiBook className="w-4 h-4" />
              Subjects
            </Link>
          </div>
        </div>

        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex gap-1 min-w-max" aria-label="Timetable tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.step && (
                  <span className="ml-1.5 text-[10px] font-normal text-gray-400">({tab.step})</span>
                )}
              </button>
            ))}
          </nav>
        </div>

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
