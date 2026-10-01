import { hashNewPassword, verifyPassword } from '../passwordHash';

describe('passwordHash', () => {
  it('verifyPassword() đúng với mật khẩu và salt vừa sinh', () => {
    const { hash, salt } = hashNewPassword('matkhau123');
    expect(verifyPassword('matkhau123', salt, hash)).toBe(true);
  });

  it('verifyPassword() sai khi nhập sai mật khẩu', () => {
    const { hash, salt } = hashNewPassword('matkhau123');
    expect(verifyPassword('sai-mat-khau', salt, hash)).toBe(false);
  });

  it('2 lần hashNewPassword() cùng mật khẩu ra salt và hash khác nhau', () => {
    const first = hashNewPassword('matkhau123');
    const second = hashNewPassword('matkhau123');
    expect(first.salt).not.toBe(second.salt);
    expect(first.hash).not.toBe(second.hash);
  });

  it('verifyPassword() tính lại vẫn ra kết quả ổn định (deterministic) với cùng đầu vào', () => {
    const { hash, salt } = hashNewPassword('matkhau123');
    expect(verifyPassword('matkhau123', salt, hash)).toBe(true);
    expect(verifyPassword('matkhau123', salt, hash)).toBe(true);
  });

  it('hash không phải là mật khẩu gốc hay salt (không lưu plaintext)', () => {
    const { hash, salt } = hashNewPassword('matkhau123');
    expect(hash).not.toBe('matkhau123');
    expect(hash).not.toContain('matkhau123');
    expect(hash).not.toBe(salt);
  });
});
