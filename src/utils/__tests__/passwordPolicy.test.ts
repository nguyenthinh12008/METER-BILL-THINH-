import { validatePassword } from '../passwordPolicy';

describe('validatePassword', () => {
  it('null khi mật khẩu thỏa đủ mọi điều kiện', () => {
    expect(validatePassword('Matkhau123!')).toBeNull();
  });

  it('báo lỗi độ dài khi ngắn hơn 8 ký tự', () => {
    expect(validatePassword('Ab1!')).toMatch(/8 đến 32 ký tự/);
  });

  it('báo lỗi độ dài khi dài hơn 32 ký tự', () => {
    expect(validatePassword(`Aa1!${'x'.repeat(30)}`)).toMatch(/8 đến 32 ký tự/);
  });

  it('báo lỗi thiếu chữ in hoa', () => {
    expect(validatePassword('matkhau123!')).toMatch(/chữ in hoa/);
  });

  it('báo lỗi thiếu chữ thường', () => {
    expect(validatePassword('MATKHAU123!')).toMatch(/chữ thường/);
  });

  it('báo lỗi thiếu chữ số', () => {
    expect(validatePassword('Matkhauabc!')).toMatch(/chữ số/);
  });

  it('báo lỗi thiếu ký tự đặc biệt', () => {
    expect(validatePassword('Matkhau123')).toMatch(/ký tự đặc biệt/);
  });

  it('báo lỗi khi chứa khoảng trắng dù các điều kiện khác đều đạt', () => {
    expect(validatePassword('Matkhau 123!')).toMatch(/khoảng trắng/);
  });

  it('chấp nhận nhiều ký tự đặc biệt khác nhau trong danh sách cho phép', () => {
    for (const ch of '!@#$%^&*()_+-=[]{};:\'",.<>/?\\|`~') {
      expect(validatePassword(`Matkhau123${ch}`)).toBeNull();
    }
  });
});
