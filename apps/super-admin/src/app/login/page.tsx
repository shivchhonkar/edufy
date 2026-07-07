'use client';

import { useEffect, useState } from 'react';
import AuthPageLayout from '@/features/auth/components/AuthPageLayout';
import LoginForm from '@/features/auth/components/LoginForm';
import SchoolPicker from '@/features/auth/components/SchoolPicker';
import TenantBrandedLoginLayout, {
  TENANT_LOGIN_BUTTON_CLASS,
  TENANT_LOGIN_BUTTON_STYLE,
} from '@/features/auth/components/TenantBrandedLoginLayout';
import type { TenantLoginBranding } from '@/features/auth/types/tenant-login-branding';
import {
  resolveInitialSchoolSelection,
  setLastSelectedSchoolId,
  type PublicSchoolOption,
} from '@/lib/selected-school';

type LoginStep = 'select-school' | 'login';

type OrgLoginContext = {
  organization: { id: number; name: string; slug: string; type?: string };
  schools: PublicSchoolOption[];
};

export default function LoginPage() {
  const [branding, setBranding] = useState<TenantLoginBranding | null | undefined>(undefined);
  const [orgContext, setOrgContext] = useState<OrgLoginContext | null>(null);
  const [step, setStep] = useState<LoginStep>('login');
  const [selectedSchool, setSelectedSchool] = useState<PublicSchoolOption | null>(null);

  useEffect(() => {
    async function loadBranding() {
      try {
        const tenantRes = await fetch('/api/tenant/branding');
        const tenantData = await tenantRes.json();
        if (tenantRes.ok && tenantData.success && tenantData.data) {
          setBranding(tenantData.data as TenantLoginBranding);
          return;
        }

        const [orgBrandingRes, orgSchoolsRes] = await Promise.all([
          fetch('/api/org/branding'),
          fetch('/api/org/schools/public'),
        ]);
        const orgData = await orgBrandingRes.json();
        const schoolsData = await orgSchoolsRes.json();

        if (
          orgBrandingRes.ok &&
          orgData.success &&
          orgData.data?.organization &&
          schoolsData.success &&
          schoolsData.data?.schools
        ) {
          const org = orgData.data.organization as {
            id: number;
            name: string;
            slug: string;
            type?: string;
          };
          const theme = orgData.data.branding as {
            primary_color?: string;
            secondary_color?: string;
            logo_url?: string | null;
            tagline?: string | null;
            subdomain?: string;
          } | null;
          const schools = schoolsData.data.schools as PublicSchoolOption[];

          setOrgContext({ organization: org, schools });
          setBranding({
            tenant: { id: org.id, name: org.name, slug: org.slug },
            school: {
              name: org.name,
              address: '',
              phone: '',
              email: '',
              logo_url: theme?.logo_url ?? null,
            },
            branding: {
              primary_color: theme?.primary_color || '#0D3D75',
              secondary_color: theme?.secondary_color || '#4DC4F0',
              tagline: theme?.tagline ?? null,
              subdomain: theme?.subdomain || org.slug,
              support_phone: null,
              support_email: null,
            },
          });

          const initial = resolveInitialSchoolSelection(org.slug, schools);
          setSelectedSchool(initial.school);
          setStep(initial.step);
          if (initial.school && schools.length === 1) {
            setLastSelectedSchoolId(org.slug, initial.school.id);
          }
          return;
        }

        setBranding(null);
      } catch {
        setBranding(null);
      }
    }

    void loadBranding();
  }, []);

  const handleSelectSchool = (school: PublicSchoolOption) => {
    setSelectedSchool(school);
    if (orgContext) {
      setLastSelectedSchoolId(orgContext.organization.slug, school.id);
    }
    setStep('login');
  };

  if (branding === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
      </div>
    );
  }

  if (branding) {
    const isOrgFlow = !!orgContext;
    const showSchoolPicker = isOrgFlow && step === 'select-school';
    const showLogin = !isOrgFlow || (step === 'login' && !!selectedSchool);

    return (
      <TenantBrandedLoginLayout
        branding={branding}
        heading={showSchoolPicker ? 'Select your school' : 'Welcome!'}
        subheading={
          showSchoolPicker
            ? 'Choose the campus you want to sign in to.'
            : 'Kindly enter your credentials to access your account.'
        }
        footerLabel={showSchoolPicker ? null : selectedSchool?.slug ?? undefined}
      >
        {showSchoolPicker && orgContext && (
          <SchoolPicker
            schools={orgContext.schools}
            selectedSchoolId={selectedSchool?.id ?? null}
            onSelect={handleSelectSchool}
          />
        )}

        {showLogin && (
          <LoginForm
            showRegisterLink={!isOrgFlow}
            submitLabel="Login"
            emailLabel="User ID"
            identifierMode="user-id"
            buttonClassName={TENANT_LOGIN_BUTTON_CLASS}
            buttonStyle={TENANT_LOGIN_BUTTON_STYLE}
            schoolId={isOrgFlow ? selectedSchool?.id : undefined}
            selectedSchoolName={isOrgFlow ? selectedSchool?.name : undefined}
            orgSlug={isOrgFlow ? orgContext?.organization.slug : undefined}
            onChangeSchool={
              isOrgFlow && orgContext.schools.length > 1
                ? () => setStep('select-school')
                : undefined
            }
          />
        )}
      </TenantBrandedLoginLayout>
    );
  }

  return (
    <AuthPageLayout title="Welcome back" subtitle="Sign in to your school admin dashboard">
      <LoginForm />
    </AuthPageLayout>
  );
}
