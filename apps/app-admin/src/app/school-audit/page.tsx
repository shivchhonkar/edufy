'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiExternalLink, FiLogIn, FiRefreshCw } from 'react-icons/fi';
import type { SchoolAuditReport, SchoolListItem } from '@/lib/school-audit';
import SchoolAuditReportView from '@/features/audit/components/SchoolAuditReportView';
import {
  getSchoolAdminBaseUrl,
  getSchoolAdminLoginUrl,
} from '@/features/audit/utils/school-urls';
import { authFetch } from '@/lib/auth';

function formatSyncTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hr${hours === 1 ? '' : 's'} ago`;
}

export default function SchoolAuditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSchoolId = searchParams.get('school') ?? '';

  const [schools, setSchools] = useState<SchoolListItem[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState(initialSchoolId);
  const [report, setReport] = useState<SchoolAuditReport | null>(null);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadSchools = useCallback(async () => {
    try {
      const response = await authFetch('/api/platform/schools', { cache: 'no-store' });
      const payload = await response.json();
      if (payload.success) {
        setSchools(payload.data.schools);
      } else {
        setError(payload.error || 'Failed to load schools');
      }
    } catch {
      setError('Failed to load schools');
    } finally {
      setLoadingSchools(false);
    }
  }, []);

  const loadReport = useCallback(async (schoolId: string, isRefresh = false) => {
    if (!schoolId) {
      setReport(null);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoadingReport(true);
    setError('');

    try {
      const response = await authFetch(`/api/platform/schools/${schoolId}/audit`, { cache: 'no-store' });
      const payload = await response.json();
      if (payload.success) {
        setReport(payload.data.report);
      } else {
        setError(payload.error || 'Failed to load school audit');
        setReport(null);
      }
    } catch {
      setError('Failed to load school audit');
      setReport(null);
    } finally {
      setLoadingReport(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadSchools();
  }, [loadSchools]);

  useEffect(() => {
    const schoolFromQuery = searchParams.get('school');
    if (schoolFromQuery) {
      setSelectedSchoolId(schoolFromQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    void loadReport(selectedSchoolId);
  }, [loadReport, selectedSchoolId]);

  const groupedSchools = useMemo(() => {
    const groups = new Map<string, SchoolListItem[]>();
    for (const school of schools) {
      const key = school.organization_name || 'Independent';
      const list = groups.get(key) ?? [];
      list.push(school);
      groups.set(key, list);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [schools]);

  const selectedSchool = schools.find((school) => String(school.id) === selectedSchoolId) ?? null;

  const handleSchoolChange = (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    const params = new URLSearchParams(searchParams.toString());
    if (schoolId) params.set('school', schoolId);
    else params.delete('school');
    router.replace(`/school-audit?${params.toString()}`, { scroll: false });
  };

  const adminUrl = report
    ? getSchoolAdminBaseUrl(report.school.subdomain, report.school.slug)
    : selectedSchool
      ? getSchoolAdminBaseUrl(null, selectedSchool.slug)
      : null;
  const loginUrl = report
    ? getSchoolAdminLoginUrl(report.school.subdomain, report.school.slug)
    : selectedSchool
      ? getSchoolAdminLoginUrl(null, selectedSchool.slug)
      : null;

  return (
    <div className="dashboard-shell">
      <div className="dashboard-header">
        <div className="dashboard-header-copy">
          <h1 className="dashboard-title">School Audit</h1>
          <p className="dashboard-subtitle">
            Inspect school data and reset super admin passwords
          </p>
        </div>

        <div className="dashboard-header-actions">
          {report && (
            <span className="hidden items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 lg:inline-flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Last sync: {formatSyncTime(report.generated_at)}
            </span>
          )}
          <button
            type="button"
            className="dashboard-toolbar-btn shrink-0"
            disabled={!selectedSchoolId || refreshing || loadingReport}
            onClick={() => void loadReport(selectedSchoolId, true)}
          >
            <FiRefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      <div className="audit-selector-card">
        <label className="block min-w-0 flex-1">
          <span className="app-admin-label">Select school</span>
          <select
            value={selectedSchoolId}
            onChange={(e) => handleSchoolChange(e.target.value)}
            className="app-admin-field"
            disabled={loadingSchools}
          >
            <option value="">Choose a school…</option>
            {groupedSchools.map(([orgName, orgSchools]) => (
              <optgroup key={orgName} label={orgName}>
                {orgSchools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name} ({school.slug}){school.is_active ? '' : ' — inactive'}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <div className="flex shrink-0 flex-wrap items-end gap-2">
          <a
            href={adminUrl || '#'}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!adminUrl}
            className={`dashboard-toolbar-btn ${!adminUrl ? 'pointer-events-none opacity-50' : ''}`}
          >
            <FiExternalLink size={16} />
            Open Admin
          </a>
          <a
            href={loginUrl || '#'}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!loginUrl}
            className={`inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 ${
              !loginUrl ? 'pointer-events-none opacity-50' : ''
            }`}
          >
            <FiLogIn size={16} />
            Login as Admin
          </a>
        </div>
      </div>

      {loadingSchools && <p className="text-sm text-slate-500">Loading schools…</p>}
      {loadingReport && !refreshing && (
        <p className="text-sm text-slate-500">Loading school audit…</p>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!selectedSchoolId && !loadingSchools && (
        <div className="audit-empty-state">
          <p className="text-base font-medium text-slate-700">Select a school to view audit details</p>
          <p className="mt-1 text-sm text-slate-500">
            Choose a campus from the dropdown above to inspect KPIs, subscription status, and admin access.
          </p>
        </div>
      )}

      {report && !loadingReport && (
        <SchoolAuditReportView
          report={report}
          onDeleted={() => {
            setReport(null);
            setSelectedSchoolId('');
            const params = new URLSearchParams(searchParams.toString());
            params.delete('school');
            router.replace(`/school-audit?${params.toString()}`, { scroll: false });
            void loadSchools();
          }}
        />
      )}
    </div>
  );
}
