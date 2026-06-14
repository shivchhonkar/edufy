import Link from 'next/link';
import { FiArrowRight, FiCheckCircle } from 'react-icons/fi';

const HIGHLIGHTS = [
  'Free school setup wizard & onboarding',
  'Multi-tenant — one platform, many schools',
  'Fees, transport, exams & report cards included',
  'Dedicated support & regular updates',
];

export default function LandingCta() {
  return (
    <section id="contact" className="py-20 bg-brand-dark text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl lg:text-4xl mb-4">
              Ready to Transform Your School?
            </h2>
            <p className="text-primary-200 text-lg mb-8">
              Join hundreds of schools using Shribi Edufy to streamline operations, improve
              parent communication, and focus on what matters — education.
            </p>
            <ul className="space-y-3 mb-8">
              {HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-center gap-3 text-primary-100">
                  <FiCheckCircle className="text-green-400 shrink-0" size={18} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-8">
            <h3 className="text-xl mb-2">Book a Free Demo</h3>
            <p className="text-primary-200 text-sm mb-6">
              Register your school and our team will help you get started within 24 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/register-school"
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-brand-dark font-semibold rounded-lg hover:bg-primary-50 transition-colors"
              >
                Register School <FiArrowRight />
              </Link>
              <Link
                href="/login"
                className="flex-1 inline-flex items-center justify-center px-6 py-3.5 border border-white/40 rounded-lg hover:bg-white/10 transition-colors"
              >
                Admin Login
              </Link>
            </div>
            <p className="text-xs text-primary-300 mt-4 text-center">
              Or call us at{' '}
              <a href="tel:+917065965900" className="underline hover:text-white">
                +91 9650593896
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
