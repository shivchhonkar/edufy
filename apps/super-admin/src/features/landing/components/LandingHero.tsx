import Image from 'next/image';
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

      <div className="relative max-w-7xl mx-auto px-4 py-12 sm:py-14 lg:py-16">
        <div className="grid lg:grid-cols-[1fr_1.15fr] gap-10 lg:gap-12 items-center">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-[2.625rem] xl:text-5xl tracking-tight leading-[1.25] sm:leading-[1.12] mb-5 sm:mb-6 max-w-xl">
              <span className="block">Complete School Management,</span>
              <span className="block text-brand-light mt-1.5 sm:mt-2">One Platform</span>
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
            <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-2.5 shadow-2xl">
              <div className="bg-white rounded-xl p-2.5 shadow-lg">
                <div className="relative w-full h-[340px] xl:h-[400px] 2xl:h-[440px] overflow-hidden rounded-lg">
                  <Image
                    src="/dashboard-shribi.png"
                    alt="Shribi Edufy school dashboard preview"
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 1280px) 52vw, 620px"
                    priority
                  />
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
