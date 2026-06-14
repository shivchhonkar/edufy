'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FiMenu, FiX, FiPhone, FiMail, FiArrowRight } from 'react-icons/fi';
import { NAV_LINKS } from '../data/landing-content';
import LandingLogo from './LandingLogo';

export default function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {/* Top bar */}
      <div className="hidden md:block bg-brand-dark text-white text-sm">
        <div className="max-w-7xl mx-auto px-4 py-2 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <a href="tel:+917065965900" className="flex items-center gap-1.5 hover:text-primary-200 transition-colors">
              <FiPhone size={14} /> +91 9650593896
            </a>
            <a href="mailto:info@shribi.com" className="flex items-center gap-1.5 hover:text-primary-200 transition-colors">
              <FiMail size={14} /> info@shribi.com
            </a>
          </div>
          <p className="text-primary-200">India&apos;s Trusted School ERP Platform</p>
        </div>
      </div>

      {/* Main nav */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/">
            <LandingLogo size={36} />
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-primary-700 hover:text-primary-800"
            >
              Login
            </Link>
            <Link
              href="/register-school"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-brand rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              Book A Demo <FiArrowRight size={14} />
            </Link>
          </div>

          <button
            type="button"
            className="lg:hidden p-2 text-gray-600"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t bg-white px-4 py-4 space-y-3">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block text-sm font-medium text-gray-700 py-2"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="pt-3 border-t flex flex-col gap-2">
            <Link href="/login" className="text-center py-2 text-primary-700 font-medium">
              Login
            </Link>
            <Link
              href="/register-school"
              className="text-center py-2.5 bg-primary-600 text-white rounded-lg"
            >
              Book A Demo
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
