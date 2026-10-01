import type { TariffTier } from '../models/Tariff';

export interface BillResult {
  subtotal: number;
  tax: number;
  total: number;
}

/**
 * Tính tiền luỹ tiến theo bậc thang. Giả định `tiers` đã sắp xếp tăng dần theo
 * `fromValue` và liên tục từ 0 (đúng với thứ tự `TariffRepository.listByServiceType`
 * trả về). `taxRate` mặc định 0 — MVP hiện tại không cộng VAT vào hóa đơn.
 */
export function calculateBill(
  consumption: number,
  tiers: TariffTier[],
  taxRate = 0,
): BillResult {
  let remaining = Math.max(consumption, 0);
  let rawSubtotal = 0;

  for (const tier of tiers) {
    if (remaining <= 0) {
      break;
    }
    const tierCapacity = (tier.toValue ?? Infinity) - tier.fromValue;
    const amountInTier = Math.min(remaining, tierCapacity);
    if (amountInTier <= 0) {
      continue;
    }
    rawSubtotal += amountInTier * tier.price;
    remaining -= amountInTier;
  }

  const subtotal = Math.round(rawSubtotal);
  const tax = Math.round(subtotal * taxRate);
  const total = subtotal + tax;

  return { subtotal, tax, total };
}
