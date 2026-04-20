export function generateRedemptionCode() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  const timestamp = Date.now().toString().slice(-6);
  return `MM-${timestamp}-${random}`;
}
