'use client';

import { Suspense, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import AlumniDirectoryTab from '@/features/alumni/components/AlumniDirectoryTab';
import AlumniHigherEducationTab from '@/features/alumni/components/AlumniHigherEducationTab';
import AlumniEmploymentTab from '@/features/alumni/components/AlumniEmploymentTab';
import AlumniEventsTab from '@/features/alumni/components/AlumniEventsTab';
import AlumniIdCardsTab from '@/features/alumni/components/AlumniIdCardsTab';
import AlumniSuccessStoriesTab from '@/features/alumni/components/AlumniSuccessStoriesTab';
import { FiArrowLeft, FiUserCheck } from 'react-icons/fi';

type TabId =
  | 'directory'
  | 'higher-education'
  | 'employment'
  | 'events'
  | 'id-cards'
  | 'success-stories';

const TAB_ITEMS: { id: TabId; label: string }[] = [
  { id: 'directory', label: 'Alumni Directory' },
  { id: 'higher-education', label: 'Higher Education' },
  { id: 'employment', label: 'Employment' },
  { id: 'events', label: 'Alumni Events' },
  { id: 'id-cards', label: 'Alumni ID Cards' },
  { id: 'success-stories', label: 'Success Stories' },
];

const TAB_DESCRIPTIONS: Record<TabId, string> = {
  directory: 'Browse alumni who passed the highest class and exited with Passed Final Class.',
  'higher-education': 'Track college and university details for alumni.',
  employment: 'Record current and past employment information.',
  events: 'Plan reunions, networking sessions, and alumni gatherings.',
  'id-cards': 'Generate and print alumni identity cards.',
  'success-stories': 'Highlight alumni achievements and publish success stories.',
};

export default function AlumniManagementPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center py-16 text-gray-500">Loading…</div>
        </DashboardLayout>
      }
    >
      <AlumniManagementPageContent />
    </Suspense>
  );
}

function AlumniManagementPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTab = useMemo<TabId>(() => {
    const tab = searchParams.get('tab') as TabId | null;
    return TAB_ITEMS.some((item) => item.id === tab) ? tab! : 'directory';
  }, [searchParams]);

  const switchTab = useCallback(
    (tab: TabId) => {
      router.replace(`/students/alumni-management?tab=${tab}`);
    },
    [router]
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          {/* <Link
            href="/students"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-1"
          >
            <FiArrowLeft size={14} />
            Back to Students
          </Link> */}
          <h1 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            {/* <FiUserCheck className="text-primary-600" /> */}
            Alumni Management
          </h1>
          {/* <p className="text-sm text-gray-500 mt-0.5">{TAB_DESCRIPTIONS[activeTab]}</p> */}
        </div>

        <div className="border-b">
          <nav className="flex gap-1 min-w-max overflow-x-auto">
            {TAB_ITEMS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'directory' && <AlumniDirectoryTab />}
        {activeTab === 'higher-education' && <AlumniHigherEducationTab />}
        {activeTab === 'employment' && <AlumniEmploymentTab />}
        {activeTab === 'events' && <AlumniEventsTab />}
        {activeTab === 'id-cards' && <AlumniIdCardsTab />}
        {activeTab === 'success-stories' && <AlumniSuccessStoriesTab />}
      </div>
    </DashboardLayout>
  );
}
