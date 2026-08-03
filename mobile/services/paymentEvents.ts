let completedPaymentId: string | null = null;

export function markPosPaymentCompleted(id: string) { completedPaymentId = id; }

export function consumeCompletedPosPayment() {
  const value = completedPaymentId;
  completedPaymentId = null;
  return value;
}
