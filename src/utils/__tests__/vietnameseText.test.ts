import { stripDiacritics } from '../vietnameseText';

describe('stripDiacritics', () => {
  it('bỏ dấu tên khách hàng mẫu (seed.ts)', () => {
    expect(stripDiacritics('Nguyễn Văn An')).toBe('Nguyen Van An');
    expect(stripDiacritics('Trần Thị Bình')).toBe('Tran Thi Binh');
    expect(stripDiacritics('Đặng Văn Hùng')).toBe('Dang Van Hung');
    expect(stripDiacritics('Đỗ Thị Minh')).toBe('Do Thi Minh');
  });

  it('bỏ đủ 6 thanh điệu trên nguyên âm a', () => {
    expect(stripDiacritics('a à á ạ ả ã')).toBe('a a a a a a');
  });

  it('xử lý đúng đ/Đ (không decompose được bằng NFD)', () => {
    expect(stripDiacritics('đ Đ')).toBe('d D');
  });

  it('giữ nguyên ký tự không dấu và số', () => {
    expect(stripDiacritics('C0001 - 226.940 d')).toBe('C0001 - 226.940 d');
  });

  it('xử lý nguyên âm ê/ô/ơ/ư/ă/â có dấu', () => {
    expect(stripDiacritics('ê ề ế ệ ể ễ')).toBe('e e e e e e');
    expect(stripDiacritics('ô ồ ố ộ ổ ỗ')).toBe('o o o o o o');
    expect(stripDiacritics('ơ ờ ớ ợ ở ỡ')).toBe('o o o o o o');
    expect(stripDiacritics('ư ừ ứ ự ử ữ')).toBe('u u u u u u');
    expect(stripDiacritics('ă ằ ắ ặ ẳ ẵ')).toBe('a a a a a a');
    expect(stripDiacritics('â ầ ấ ậ ẩ ẫ')).toBe('a a a a a a');
  });
});
