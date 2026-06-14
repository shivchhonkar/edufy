import Link from 'next/link';
import { FiArrowRight, FiPlayCircle } from 'react-icons/fi';
import { STATS } from '../data/landing-content';

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-dark via-primary-600 to-brand-light text-white">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-72 h-72 bg-brand-light rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-brand rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            {/* <span className="inline-block px-4 py-1.5 bg-white/10 border border-white/20 rounded-full text-sm font-medium mb-6">
              Best School ERP Software in India
            </span> */}
            <h1 className="text-4xl lg:text-5xl xl:text-6xl leading-tight mb-6">
              Complete School Management,{' '}
              <span className="text-brand-light">One Platform</span>
            </h1>
            <p className="text-lg text-primary-100 leading-relaxed mb-8 max-w-xl">
              Shribi Edufy is an advanced, user-friendly School ERP for admissions, academics,
              fees, HR, transport, exams, and parent communication — built for modern Indian schools.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/register-school"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-white text-brand-dark font-semibold rounded-lg hover:bg-primary-50 transition-colors shadow-lg"
              >
                Get Started Free <FiArrowRight />
              </Link>
              <a
                href="#modules"
                className="inline-flex items-center gap-2 px-6 py-3.5 border border-white/40 text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <FiPlayCircle /> Explore Modules
              </a>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6 shadow-2xl">
              <div className="bg-white rounded-xl p-4 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="ml-2 text-xs text-gray-400">Shribi Edufy Dashboard</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {['Students', 'Fees', 'Staff'].map((label) => (
                    <div key={label} className="bg-primary-50 rounded-lg p-3 text-center">
                      <p className="text-2xl text-primary-700">
                        {label === 'Students' ? '1.2K' : label === 'Fees' ? '₹8L' : '86'}
                      </p>
                      <p className="text-[10px] text-gray-500 uppercase">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {[85, 62, 48].map((w, i) => (
                    <div key={i} className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand rounded-full" style={{ width: `${w}%` }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        {/* <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-16 pt-12 border-t border-white/20">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl lg:text-4xl text-white">{stat.value}</p>
              <p className="text-sm text-primary-200 mt-1">{stat.label}</p>
            </div>
          ))}
        </div> */}
      </div>
    </section>
  );
}
