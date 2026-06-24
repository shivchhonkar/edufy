'use client';

import { useState } from 'react';
import ClassFeeSetupPanel from '@/features/fees/components/ClassFeeSetupPanel';
import FeesPageHeader from '@/features/fees/components/FeesPageHeader';

export default function FeeSetupPage() {
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  return (
    <div className="space-y-4">
      <FeesPageHeader
        title="Fee Setup"
        description="Set up tuition, registration, and optional fees for each class in a few quick steps."
      />

      {message && (
        <p
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-green-200 bg-green-50 text-green-700'
          }`}
        >
          {message.text}
        </p>
      )}

      <ClassFeeSetupPanel
        onMessage={(text, type = 'success') => setMessage({ text, type })}
      />
    </div>
  );
}
