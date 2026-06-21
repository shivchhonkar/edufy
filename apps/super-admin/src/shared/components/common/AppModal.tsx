'use client';

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

export const APP_MODAL_PANEL =
  'flex flex-col h-full w-full min-h-0 min-w-0 bg-white shadow-2xl overflow-hidden';

export const APP_MODAL_HEADER =
  'shrink-0 border-b px-4 sm:px-6 py-3 flex justify-between items-center bg-white z-10';

export const APP_MODAL_BODY = 'flex-1 min-h-0 overflow-y-auto';

export const APP_MODAL_FOOTER =
  'shrink-0 border-t bg-white px-4 sm:px-6 py-3 flex justify-end gap-3';
