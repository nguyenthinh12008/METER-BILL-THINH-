import { calculateBill } from '../BillingCalculator';
import type { TariffTier } from '../../models/Tariff';

function tier(
  fromValue: number,
  toValue: number | null,
  price: number,
): TariffTier {
  return { id: 0, serviceType: 'ELECTRIC', fromValue, toValue, price };
}

// Bậc thang minh hoạ giống seed.ts (Phase 2) — không phải biểu giá chính thức.
const TIERS: TariffTier[] = [
  tier(0, 50, 1806),
  tier(50, 100, 1866),
  tier(100, 200, 2167),
  tier(200, 300, 2729),
  tier(300, 400, 3050),
  tier(400, null, 3151),
];

describe('calculateBill', () => {
  it('consumption nằm gọn trong bậc đầu tiên', () => {
    expect(calculateBill(30, TIERS)).toEqual({
      subtotal: 30 * 1806,
      tax: 0,
      total: 30 * 1806,
    });
  });

  it('consumption cắt qua nhiều bậc, tính luỹ tiến đúng từng bậc', () => {
    // 50*1806 + 50*1866 + 20*2167 = 226940
    expect(calculateBill(120, TIERS)).toEqual({
      subtotal: 226940,
      tax: 0,
      total: 226940,
    });
  });

  it('consumption vượt hết các bậc có giới hạn, rơi vào bậc cuối (toValue = null)', () => {
    expect(calculateBill(450, TIERS)).toEqual({
      subtotal: 1135750,
      tax: 0,
      total: 1135750,
    });
  });

  it('consumption = 0 → tất cả bằng 0', () => {
    expect(calculateBill(0, TIERS)).toEqual({ subtotal: 0, tax: 0, total: 0 });
  });

  it('không có tier nào (chưa cấu hình giá) → tất cả bằng 0', () => {
    expect(calculateBill(100, [])).toEqual({ subtotal: 0, tax: 0, total: 0 });
  });

  it('áp dụng taxRate khi được truyền vào (mặc định 0, MVP không dùng)', () => {
    expect(calculateBill(100, TIERS, 0.08)).toEqual({
      subtotal: 183600,
      tax: 14688,
      total: 198288,
    });
  });
});
