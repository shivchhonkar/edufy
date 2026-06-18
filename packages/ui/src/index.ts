// Export all UI components
export { default as StatCard } from './components/StatCard';
export { default as ConfirmDialog } from './components/ConfirmDialog';
export { default as Button } from './components/Button';
export { default as Card } from './components/Card';
export { default as Input } from './components/Input';
export {
  PortalPageShell,
  PortalLoadingSpinner,
  PortalQuickActionCard,
} from './components/PortalPageShell';
export { PortalSidebarBackdrop, PortalMobileTopBar } from './components/PortalMobileChrome';
export { PortalThemeProvider } from './components/PortalThemeProvider';
export { portalNavLinkClass } from './lib/portal-nav';
export { usePortalSidebar } from './hooks/usePortalSidebar';
export {
  getPortalSidebarDrawerClasses,
  getPortalMainOffsetClass,
} from './lib/portal-layout';
export type { PortalSidebarProps } from './lib/portal-layout';

// Export types
export type { StatCardProps } from './components/StatCard';
export type { ConfirmDialogProps } from './components/ConfirmDialog';
export type { ButtonProps } from './components/Button';
export type { CardProps } from './components/Card';
export type { InputProps } from './components/Input';

