/** Sidebar layout — keep in sync with Sidebar.tsx Tailwind widths */
export const SIDEBAR_WIDTH_EXPANDED_PX = 224; // w-56
export const SIDEBAR_WIDTH_COLLAPSED_PX = 64; // w-16

export const SIDEBAR_EXPANDED_CLASS = 'w-68';
export const SIDEBAR_COLLAPSED_CLASS = 'w-16';

export function getSidebarPanelLayout(collapsed: boolean) {
  return {
    leftClass: collapsed ? 'left-16' : 'left-56',
    width: collapsed
      ? `calc(100% - ${SIDEBAR_WIDTH_COLLAPSED_PX}px)`
      : `calc(100% - ${SIDEBAR_WIDTH_EXPANDED_PX}px)`,
    widthVw: collapsed
      ? `calc(100vw - ${SIDEBAR_WIDTH_COLLAPSED_PX + 16}px)`
      : `calc(100vw - ${SIDEBAR_WIDTH_EXPANDED_PX}px)`,
  };
}
