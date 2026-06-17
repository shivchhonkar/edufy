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
    <header className={actions ? 'flex flex-wrap items-start justify-between gap-4' : undefined}>
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-2 transition-colors"
        >
          <FiArrowLeft size={14} aria-hidden />
          {backLabel}
        </Link>
        <h1 className="text-xl text-gray-900">{title}</h1>
        {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
      </div>
      {actions}
    </header>
  );
}
