'use client';

import Link from 'next/link';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import InventoryModuleLinks from './InventoryModuleLinks';

export default function InventorySectionHub({
  title,
  description,
  cards,
}: {
  title: string;
  description: string;
  cards: { href: string; title: string; description?: string }[];
}) {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <InventoryModuleLinks />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-lg border border-gray-200 bg-white p-4 hover:border-primary-300 hover:bg-primary-50/30"
            >
              <div className="font-medium text-gray-900">{card.title}</div>
              {card.description && <div className="mt-1 text-sm text-gray-500">{card.description}</div>}
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
