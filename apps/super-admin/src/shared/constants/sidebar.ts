/** Sidebar layout — keep in sync with Sidebar.tsx Tailwind widths */
export const SIDEBAR_WIDTH_EXPANDED_PX = 200;
export const SIDEBAR_WIDTH_COLLAPSED_PX = 56;

export const SIDEBAR_EXPANDED_CLASS = 'w-[230px]';
export const SIDEBAR_COLLAPSED_CLASS = 'w-14';

export function getSidebarPanelLayout(collapsed: boolean) {
  return {
    leftClass: collapsed ? 'left-14' : 'left-[200px]',
    width: collapsed
      ? `calc(100% - ${SIDEBAR_WIDTH_COLLAPSED_PX}px)`
      : `calc(100% - ${SIDEBAR_WIDTH_EXPANDED_PX}px)`,
    widthVw: collapsed
      ? `calc(100vw - ${SIDEBAR_WIDTH_COLLAPSED_PX + 16}px)`
      : `calc(100vw - ${SIDEBAR_WIDTH_EXPANDED_PX}px)`,
  };
}
