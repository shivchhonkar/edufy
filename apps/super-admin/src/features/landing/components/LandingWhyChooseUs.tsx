import {
  FiClock,
  FiCloud,
  FiHeadphones,
  FiShield,
  FiEye,
  FiTag,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { WHY_CHOOSE_US } from '../data/landing-content';

const ITEM_ICONS: IconType[] = [FiCloud, FiHeadphones, FiTag, FiEye, FiClock, FiShield];

export default function LandingWhyChooseUs() {
  return (
    <section id="why-choose-us" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand mb-2">
            Why Choose Us
          </p>
          <h2 className="text-3xl lg:text-4xl text-gray-900 mb-4">
            Built for Schools That Expect More
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Shribi Edufy combines cloud convenience, transparent operations, and dependable support
            — so your team can focus on education, not paperwork.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {WHY_CHOOSE_US.map((item, index) => {
            const Icon = ITEM_ICONS[index] || FiCloud;
            return (
              <div
                key={item.title}
                className="group bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:border-primary-200 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-50 text-brand flex items-center justify-center mb-4 group-hover:bg-brand group-hover:text-white transition-colors">
                  <Icon size={22} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
