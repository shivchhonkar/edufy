'use client';

import { useMemo, useState } from 'react';
import AuthPageLayout from '@/features/auth/components/AuthPageLayout';
import LoginForm from '@/features/auth/components/LoginForm';
import SchoolPicker from '@/features/auth/components/SchoolPicker';
import SchoolCodeEntry, {
  type SchoolCodeLookupPayload,
} from '@/features/auth/components/SchoolCodeEntry';
import {
  getLastSchoolCode,
  resolveInitialSchoolSelection,
  setLastSchoolCode,
  setLastSelectedSchoolId,
  type PublicSchoolOption,
} from '@/lib/selected-school';

type PlatformStep = 'enter-code' | 'select-school' | 'login';

export type PlatformPortal = 'default' | 'student' | 'parent';

type PlatformLoginFlowProps = {
  portal?: PlatformPortal;
};

const PORTAL_COPY: Record<
  PlatformPortal,
  { title: string; subtitle: string; loginLabel: string; identifierLabel: string }
> = {
  default: {
    title: 'Sign in to your school',
    subtitle: 'Enter your school code to get started',
    loginLabel: 'Login',
    identifierLabel: 'User ID',
  },
  student: {
    title: 'Student sign in',
    subtitle: 'Enter your school code, then sign in with admission number and password',
    loginLabel: 'Sign in',
    identifierLabel: 'Admission / registration number',
  },
  parent: {
    title: 'Parent sign in',
    subtitle: 'Enter your school code, then sign in with registered mobile or admission number',
    loginLabel: 'Sign in',
    identifierLabel: 'Mobile or admission number',
  },
};

export default function PlatformLoginFlow({ portal = 'default' }: PlatformLoginFlowProps) {
  const copy = PORTAL_COPY[portal];
  const [step, setStep] = useState<PlatformStep>(() =>
    getLastSchoolCode() ? 'enter-code' : 'enter-code',
  );
  const [lookup, setLookup] = useState<SchoolCodeLookupPayload | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<PublicSchoolOption | null>(null);

  const schools = useMemo(
    () => (lookup?.schools ?? []) as PublicSchoolOption[],
    [lookup?.schools],
  );

  const orgSlug = lookup?.organization?.slug ?? lookup?.school_code ?? 'platform';

  const handleCodeResolved = (payload: SchoolCodeLookupPayload) => {
    setLookup(payload);
    setLastSchoolCode(payload.school_code);

    const schoolOptions = payload.schools as PublicSchoolOption[];
    if (payload.manages_multiple_schools && schoolOptions.length > 1) {
      const initial = resolveInitialSchoolSelection(orgSlug, schoolOptions);
      setSelectedSchool(initial.school);
      setStep(initial.step);
      return;
    }

    if (schoolOptions.length === 1) {
      setSelectedSchool(schoolOptions[0]);
      setStep('login');
      return;
    }

    setStep('select-school');
  };

  const handleSelectSchool = (school: PublicSchoolOption) => {
    setSelectedSchool(school);
    setLastSelectedSchoolId(orgSlug, school.id);
    setStep('login');
  };

  const heading =
    step === 'enter-code'
      ? copy.title
      : step === 'select-school'
        ? 'Select your school'
        : 'Welcome back';

  const subtitle =
    step === 'enter-code'
      ? copy.subtitle
      : step === 'select-school'
        ? lookup?.organization?.name
          ? `Choose your campus under ${lookup.organization.name}.`
          : 'Choose the campus you want to sign in to.'
        : selectedSchool
          ? `Signing in to ${selectedSchool.name}`
          : 'Enter your credentials to continue.';

  return (
    <AuthPageLayout title={heading} subtitle={subtitle}>
      {step === 'enter-code' && (
        <SchoolCodeEntry initialCode={getLastSchoolCode() ?? ''} onResolved={handleCodeResolved} />
      )}

      {step === 'select-school' && lookup && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">School code</p>
            <p className="font-medium text-gray-900">{lookup.school_code}</p>
            <button
              type="button"
              onClick={() => {
                setLookup(null);
                setSelectedSchool(null);
                setStep('enter-code');
              }}
              className="mt-2 text-sm font-medium text-brand hover:text-primary-700"
            >
              Change school code
            </button>
          </div>
          <SchoolPicker
            schools={schools}
            selectedSchoolId={selectedSchool?.id ?? null}
            onSelect={handleSelectSchool}
          />
        </div>
      )}

      {step === 'login' && lookup && selectedSchool && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">School code</p>
            <p className="font-medium text-gray-900">{lookup.school_code}</p>
            <button
              type="button"
              onClick={() => {
                setLookup(null);
                setSelectedSchool(null);
                setStep('enter-code');
              }}
              className="mt-2 text-sm font-medium text-brand hover:text-primary-700"
            >
              Change school code
            </button>
          </div>

          <LoginForm
            showRegisterLink={false}
            submitLabel={copy.loginLabel}
            emailLabel={copy.identifierLabel}
            identifierMode="user-id"
            schoolId={selectedSchool.id}
            schoolCode={lookup.school_code}
            selectedSchoolName={selectedSchool.name}
            orgSlug={orgSlug}
            onChangeSchool={
              schools.length > 1 ? () => setStep('select-school') : undefined
            }
          />
        </div>
      )}
    </AuthPageLayout>
  );
}
