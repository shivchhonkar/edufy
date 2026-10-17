'use client';

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
  actions,
}: FeesPageHeaderProps) {
  return (
    <header>
      {/* <Link
        href={backHref}
        className=" flex-start inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-2 transition-colors"
      >
        <FiArrowLeft size={14} aria-hidden />
        {backLabel}
      </Link> */}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-medium text-gray-900">{title}</h1>
          {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center justify-end gap-2">{actions}</div>}
      </div>
    </header>
  );
}
