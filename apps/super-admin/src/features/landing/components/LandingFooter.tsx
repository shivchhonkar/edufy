import Link from 'next/link';
import { FiMail, FiPhone, FiMapPin } from 'react-icons/fi';
import LandingLogo from './LandingLogo';

export default function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-brand-dark text-primary-200">
      <div className="max-w-7xl mx-auto px-4 py-14">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="mb-4">
              <LandingLogo size={36} variant="dark" />
            </div>
            <p className="text-sm leading-relaxed">
              Comprehensive School ERP and CRM platform for admissions, academics, finance,
              HR, and communication.
            </p>
          </div>

          <div>
            <h4 className="text-white mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#modules" className="hover:text-white transition-colors">ERP Modules</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#about" className="hover:text-white transition-colors">About Us</a></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Login</Link></li>
              <li><Link href="/register-school" className="hover:text-white transition-colors">Register School</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white mb-4">Modules</h4>
            <ul className="space-y-2 text-sm">
              <li>Student & Admissions</li>
              <li>Fee & Accounting</li>
              <li>Exams & Report Cards</li>
              <li>HR & Payroll</li>
              <li>Transport & Inventory</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white mb-4">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <FiPhone className="shrink-0 mt-0.5" size={16} />
                <a href="tel:+917065965900" className="hover:text-white">+91 9650593896</a>
              </li>
              <li className="flex items-start gap-2">
                <FiMail className="shrink-0 mt-0.5" size={16} />
                <a href="mailto:info@shribi.com" className="hover:text-white">info@shribi.com</a>
              </li>
              <li className="flex items-start gap-2">
                <FiMapPin className="shrink-0 mt-0.5" size={16} />
                <span>India</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-700/40 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
          <p>&copy; {year} Shribi Edufy. All rights reserved.</p>
          <p>Best School ERP Software in India</p>
        </div>
      </div>
    </footer>
  );
}
