export type PaymentReceiptPayload = {
  payment: Record<string, unknown>;
  student: Record<string, unknown>;
};

/** Load enriched payment + student for ReceiptModal (same source as /fees/receipts). */
export async function loadPaymentReceipt(
  paymentId: number | string,
): Promise<PaymentReceiptPayload> {
  const response = await fetch(`/api/fees/receipt/${paymentId}`);
  const data = await response.json();

  if (!data?.success) {
    throw new Error(data?.error || 'Failed to load receipt');
  }

  return {
    payment: data.data.payment as Record<string, unknown>,
    student: data.data.student as Record<string, unknown>,
  };
}
