export const moduleTabBarClass =
  'inline-flex max-w-full flex-wrap gap-0.5 rounded-md border border-gray-200 bg-white p-0.5';

export function moduleTabClass(active: boolean) {
  return `rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
    active ? 'bg-primary-600 text-white' : 'text-gray-700 hover:bg-gray-50'
  }`;
}
