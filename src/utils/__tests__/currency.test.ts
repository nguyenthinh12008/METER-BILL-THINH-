import { formatCurrency } from '../currency';

describe('formatCurrency', () => {
  it('thêm dấu chấm ngăn cách hàng nghìn và hậu tố đ', () => {
    expect(formatCurrency(226940)).toBe('226.940 đ');
    expect(formatCurrency(1135750)).toBe('1.135.750 đ');
  });

  it('số nhỏ hơn 1000 không có dấu chấm', () => {
    expect(formatCurrency(500)).toBe('500 đ');
  });

  it('0 → "0 đ"', () => {
    expect(formatCurrency(0)).toBe('0 đ');
  });

  it('làm tròn số thập phân', () => {
    expect(formatCurrency(1999.6)).toBe('2.000 đ');
  });

  it('số âm giữ dấu trừ trước số', () => {
    expect(formatCurrency(-1500)).toBe('-1.500 đ');
  });
});
