'use client';

import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useRef } from 'react';

interface LoginTurnstileFieldProps {
  onTokenChange: (token: string) => void;
  onExpire?: () => void;
  className?: string;
}

export default function LoginTurnstileField({
  onTokenChange,
  onExpire,
  className = '',
}: LoginTurnstileFieldProps) {
  const ref = useRef<TurnstileInstance>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  if (!siteKey) {
    return null;
  }

  return (
    <div className={className}>
      <Turnstile
        ref={ref}
        siteKey={siteKey}
        onSuccess={onTokenChange}
        onExpire={() => {
          onTokenChange('');
          onExpire?.();
          ref.current?.reset();
        }}
        onError={() => {
          onTokenChange('');
        }}
        options={{
          theme: 'light',
          size: 'flexible',
          appearance: 'always',
        }}
      />
    </div>
  );
}

export function isLoginTurnstileEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}
