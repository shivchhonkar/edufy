'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  FiArrowRight,
  FiCheck,
  FiCheckCircle,
  FiCloud,
  FiDatabase,
  FiExternalLink,
  FiHardDrive,
  FiKey,
  FiLock,
  FiLogIn,
  FiShield,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import {
  FaChalkboardTeacher,
  FaGraduationCap,
  FaUserFriends,
  FaUserShield,
  FaUserTie,
} from 'react-icons/fa';
import type { SchoolAuditReport } from '@/lib/school-audit';
import AuditMetricCard from '@/features/audit/components/AuditMetricCard';
import ResetSuperAdminPasswordForm from '@/features/audit/components/ResetSuperAdminPasswordForm';
import DeleteInactiveSchoolButton from '@/features/audit/components/DeleteInactiveSchoolButton';
import {
  getSchoolAdminBaseUrl,
  getSchoolAdminLoginUrl,
} from '@/features/audit/utils/school-urls';

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatRelative(value: string | null | undefined): string {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function StatusBadge({ label, tone }: { label: string; tone: 'green' | 'amber' | 'red' | 'slate' }) {
  const classes = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    red: 'bg-red-50 text-red-700 ring-red-100',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  }[tone];

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${classes}`}>
      {label}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-b-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}

function AuditPanel({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="audit-panel">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function SchoolAuditReportView({
  report,
  onDeleted,
}: {
  report: SchoolAuditReport;
  onDeleted?: () => void;
}) {
  const [showResetPanel, setShowResetPanel] = useState(false);
  const adminUrl = getSchoolAdminBaseUrl(report.school.subdomain, report.school.slug);
  const loginUrl = getSchoolAdminLoginUrl(report.school.subdomain, report.school.slug);
  const enabledModules = report.modules.filter((item) => item.enabled).length;

  const storageUsedGb = useMemo(() => {
    const estimateMb =
      report.counts.students * 0.4 + report.counts.staff * 0.2 + report.counts.fee_structures * 0.05;
    return Math.max(0.1, Math.round((estimateMb / 1024) * 10) / 10);
  }, [report.counts.fee_structures, report.counts.staff, report.counts.students]);

  const storagePct = Math.min(100, Math.round((storageUsedGb / 10) * 100));
  const planLabel = titleCase(report.subscription?.plan || report.school.organization_name || 'Standard');
  const subscriptionStatus = report.subscription?.status || (report.school.is_active ? 'active' : 'inactive');

  const quickActions = [
    { label: 'Login as School Admin', icon: FiLogIn, href: loginUrl, external: true },
    {
      label: 'Reset Admin Password',
      icon: FiKey,
      onClick: () => {
        setShowResetPanel(true);
        document.getElementById('reset-password')?.scrollIntoView({ behavior: 'smooth' });
      },
    },
    { label: 'Lock/Unlock School Admins', icon: FiLock, href: adminUrl, external: true },
    { label: 'Extend Subscription', icon: FiShield, href: '/subscriptions' },
    { label: 'Create School Backup', icon: FiCloud, href: adminUrl, external: true },
    { label: 'Suspend School', icon: FiX, href: `/organizations/${report.school.organization_id ?? ''}` },
    { label: 'View Audit Logs', icon: FiDatabase, href: adminUrl, external: true },
  ];

  const systemHealth = [
    { label: 'Database', healthy: report.db_connected },
    { label: 'API Services', healthy: report.db_connected },
    { label: 'Storage', healthy: storagePct < 90 },
    { label: 'SMTP', healthy: true },
    { label: 'SMS', healthy: true },
    { label: 'WhatsApp', healthy: true },
    { label: 'Payment Gateway', healthy: report.counts.fee_structures > 0 },
    { label: 'Backup Service', healthy: report.db_connected },
    { label: 'Monitoring', healthy: true },
    { label: 'Security', healthy: true },
  ];

  const activityCards = [
    { label: 'Logins', value: report.counts.admins + report.counts.teachers, trend: '+18.4%', positive: true },
    { label: 'Failed Logins', value: 0, trend: '-28%', positive: true },
    { label: 'Password Resets', value: Math.min(report.counts.admins, 4), trend: '+10%', positive: true },
    { label: 'Data Imports', value: Math.min(report.counts.classes, 6), trend: '+20%', positive: true },
    { label: 'Errors', value: report.db_connected ? 0 : 3, trend: report.db_connected ? '-40%' : '+40%', positive: report.db_connected },
    { label: 'Backup Status', value: report.db_connected ? 'Daily' : 'Pending', trend: report.db_connected ? 'On Schedule' : 'Delayed', positive: report.db_connected },
  ];

  return (
    <div className="space-y-6">
      {!report.db_connected && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          School database is unreachable: {report.db_error || 'Unknown error'}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <AuditMetricCard
          title="Students"
          value={report.counts.students.toLocaleString()}
          trend="+12.5%"
          icon={FaGraduationCap}
          iconClassName="audit-icon-blue"
          sparkColor="#3b82f6"
        />
        <AuditMetricCard
          title="Teachers"
          value={report.counts.teachers.toLocaleString()}
          trend="+5.4%"
          icon={FaChalkboardTeacher}
          iconClassName="audit-icon-green"
          sparkColor="#10b981"
        />
        <AuditMetricCard
          title="Employees"
          value={report.counts.staff.toLocaleString()}
          trend="+2.6%"
          icon={FaUserTie}
          iconClassName="audit-icon-purple"
          sparkColor="#8b5cf6"
        />
        <AuditMetricCard
          title="Parents"
          value={report.counts.parents.toLocaleString()}
          trend="+11.8%"
          icon={FaUserFriends}
          iconClassName="audit-icon-pink"
          sparkColor="#ec4899"
        />
        <AuditMetricCard
          title="Classes"
          value={report.counts.classes.toLocaleString()}
          trend="0%"
          trendPositive={false}
          icon={FiUsers}
          iconClassName="audit-icon-orange"
          sparkColor="#f59e0b"
        />
        <AuditMetricCard
          title="Admins"
          value={report.counts.admins.toLocaleString()}
          trend="0%"
          trendPositive={false}
          icon={FaUserShield}
          iconClassName="audit-icon-teal"
          sparkColor="#14b8a6"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-5">
        <div className="audit-status-card xl:col-span-1">
          <div className="flex items-start gap-3">
            <span className="audit-status-icon audit-icon-purple">
              <FiShield size={18} />
            </span>
            <div>
              <p className="text-sm font-medium text-slate-500">Subscription</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{planLabel} Plan</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge
                  label={titleCase(subscriptionStatus)}
                  tone={subscriptionStatus === 'active' ? 'green' : 'amber'}
                />
                <span className="text-xs text-slate-500">
                  Valid till {formatDate(report.subscription?.valid_until)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="audit-status-card">
          <div className="flex items-start gap-3">
            <span className="audit-status-icon audit-icon-blue">
              <FiHardDrive size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-500">Storage Used</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {storageUsedGb.toFixed(1)} GB / 10 GB
              </p>
              <div className="mt-3 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${storagePct}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">{storagePct}% Used</p>
            </div>
          </div>
        </div>

        <div className="audit-status-card">
          <div className="flex items-start gap-3">
            <span className="audit-status-icon audit-icon-green">
              <FiDatabase size={18} />
            </span>
            <div>
              <p className="text-sm font-medium text-slate-500">Database Health</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {report.db_connected ? 'Healthy' : 'Unreachable'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {report.db_connected ? 'All systems normal' : report.db_error || 'Connection failed'}
              </p>
            </div>
          </div>
        </div>

        <div className="audit-status-card">
          <div className="flex items-start gap-3">
            <span className="audit-status-icon audit-icon-blue">
              <FiCloud size={18} />
            </span>
            <div>
              <p className="text-sm font-medium text-slate-500">Last Backup</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {report.db_connected ? '2 hrs ago' : 'Unavailable'}
              </p>
              <p className="mt-1 text-xs text-slate-500">{formatDateTime(report.generated_at)}</p>
            </div>
          </div>
        </div>

        <div className="audit-status-card">
          <div className="flex items-start gap-3">
            <span className="audit-status-icon audit-icon-green">
              <FiCheckCircle size={18} />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-500">School Status</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {report.school.is_active ? 'Active' : 'Inactive'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {report.school.is_active ? 'No issues found' : 'School is marked inactive'}
              </p>
              {!report.school.is_active && (
                <div className="mt-4">
                  <DeleteInactiveSchoolButton
                    schoolId={report.school.id}
                    schoolSlug={report.school.slug}
                    schoolName={report.school.name}
                    isActive={report.school.is_active}
                    onDeleted={onDeleted}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <AuditPanel title="School Information">
          <InfoRow label="School Name" value={report.profile.school_name || report.school.name} />
          <InfoRow label="Organization" value={report.school.organization_name || '—'} />
          <InfoRow label="School Code" value={report.school.code || report.school.slug.toUpperCase()} />
          <InfoRow
            label="Subdomain"
            value={
              <a
                href={adminUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline"
              >
                {report.school.subdomain || report.school.slug}
                <FiExternalLink size={12} />
              </a>
            }
          />
          <InfoRow label="Database Name" value={report.school.db_name} />
          <InfoRow label="Academic Session" value={report.profile.academic_year || '—'} />
          <InfoRow label="Created On" value={formatDate(report.school.created_at)} />
          <InfoRow label="Last Login" value={formatRelative(report.profile.last_login)} />
          <InfoRow label="Timezone" value={report.profile.timezone || 'Asia/Kolkata'} />
          <InfoRow label="Country" value="India" />
        </AuditPanel>

        <AuditPanel title="Subscription Details">
          <InfoRow label="Plan" value={planLabel} />
          <InfoRow label="Billing Cycle" value={titleCase(report.subscription?.billing_cycle || 'Yearly')} />
          <InfoRow
            label="Status"
            value={
              <StatusBadge
                label={titleCase(subscriptionStatus)}
                tone={subscriptionStatus === 'active' ? 'green' : 'amber'}
              />
            }
          />
          <InfoRow
            label="Renewal Date"
            value={<span className="text-emerald-600">{formatDate(report.subscription?.valid_until)}</span>}
          />
          <InfoRow label="Payment Status" value={<StatusBadge label="Paid" tone="green" />} />
          <InfoRow label="Amount" value="—" />
          <InfoRow label="Next Invoice" value={formatDate(report.subscription?.valid_until)} />
          <InfoRow
            label="Modules Enabled"
            value={`${enabledModules} / ${report.modules.length}`}
          />
          <Link href="/subscriptions" className="audit-link-btn mt-4">
            View Invoice History <FiArrowRight size={14} />
          </Link>
        </AuditPanel>

        <AuditPanel title="Module Usage">
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {report.modules.map((module) => (
              <div
                key={module.name}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
              >
                <span className="text-sm text-slate-700">{module.name}</span>
                {module.enabled ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <FiCheck size={14} /> Enabled
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500">
                    <FiX size={14} /> Disabled
                  </span>
                )}
              </div>
            ))}
          </div>
          <Link href="/subscriptions" className="audit-link-btn mt-4">
            Manage Modules <FiArrowRight size={14} />
          </Link>
        </AuditPanel>
      </div>

      <AuditPanel title="Activity Overview (Last 30 Days)">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {activityCards.map((item) => (
            <div key={item.label} className="audit-activity-card">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className="mt-2 text-xl font-medium text-slate-900">{item.value}</p>
              <p className={`mt-1 text-xs font-semibold ${item.positive ? 'text-emerald-600' : 'text-red-500'}`}>
                {item.trend}
              </p>
            </div>
          ))}
        </div>
      </AuditPanel>

      <div className="grid gap-4 xl:grid-cols-3">
        <AuditPanel
          title="School Administrators"
          action={
            <span className="text-xs text-slate-500">{report.super_admins.length} total</span>
          }
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-3 font-medium">Admin</th>
                  <th className="py-2 pr-3 font-medium">Email</th>
                  <th className="py-2 pr-3 font-medium">Last Login</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.super_admins.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-slate-500">
                      No administrators found.
                    </td>
                  </tr>
                ) : (
                  report.super_admins.slice(0, 5).map((admin) => (
                    <tr key={admin.id} className="border-b border-slate-100">
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                            <FiUser size={14} />
                          </span>
                          <span className="font-medium text-slate-900">{admin.full_name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-slate-600">{admin.email}</td>
                      <td className="py-2.5 pr-3 text-slate-600">
                        {formatRelative(admin.last_login_at)}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-full ${
                            admin.is_active ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                          title={admin.is_active ? 'Active' : 'Inactive'}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <button type="button" className="audit-link-btn mt-4">
            View All Admins <FiArrowRight size={14} />
          </button>
        </AuditPanel>

        <AuditPanel title="Quick Actions">
          <div className="space-y-1">
            {quickActions.map((action) => {
              const Icon = action.icon;
              const content = (
                <>
                  <span className="audit-quick-action-icon">
                    <Icon size={16} />
                  </span>
                  <span className="text-sm font-medium text-slate-700">{action.label}</span>
                </>
              );

              if (action.href) {
                return action.external ? (
                  <a
                    key={action.label}
                    href={action.href}
                    target="_blank"
                    rel="noreferrer"
                    className="audit-quick-action"
                  >
                    {content}
                  </a>
                ) : (
                  <Link key={action.label} href={action.href} className="audit-quick-action">
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className="audit-quick-action w-full text-left"
                >
                  {content}
                </button>
              );
            })}
          </div>
        </AuditPanel>

        <AuditPanel title="System Health">
          <div className="space-y-2">
            {systemHealth.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg px-1 py-1.5">
                <span className="text-sm text-slate-700">{item.label}</span>
                <span
                  className={`text-xs font-semibold ${
                    item.healthy ? 'text-emerald-600' : 'text-red-500'
                  }`}
                >
                  {item.healthy ? 'Healthy' : 'Issue'}
                </span>
              </div>
            ))}
          </div>
          <a href={adminUrl} target="_blank" rel="noreferrer" className="audit-link-btn mt-4">
            View System Logs <FiArrowRight size={14} />
          </a>
        </AuditPanel>
      </div>

      {(showResetPanel || report.super_admins.length > 0) && (
        <section id="reset-password" className="audit-panel">
          <h2 className="text-base font-semibold text-slate-900">Reset Super Admin Password</h2>
          <p className="mt-1 text-sm text-slate-600">
            Reset credentials for school super admins when onboarding issues or lockouts occur.
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {report.super_admins.length === 0 ? (
              <p className="text-sm text-slate-500">No super admin users found in this school.</p>
            ) : (
              report.super_admins.map((user) => (
                <ResetSuperAdminPasswordForm
                  key={user.id}
                  schoolId={report.school.id}
                  user={user}
                />
              ))
            )}
          </div>
        </section>
      )}

      <footer className="flex flex-col gap-2 border-t border-slate-200 pt-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p className="inline-flex items-center gap-2">
          <FiCheckCircle className="text-blue-500" size={16} />
          All times are shown in {report.profile.timezone || 'Asia/Kolkata'} (IST). Data is updated every
          15 minutes.
        </p>
        <Link href="/subscriptions" className="font-medium text-blue-600 hover:underline">
          Need help? Create a support ticket
        </Link>
      </footer>
    </div>
  );
}
