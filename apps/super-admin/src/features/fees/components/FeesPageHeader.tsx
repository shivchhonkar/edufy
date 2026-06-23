'use client';

import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';

interface FeesPageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}

export default function FeesPageHeader({
  title,
  description,
  backHref = '/fees/dashboard',
  backLabel = 'Back to Dashboard',
  actions,
}: FeesPageHeaderProps) {
  return (
    <header>
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-2 transition-colors"
      >
        <FiArrowLeft size={14} aria-hidden />
        {backLabel}
      </Link>

      <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1">
        <h1 className="col-start-1 row-start-1 text-xl font-semibold text-gray-900">{title}</h1>
        {actions && (
          <div className="col-start-2 row-start-1 flex shrink-0 items-center justify-end">
            {actions}
          </div>
        )}
        {description && (
          <p className="col-span-2 row-start-2 text-sm text-gray-600">{description}</p>
        )}
      </div>
    </header>
  );
}
