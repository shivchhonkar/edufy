'use client';

import { useState } from 'react';
import { MODULE_TABS, MODULES, type ModuleTabId } from '../data/landing-content';
import LandingIcon from './LandingIcon';
import { FiArrowRight } from 'react-icons/fi';

export default function LandingModules() {
  const [activeTab, setActiveTab] = useState<ModuleTabId>('academics');
  const modules = MODULES[activeTab];

  return (
    <section id="modules" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl text-gray-900 mb-4">School ERP Modules</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            A comprehensive ERP with user-friendly dashboards, easy navigation, and well-structured
            reports — covering every department of your school.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {MODULE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-full text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-brand text-white shadow-md font-semibold'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300 hover:text-primary-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Module cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((mod) => (
            <div
              key={mod.title}
              className="group bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg hover:border-primary-200 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary-50 text-brand flex items-center justify-center mb-4 group-hover:bg-brand group-hover:text-white transition-colors">
                <LandingIcon name={mod.icon} className="w-6 h-6" />
              </div>
              <h3 className="text-lg text-gray-900 mb-2">{mod.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">{mod.description}</p>
              <span className="inline-flex items-center gap-1 text-sm text-brand group-hover:gap-2 transition-all">
                Learn more <FiArrowRight size={14} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
