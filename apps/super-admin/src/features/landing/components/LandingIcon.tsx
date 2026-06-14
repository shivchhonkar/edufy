import {
  FiUsers,
  FiCheckCircle,
  FiBookOpen,
  FiAward,
  FiCalendar,
  FiTrendingUp,
  FiUserPlus,
  FiTruck,
  FiPackage,
  FiLayers,
  FiSettings,
  FiCloud,
  FiCreditCard,
  FiPieChart,
  FiRefreshCw,
  FiLink,
  FiBriefcase,
  FiClock,
  FiMonitor,
  FiMessageSquare,
  FiBell,
  FiFileText,
  FiMail,
  FiGlobe,
  FiSmartphone,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import RupeeIcon from '@/shared/components/icons/RupeeIcon';

const ICON_MAP: Record<string, IconType> = {
  users: FiUsers,
  check: FiCheckCircle,
  book: FiBookOpen,
  award: FiAward,
  calendar: FiCalendar,
  chart: FiTrendingUp,
  userplus: FiUserPlus,
  truck: FiTruck,
  box: FiPackage,
  layers: FiLayers,
  settings: FiSettings,
  cloud: FiCloud,
  dollar: RupeeIcon,
  credit: FiCreditCard,
  pie: FiPieChart,
  refresh: FiRefreshCw,
  link: FiLink,
  briefcase: FiBriefcase,
  wallet: FiCreditCard,
  clock: FiClock,
  monitor: FiMonitor,
  message: FiMessageSquare,
  bell: FiBell,
  file: FiFileText,
  mail: FiMail,
  globe: FiGlobe,
  phone: FiSmartphone,
};

export default function LandingIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] || FiSettings;
  return <Icon className={className} />;
}
