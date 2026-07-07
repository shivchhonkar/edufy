'use client';

import { useRouter } from 'next/navigation';
import { FiAlertTriangle, FiCheck, FiX } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import { useTheme } from '@/shared/ThemeContext';
import {
  SETUP_CHECKLIST_ITEMS,
  type SetupChecklist,
} from '@/features/setup/constants/setup-checklist';

interface SchoolSetupWelcomeModalProps {
  open: boolean;
  checklist: SetupChecklist;
  onDismiss: () => void;
}

export default function SchoolSetupWelcomeModal({
  open,
  checklist,
  onDismiss,
}: SchoolSetupWelcomeModalProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const brandColor = theme.primary_color || '#2563eb';

  if (!open) return null;

  const pendingCount = SETUP_CHECKLIST_ITEMS.filter((item) => !checklist[item.id]).length;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-welcome-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
        <div
          className="flex items-center gap-2 px-5 py-4 text-white"
          style={{ backgroundColor: brandColor }}
        >
          <HiSparkles className="h-5 w-5 shrink-0" aria-hidden />
          <h2 id="setup-welcome-title" className="flex-1 text-base font-semibold">
            Welcome to Your New Dashboard!
          </h2>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close"
            className="rounded-lg p-1 hover:bg-white/15"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm text-gray-600">
            Let&apos;s get your school set up. Please complete the following essential steps to
            unlock the full potential of the application.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            You can always find this checklist on your dashboard.
          </p>

          <ul className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-100">
            {SETUP_CHECKLIST_ITEMS.map((item, index) => {
              const done = checklist[item.id];
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onDismiss();
                      router.push(item.href);
                    }}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                  >
                    <span className="text-sm font-medium text-gray-900">
                      {index + 1}. {item.label}
                    </span>
                    {done ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        <FiCheck size={12} />
                        Configured
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                        <FiAlertTriangle size={12} />
                        Pending
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {pendingCount > 0 && (
            <p className="mt-3 text-xs text-gray-500">
              {pendingCount} step{pendingCount !== 1 ? 's' : ''} remaining — click a row to
              configure it.
            </p>
          )}
        </div>

        <div className="flex justify-end border-t border-gray-100 px-5 py-3">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            I&apos;ll do this later
          </button>
        </div>
      </div>
    </div>
  );
}
