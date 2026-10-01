/**
 * Format tiền VND kiểu "226.940 đ". Tự viết bằng regex thay vì Intl.NumberFormat
 * để tránh rủi ro thiếu ICU data cho locale vi-VN trên Hermes.
 */
export function formatCurrency(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '-' : '';
  const digits = Math.abs(rounded).toString();
  const withSeparators = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}${withSeparators} đ`;
}
