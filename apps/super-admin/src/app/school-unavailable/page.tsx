import Link from 'next/link';
import { FiAlertTriangle, FiHome } from 'react-icons/fi';

export const metadata = {
  title: 'School Unavailable',
  robots: { index: false, follow: false },
};

export default function SchoolUnavailablePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--theme-bg,#f4f7f9)] px-4 py-10">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--theme-primary-100,#D1EAF9)] text-[var(--theme-primary-700,#1A73C7)]">
          <FiAlertTriangle size={32} aria-hidden />
        </div>

        <p className="text-6xl font-bold text-[var(--theme-brand-dark,#0D3D75)] tracking-tight">
          404
        </p>

        <h1 className="mt-3 text-xl font-semibold text-gray-900">
          Something went wrong
        </h1>

        <p className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed">
          We couldn&apos;t find this school portal, or it may be temporarily unavailable.
          Our team is working on it — please try again later or contact your school
          administrator.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--theme-primary-600,#2380D6)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--theme-primary-700,#1A73C7)] transition-colors"
          >
            <FiHome size={16} aria-hidden />
            Go to homepage
          </Link>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          If you believe this is an error, double-check the school URL you were given.
        </p>
      </div>
    </div>
  );
}
