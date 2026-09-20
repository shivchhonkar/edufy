'use client';

import { useState } from 'react';
import FeeSetupScreen from '@/features/fees/components/FeeSetupScreen';
import FeeSetupLinks from '@/features/fees/components/FeeSetupLinks';

export default function FeeSetupPage() {
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  return (
    <div className="space-y-4">
      {message && (
        <p
          role="alert"
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-green-200 bg-green-50 text-green-700'
          }`}
        >
          {message.text}
        </p>
      )}

      <FeeSetupLinks />

      <FeeSetupScreen
        onMessage={(text, type = 'success') => setMessage({ text, type })}
      />
    </div>
  );
}
