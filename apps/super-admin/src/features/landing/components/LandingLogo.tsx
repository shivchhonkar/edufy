import Image from 'next/image';

import { LOGO_SRC } from '@/lib/site-seo';

interface LandingLogoProps {
  size?: number;
  showText?: boolean;
  variant?: 'light' | 'dark' | 'default';
  className?: string;
}

export default function LandingLogo({
  size = 40,
  showText = true,
  variant = 'default',
  className = '',
}: LandingLogoProps) {
  const isDark = variant === 'dark' || variant === 'default';

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
          <span className="text-lg leading-tight">
            <span className={isDark ? 'text-white' : 'text-gray-900'}>Shribi</span>{' '}
            <span className={`font-bold ${isDark ? 'text-brand-light' : 'text-primary-900'}`}>
              Edufy
            </span>
          </span>
          <span
            className={`block text-[10px] uppercase tracking-wider ${
              isDark ? 'text-primary-100' : 'text-primary-800'
            }`}
          >
            School ERP
          </span>
        </div>
      )}
    </div>
  );
}
