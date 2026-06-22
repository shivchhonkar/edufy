'use client';

import type { ReactNode } from 'react';
import ContentAreaModal from '@/shared/components/common/ContentAreaModal';

export interface AppModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  zIndex?: number;
  closeOnBackdrop?: boolean;
}

/** Full-width/height modal scoped to the main content column (right of sidebar). */
export default function AppModal({
  open,
  onClose,
  children,
  zIndex = 60,
  closeOnBackdrop = true,
}: AppModalProps) {
  return (
    <ContentAreaModal
      open={open}
      onClose={closeOnBackdrop ? onClose : () => undefined}
      zIndex={zIndex}
    >
      {children}
    </ContentAreaModal>
  );
}

/** Base panel styles shared by all modal layouts. */
export const APP_MODAL_PANEL_BASE =
  'flex flex-col h-full w-full min-h-0 min-w-0 bg-white shadow-2xl';

/**
 * Default panel — entire modal content scrolls (sticky header/footer stay visible).
 * Use for most forms and detail views.
 */
export const APP_MODAL_PANEL = `${APP_MODAL_PANEL_BASE} overflow-y-auto overscroll-contain`;

/**
 * Structured panel — fixed header/footer with scrollable body via APP_MODAL_BODY.
 */
export const APP_MODAL_PANEL_STRUCTURED = `${APP_MODAL_PANEL_BASE} overflow-hidden`;

export const APP_MODAL_HEADER =
  'sticky top-0 z-10 shrink-0 border-b px-4 sm:px-6 py-3 flex justify-between items-center bg-white';

export const APP_MODAL_BODY = 'flex-1 min-h-0 overflow-y-auto overscroll-contain';

export const APP_MODAL_FOOTER =
  'sticky bottom-0 z-10 shrink-0 border-t bg-white px-4 sm:px-6 py-3 flex justify-end gap-3';

export interface AppModalShellProps {
  header: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  structured?: boolean;
  className?: string;
}

/** Standard modal layout: sticky header, scrollable body, optional sticky footer. */
export function AppModalShell({
  header,
  children,
  footer,
  structured = true,
  className = '',
}: AppModalShellProps) {
  const panelClass = structured ? APP_MODAL_PANEL_STRUCTURED : APP_MODAL_PANEL;

  if (!structured) {
    return (
      <div className={`${panelClass} ${className}`.trim()}>
        {header}
        {children}
        {footer}
      </div>
    );
  }

  return (
    <div className={`${panelClass} ${className}`.trim()}>
      <div className={APP_MODAL_HEADER}>{header}</div>
      <div className={APP_MODAL_BODY}>{children}</div>
      {footer ? <div className={APP_MODAL_FOOTER}>{footer}</div> : null}
    </div>
  );
}
