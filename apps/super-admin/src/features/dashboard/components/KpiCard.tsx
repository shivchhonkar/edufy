'use client';

import { IconType } from 'react-icons';

const styles = {
  blue: {
    icon: 'bg-blue-50 text-blue-600',
    value: 'text-gray-900',
  },
  green: {
    icon: 'bg-green-50 text-green-600',
    value: 'text-gray-900',
  },
  red: {
    icon: 'bg-red-50 text-red-600',
    value: 'text-gray-900',
  },
  yellow: {
    icon: 'bg-amber-50 text-amber-600',
    value: 'text-gray-900',
  },
  purple: {
    icon: 'bg-purple-50 text-purple-600',
    value: 'text-gray-900',
  },
  indigo: {
    icon: 'bg-indigo-50 text-indigo-600',
    value: 'text-gray-900',
  },
} as const;

type KpiColor = keyof typeof styles;

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: IconType;
  color?: KpiColor;
  onClick?: () => void;
}

export default function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'blue',
  onClick,
}: KpiCardProps) {
  const theme = styles[color];

  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-gray-200 transition-all' : ''
      }`}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
          <p className={`text-2xl mt-1 ${theme.value}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1.5 leading-snug">{subtitle}</p>}
        </div>
        <div className={`p-2.5 rounded-xl shrink-0 ${theme.icon}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
