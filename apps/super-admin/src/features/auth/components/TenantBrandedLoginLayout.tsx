'use client';

import type { CSSProperties, ReactNode } from 'react';
import { FiBookOpen, FiCalendar, FiClock, FiMail, FiPhone, FiSettings } from 'react-icons/fi';
import LandingLogo from '@/features/landing/components/LandingLogo';
import type { TenantLoginBranding } from '@/features/auth/types/tenant-login-branding';

/** Fixed monochrome palette for tenant login — independent of school theme colors. */
const BW = {
  black: '#111827',
  charcoal: '#1f2937',
  slate: '#374151',
  muted: '#6b7280',
  border: '#e5e7eb',
  surface: '#f9fafb',
  white: '#ffffff',
} as const;

interface TenantBrandedLoginLayoutProps {
  branding: TenantLoginBranding;
  children: ReactNode;
}

export default function TenantBrandedLoginLayout({
  branding,
  children,
}: TenantBrandedLoginLayoutProps) {
  const { school, branding: theme } = branding;
  const supportPhone = theme.support_phone || school.phone;
  const supportEmail = theme.support_email || school.email;
  const schoolCode = theme.subdomain.toUpperCase();

  const themeStyle = {
    '--theme-primary-600': BW.black,
    '--theme-primary-700': BW.charcoal,
    '--theme-brand-dark': BW.black,
    '--theme-secondary': BW.slate,
    '--theme-primary-100': BW.border,
  } as CSSProperties;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white" style={themeStyle}>
      {/* Left — monochrome brand panel */}
      <div
        className="hidden lg:flex lg:w-[42%] xl:w-[40%] relative overflow-hidden flex-col justify-between p-8 xl:p-10 text-white"
        style={{
          background: `linear-gradient(160deg, ${BW.black} 0%, ${BW.charcoal} 45%, ${BW.slate} 100%)`,
        }}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -top-10 -left-10 h-56 w-56 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-0 h-64 w-64 rounded-full bg-gray-400 blur-3xl" />
        </div>

        <div className="relative flex items-center gap-3">
          {school.logo_url ? (
            <img
              src={school.logo_url}
              alt=""
              className="h-14 w-14 rounded-full object-contain bg-white p-1 shadow-md ring-1 ring-white/20"
            />
          ) : (
            <div className="h-14 w-14 rounded-full bg-white flex items-center justify-center text-lg font-bold text-gray-900 shadow-md">
              {school.name.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-lg font-bold leading-snug">{school.name}</p>
            {school.address && (
              <p className="text-sm text-gray-300 mt-0.5 max-w-xs">{school.address}</p>
            )}
          </div>
        </div>

        <div className="relative my-8">
          {/* <div className="rounded-2xl bg-white shadow-xl p-6 max-w-md mx-auto ring-1 ring-gray-200">
            <div className="grid grid-cols-2 gap-3 text-center text-xs text-gray-600">
              <div className="rounded-lg bg-gray-50 p-3 border border-gray-200">
                <FiCalendar className="mx-auto mb-1 text-gray-900" size={20} />
                Time Table
              </div>
              <div className="rounded-lg bg-gray-50 p-3 border border-gray-200">
                <FiBookOpen className="mx-auto mb-1 text-gray-900" size={20} />
                Homework
              </div>
              <div className="rounded-lg bg-gray-50 p-3 border border-gray-200">
                <FiClock className="mx-auto mb-1 text-gray-900" size={20} />
                Attendance
              </div>
              <div className="rounded-lg bg-gray-50 p-3 border border-gray-200">
                <FiSettings className="mx-auto mb-1 text-gray-900" size={20} />
                Admin Portal
              </div>
            </div>
          </div> */}
        </div>

        <p className="relative text-sm text-gray-300">
          {theme.tagline || 'Secure school management portal for staff and administrators.'}
        </p>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
        <div className="lg:hidden border-b border-gray-200 bg-white px-4 py-3 flex items-center gap-3">
          {school.logo_url ? (
            <img
              src={school.logo_url}
              alt=""
              className="h-10 w-10 rounded-full object-contain ring-1 ring-gray-200"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gray-900 flex items-center justify-center text-sm font-bold text-white">
              {school.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{school.name}</p>
            {school.address && (
              <p className="text-xs text-gray-500 truncate">{school.address}</p>
            )}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-md">
            <div className="hidden lg:flex items-center gap-3 mb-8">
              {school.logo_url ? (
                <img
                  src={school.logo_url}
                  alt=""
                  className="h-16 w-16 rounded-full object-contain border border-gray-200 bg-white p-1 shadow-sm"
                />
              ) : (
                <div className="h-16 w-16 rounded-full flex items-center justify-center text-xl font-bold text-white bg-gray-900 shadow-sm">
                  {school.name.charAt(0)}
                </div>
              )}
              <div>
                <h1 className="text-xl text-gray-900 leading-snug">{school.name}</h1>
                {school.address && <p className="text-xs text-gray-500 mt-0.5">{school.address}</p>}
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl text-gray-900">Welcome!</h2>
              <p className="text-sm text-gray-500 mt-1">
                Kindly enter your credentials to access your account.
              </p>
            </div>

            <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-6 sm:p-8">
              {children}
            </div>

            {(supportPhone || supportEmail) && (
              <div className="mt-6 space-y-1.5 text-center text-sm text-gray-600">
                {supportPhone && (
                  <p className="inline-flex items-center justify-center gap-2">
                    <FiPhone size={14} className="text-gray-900" />
                    <a
                      href={`tel:${supportPhone.replace(/\s/g, '')}`}
                      className="hover:text-gray-900 hover:underline"
                    >
                      {supportPhone}
                    </a>
                  </p>
                )}
                {supportEmail && (
                  <p className="inline-flex items-center justify-center gap-2 ml-2">
                    <FiMail size={14} className="text-gray-900" />
                    <a href={`mailto:${supportEmail}`} className="hover:text-gray-900 hover:underline">
                      {supportEmail}
                    </a>
                  </p>
                )}
                <p className="text-xs text-gray-400 pt-1">
                  (9:00 AM to 5:30 PM, Monday – Saturday)
                </p>
              </div>
            )}

            <p className="mt-4 text-center text-xs font-semibold text-gray-500">
              School code for mobile app:{' '}
              <span className="font-bold text-gray-900">{schoolCode}</span>
            </p>
          </div>
        </div>

        <div className="pb-6 px-4 flex flex-col items-center gap-2 text-xs text-gray-400">
          <div className="flex items-center gap-2 grayscale">
            <span>Powered by</span>
            <LandingLogo size={22} />
          </div>
          <p>&copy; {new Date().getFullYear()} Shribi Edufy. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

export const TENANT_LOGIN_BUTTON_CLASS =
  'w-full flex items-center justify-center gap-2 py-3 text-sm font-bold uppercase tracking-wide text-white bg-gray-900 rounded-md transition-colors hover:bg-black focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

export const TENANT_LOGIN_BUTTON_STYLE = { backgroundColor: BW.black } as CSSProperties;
