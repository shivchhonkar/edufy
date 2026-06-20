'use client';

import { useEffect, useState } from 'react';

function useIsLargeScreen() {
  const [isLg, setIsLg] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsLg(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return isLg;
}

function useContentAreaLeftOffset(isLg: boolean) {
  const [leftOffset, setLeftOffset] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (!isLg) {
        setLeftOffset(0);
        return;
      }
      const sidebar = document.querySelector('.sidebar-container');
      setLeftOffset(sidebar ? sidebar.getBoundingClientRect().width : 0);
    };

    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('sidebar-collapsed-change', measure);

    const sidebar = document.querySelector('.sidebar-container');
    const observer = sidebar
      ? new ResizeObserver(measure)
      : null;
    if (sidebar && observer) observer.observe(sidebar);

    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('sidebar-collapsed-change', measure);
      observer?.disconnect();
    };
  }, [isLg]);

  return leftOffset;
}

interface ContentAreaModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  zIndex?: number;
}

/** Full-width/height overlay scoped to the main content column (right of sidebar). */
export default function ContentAreaModal({
  open,
  onClose,
  children,
  zIndex = 60,
}: ContentAreaModalProps) {
  const isLg = useIsLargeScreen();
  const leftOffset = useContentAreaLeftOffset(isLg);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-y-0 right-0 flex flex-col bg-black/50"
      style={{ left: leftOffset, zIndex }}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full h-full min-h-0 min-w-0 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
