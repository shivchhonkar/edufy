'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import SettingsNav from '@/features/settings/components/SettingsNav';
import { useDialog } from '@/shared/context/DialogContext';

type PaymentSettingsResponse = {
  razorpay: {
    enabled: boolean;
    key_id: string;
    has_secret: boolean;
  };
};

export default function PaymentSettingsPage() {
  const { alert } = useDialog();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [hasSecret, setHasSecret] = useState(false);

  useEffect(() => {
    void loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/payment');
      const payload = await response.json();
      if (!payload.success) {
        throw new Error(payload.error || 'Failed to load payment settings');
      }
      const data = payload.data as PaymentSettingsResponse;
      setEnabled(data.razorpay.enabled !== false);
      setKeyId(data.razorpay.key_id || '');
      setHasSecret(Boolean(data.razorpay.has_secret));
    } catch (error) {
      await alert(error instanceof Error ? error.message : 'Failed to load payment settings', {
        type: 'error',
        title: 'Error',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings/payment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay: {
            enabled,
            key_id: keyId.trim(),
            key_secret: keySecret.trim(),
          },
        }),
      });
      const payload = await response.json();
      if (!payload.success) {
        throw new Error(payload.error || 'Failed to save payment settings');
      }
      setKeySecret('');
      setHasSecret(Boolean(payload.data?.razorpay?.has_secret));
      await alert('Payment gateway settings saved.', { type: 'success', title: 'Saved' });
    } catch (error) {
      await alert(error instanceof Error ? error.message : 'Failed to save payment settings', {
        type: 'error',
        title: 'Error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <SettingsNav />
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Payment Gateway</h1>
            <p className="text-sm text-gray-500 mt-1">
              Configure Razorpay keys for parent portal online fee payments.
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">Loading payment settings...</p>
          ) : (
            <>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(event) => setEnabled(event.target.checked)}
                />
                Enable online fee payments
              </label>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Razorpay Key ID</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={keyId}
                  onChange={(event) => setKeyId(event.target.value)}
                  placeholder="rzp_test_xxxxxxxx"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Razorpay Key Secret</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={keySecret}
                  onChange={(event) => setKeySecret(event.target.value)}
                  placeholder={hasSecret ? 'Secret is saved. Enter only to replace.' : 'Enter key secret'}
                  type="password"
                />
                {hasSecret ? (
                  <p className="text-xs text-green-700 mt-1">A key secret is already configured.</p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => void saveSettings()}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
