export function formatFeeCurrency(amount: number | string | null | undefined): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount || 0;
  if (Number.isNaN(numAmount)) return '₹0.00';
  return `₹${numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export function getPaymentMethodBadgeClass(method: string): string {
  const colors: Record<string, string> = {
    cash: 'bg-green-100 text-green-800',
    online: 'bg-blue-100 text-blue-800',
    upi: 'bg-blue-100 text-blue-800',
    cheque: 'bg-purple-100 text-purple-800',
    card: 'bg-pink-100 text-pink-800',
    bank: 'bg-indigo-100 text-indigo-800',
  };
  return colors[method?.toLowerCase()] || 'bg-gray-100 text-gray-800';
}

export const STUDENTS_FETCH_LIMIT = 50000;
