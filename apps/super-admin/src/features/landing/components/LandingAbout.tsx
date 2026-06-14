import { BENEFITS } from '../data/landing-content';
import { FiShield, FiZap, FiTool, FiTrendingUp } from 'react-icons/fi';

const BENEFIT_ICONS = [FiZap, FiShield, FiTool, FiTrendingUp];

export default function LandingAbout() {
  return (
    <section id="about" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl lg:text-4xl text-gray-900 mb-6">
              India&apos;s Most Advanced School ERP System
            </h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                Shribi Edufy has developed one of the most advanced and user-friendly School ERP
                Software for managing various school operations — from enquiry to enrollment,
                daily attendance to annual report cards.
              </p>
              <p>
                Generate circulars and SMS instantly, manage fee concessions with approval
                workflows, and publish CBSE-style marksheets with QR verification. Teachers get
                calendars with lesson plans, while administrators oversee HR, payroll, and
                transport from a single dashboard.
              </p>
              <p>
                Built as a multi-tenant cloud platform, each school runs on its own secure
                database with subdomain access — scalable, reliable, and ready for growth.
              </p>
            </div>
          </div>

          <div id="features" className="grid sm:grid-cols-2 gap-5">
            {BENEFITS.map((benefit, i) => {
              const Icon = BENEFIT_ICONS[i] || FiZap;
              return (
                <div
                  key={benefit.title}
                  className="p-5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-primary-50 hover:border-primary-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-brand text-white flex items-center justify-center mb-3">
                    <Icon size={20} />
                  </div>
                  <h3 className="text-gray-900 mb-1">{benefit.title}</h3>
                  <p className="text-sm text-gray-600">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
