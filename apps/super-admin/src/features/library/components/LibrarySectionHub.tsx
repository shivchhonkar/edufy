'use client';

import Link from 'next/link';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import LibraryModuleLinks from './LibraryModuleLinks';

export type LibraryHubCard = {
  href: string;
  title: string;
  description?: string;
  soon?: boolean;
};

export default function LibrarySectionHub({
  title,
  description,
  cards,
}: {
  title: string;
  description: string;
  cards: LibraryHubCard[];
}) {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <LibraryModuleLinks />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-lg border border-gray-200 bg-white p-4 hover:border-primary-300 hover:bg-primary-50/30"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-gray-900">{card.title}</div>
                {card.soon && (
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                    Soon
                  </span>
                )}
              </div>
              {card.description && <div className="mt-1 text-sm text-gray-500">{card.description}</div>}
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
