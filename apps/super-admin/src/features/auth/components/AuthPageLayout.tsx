'use client';

import Link from 'next/link';
import { FiArrowLeft, FiCheckCircle, FiPhone, FiMail } from 'react-icons/fi';
import LandingLogo from '@/features/landing/components/LandingLogo';
import { STATS } from '@/features/landing/data/landing-content';

const HIGHLIGHTS = [
  'Admissions, fees, exams & report cards',
  'HR, payroll & transport management',
  'CBSE-style marksheets with QR verification',
  'Multi-tenant cloud — secure per school',
];

interface AuthPageLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  /** Wider form area for multi-column layouts */
  wide?: boolean;
}

export default function AuthPageLayout({ children, title, subtitle, wide = false }: AuthPageLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Brand panel — desktop */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[42%] relative overflow-hidden bg-gradient-to-br from-brand-dark via-primary-600 to-brand-light text-white flex-col justify-between p-10 xl:p-12">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-16 left-8 w-64 h-64 bg-brand-light rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-8 w-80 h-80 bg-brand rounded-full blur-3xl" />
        </div>

        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-primary-100 hover:text-white transition-colors mb-10">
            <FiArrowLeft size={16} />
            Back to home
          </Link>
          <LandingLogo size={48} variant="dark" />
        </div>

        <div className="relative space-y-8">
          <div>
            <h2 className="text-3xl xl:text-4xl font-bold leading-tight mb-4">
              India&apos;s Trusted School ERP Platform
            </h2>
            <p className="text-primary-100 leading-relaxed">
              Manage admissions, academics, fees, HR, transport, and parent communication
              from one powerful dashboard.
            </p>
          </div>

          <ul className="space-y-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-primary-50">
                <FiCheckCircle className="text-brand-light shrink-0 mt-0.5" size={18} />
                {item}
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
            {STATS.slice(0, 4).map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-primary-200">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* <div className="relative flex flex-col gap-2 text-sm text-primary-200">
          <a href="tel:+919650593896" className="inline-flex items-center gap-2 hover:text-white transition-colors">
            <FiPhone size={14} /> +91 9650593896
          </a>
          <a href="mailto:info@shribi.com" className="inline-flex items-center gap-2 hover:text-white transition-colors">
            <FiMail size={14} /> info@shribi.com
          </a>
        </div> */}
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
        <div className="lg:hidden bg-white border-b px-4 py-3 flex items-center justify-between">
          <Link href="/">
            <LandingLogo size={32} />
          </Link>
          <Link href="/" className="text-sm text-brand font-medium flex items-center gap-1">
            <FiArrowLeft size={14} /> Home
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className={`w-full ${wide ? 'max-w-3xl' : 'max-w-md'}`}>
            <div className="hidden lg:block mb-8">
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              <p className="text-gray-500 mt-1">{subtitle}</p>
            </div>

            <div className="lg:hidden text-center mb-6">
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
              {children}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 pb-6 px-4">
          &copy; {new Date().getFullYear()} Shribi Edufy. All rights reserved.
        </p>
      </div>
    </div>
  );
}
