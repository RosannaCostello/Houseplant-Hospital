/** Round to two decimal places for GBP amounts. */
export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}
