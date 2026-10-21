export const SIDEBAR_COOKIE = "sidebar";
export const SIDEBAR_COLLAPSED = "collapsed";

export function parseSidebarCollapsed(value: string | undefined): boolean {
  return value === SIDEBAR_COLLAPSED;
}
