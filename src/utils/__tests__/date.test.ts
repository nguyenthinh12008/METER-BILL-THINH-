import { formatDateTime, getCurrentPeriod, getMonthRange } from '../date';

describe('getMonthRange', () => {
  it('tháng thường 31 ngày', () => {
    expect(getMonthRange('01/2026')).toEqual({ from: '2026-01-01', to: '2026-01-31' });
  });

  it('tháng 30 ngày', () => {
    expect(getMonthRange('09/2026')).toEqual({ from: '2026-09-01', to: '2026-09-30' });
  });

  it('tháng 2 năm nhuận (2028)', () => {
    expect(getMonthRange('02/2028')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });

  it('tháng 2 năm không nhuận (2026)', () => {
    expect(getMonthRange('02/2026')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });

  it('tháng 12 không tràn qua năm sau', () => {
    expect(getMonthRange('12/2026')).toEqual({ from: '2026-12-01', to: '2026-12-31' });
  });
});

describe('formatDateTime', () => {
  it('format theo giờ địa phương của máy chạy — so với tự tính từ Date, không hard-code giờ UTC cụ thể', () => {
    const iso = '2026-08-12T15:07:00.000Z';
    const date = new Date(iso);
    const expected =
      `${String(date.getDate()).padStart(2, '0')}/` +
      `${String(date.getMonth() + 1).padStart(2, '0')}/` +
      `${date.getFullYear()} ` +
      `${String(date.getHours()).padStart(2, '0')}:` +
      `${String(date.getMinutes()).padStart(2, '0')}`;

    expect(formatDateTime(iso)).toBe(expected);
  });

  it('thêm số 0 phía trước cho ngày/tháng/giờ/phút < 10 (dùng giờ địa phương cố định, không qua ISO/UTC)', () => {
    const date = new Date(2026, 0, 5, 8, 3); // 05/01/2026 08:03 giờ địa phương
    expect(formatDateTime(date.toISOString())).toBe('05/01/2026 08:03');
  });
});

describe('getCurrentPeriod', () => {
  it('trả về "MM/YYYY" theo tháng của Date truyền vào', () => {
    expect(getCurrentPeriod(new Date(2026, 7, 15))).toBe('08/2026');
  });

  it('thêm số 0 phía trước cho tháng < 10', () => {
    expect(getCurrentPeriod(new Date(2026, 0, 1))).toBe('01/2026');
  });

  it('mặc định dùng thời điểm hiện tại khi không truyền tham số', () => {
    const now = new Date();
    const expected = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    expect(getCurrentPeriod()).toBe(expected);
  });
});
