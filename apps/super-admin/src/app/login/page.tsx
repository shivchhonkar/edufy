'use client';

import { useEffect, useState } from 'react';
import AuthPageLayout from '@/features/auth/components/AuthPageLayout';
import LoginForm from '@/features/auth/components/LoginForm';
import TenantBrandedLoginLayout, {
  TENANT_LOGIN_BUTTON_CLASS,
  TENANT_LOGIN_BUTTON_STYLE,
} from '@/features/auth/components/TenantBrandedLoginLayout';
import type { TenantLoginBranding } from '@/features/auth/types/tenant-login-branding';

export default function LoginPage() {
  const [branding, setBranding] = useState<TenantLoginBranding | null | undefined>(undefined);

  useEffect(() => {
    fetch('/api/tenant/branding')
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.success && data.data) {
          setBranding(data.data as TenantLoginBranding);
          return;
        }
        setBranding(null);
      })
      .catch(() => setBranding(null));
  }, []);

  if (branding === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
      </div>
    );
  }

  if (branding) {
    return (
      <TenantBrandedLoginLayout branding={branding}>
        <LoginForm
          showRegisterLink={false}
          submitLabel="Login"
          emailLabel="User ID"
          buttonClassName={TENANT_LOGIN_BUTTON_CLASS}
          buttonStyle={TENANT_LOGIN_BUTTON_STYLE}
        />
      </TenantBrandedLoginLayout>
    );
  }

  return (
    <AuthPageLayout title="Welcome back" subtitle="Sign in to your school admin dashboard">
      <LoginForm />
    </AuthPageLayout>
  );
}
