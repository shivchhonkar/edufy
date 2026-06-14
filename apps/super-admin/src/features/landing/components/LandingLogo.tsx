import Image from 'next/image';

import { LOGO_SRC } from '@/lib/site-seo';

interface LandingLogoProps {
  size?: number;
  showText?: boolean;
  variant?: 'light' | 'dark';
  className?: string;
}

export default function LandingLogo({
  size = 40,
  showText = true,
  variant = 'light',
  className = '',
}: LandingLogoProps) {
  const isDark = variant === 'dark';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Image
        src={LOGO_SRC}
        alt="Shribi Edufy"
        width={size}
        height={size}
        className="object-contain"
        priority
      />
      {showText && (
        <div>
          <span
            className={`text-lg leading-tight ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            <span className="text-lg">Shribi</span> <span className="text-lg font-bold">Edufy</span>
          </span>
          <span
            className={`block text-[10px] uppercase tracking-wider ${
              isDark ? 'text-primary-200' : 'text-gray-500'
            }`}
          >
            School ERP
          </span>
        </div>
      )}
    </div>
  );
}
