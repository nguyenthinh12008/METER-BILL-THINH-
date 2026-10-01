import { createMigratedTestDb } from '../../test-utils/sqliteTestDb';
import { UserRepository } from '../../repositories/UserRepository';
import { AuthService } from '../AuthService';

function makeService(): AuthService {
  return new AuthService(new UserRepository(createMigratedTestDb()));
}

describe('AuthService', () => {
  describe('hasAnyAccount', () => {
    it('false khi chưa có tài khoản nào, true sau khi register', () => {
      const service = makeService();
      expect(service.hasAnyAccount()).toBe(false);
      service.register({
        username: 'thu1',
        fullName: 'Nguyễn Văn A',
        phone: '0900000000',
        password: 'Matkhau123!',
      });
      expect(service.hasAnyAccount()).toBe(true);
    });
  });

  describe('register', () => {
    it('tạo tài khoản thành công với dữ liệu hợp lệ, không trả password', () => {
      const service = makeService();
      const user = service.register({
        username: '  thu1  ',
        fullName: '  Nguyễn Văn A  ',
        phone: '0900000000',
        password: 'Matkhau123!',
      });

      expect(user.username).toBe('thu1');
      expect(user.fullName).toBe('Nguyễn Văn A');
      expect(user.isActive).toBe(true);
      expect((user as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
    });

    it('throw khi username đã tồn tại', () => {
      const service = makeService();
      service.register({
        username: 'thu1',
        fullName: 'A',
        phone: '0900000000',
        password: 'Matkhau123!',
      });
      expect(() =>
        service.register({
          username: 'thu1',
          fullName: 'B',
          phone: '0900000000',
          password: 'Matkhau456!',
        }),
      ).toThrow('Tên đăng nhập đã tồn tại: thu1');
    });

    it('throw khi mật khẩu không thỏa policy (dùng validatePassword, chỉ test 1 trường hợp đại diện)', () => {
      const service = makeService();
      expect(() =>
        service.register({ username: 'thu1', fullName: 'A', phone: '0900000000', password: '123' }),
      ).toThrow(/8 đến 32 ký tự/);
    });

    it('throw khi thiếu username, họ tên hoặc số điện thoại', () => {
      const service = makeService();
      expect(() =>
        service.register({ username: '', fullName: 'A', phone: '0900000000', password: 'Matkhau123!' }),
      ).toThrow();
      expect(() =>
        service.register({ username: 'thu1', fullName: '', phone: '0900000000', password: 'Matkhau123!' }),
      ).toThrow();
      expect(() =>
        service.register({ username: 'thu1', fullName: 'A', phone: '', password: 'Matkhau123!' }),
      ).toThrow('Số điện thoại không được để trống');
    });
  });

  describe('login', () => {
    it('đăng nhập thành công với đúng username/mật khẩu', () => {
      const service = makeService();
      service.register({
        username: 'thu1',
        fullName: 'Nguyễn Văn A',
        phone: '0900000000',
        password: 'Matkhau123!',
      });

      const user = service.login('thu1', 'Matkhau123!');
      expect(user.username).toBe('thu1');
    });

    it('throw thông báo chung khi sai mật khẩu', () => {
      const service = makeService();
      service.register({
        username: 'thu1',
        fullName: 'A',
        phone: '0900000000',
        password: 'Matkhau123!',
      });
      expect(() => service.login('thu1', 'sai-mat-khau')).toThrow(
        'Sai tên đăng nhập hoặc mật khẩu',
      );
    });

    it('throw cùng thông báo khi username không tồn tại (không lộ thông tin)', () => {
      const service = makeService();
      expect(() => service.login('khong_ton_tai', 'Matkhau123!')).toThrow(
        'Sai tên đăng nhập hoặc mật khẩu',
      );
    });

    it('tài khoản đã deactivate không đăng nhập được', () => {
      const service = makeService();
      const user = service.register({
        username: 'thu1',
        fullName: 'A',
        phone: '0900000000',
        password: 'Matkhau123!',
      });
      service.deactivate(user.id);

      expect(() => service.login('thu1', 'Matkhau123!')).toThrow(
        'Sai tên đăng nhập hoặc mật khẩu',
      );
    });
  });

  describe('listActiveUsers / deactivate / getById', () => {
    it('listActiveUsers() bỏ tài khoản đã deactivate, getById() vẫn tra được', () => {
      const service = makeService();
      const a = service.register({
        username: 'thu1',
        fullName: 'A',
        phone: '0900000000',
        password: 'Matkhau123!',
      });
      service.register({ username: 'thu2', fullName: 'B', phone: '0900000000', password: 'Matkhau123!' });

      service.deactivate(a.id);

      expect(service.listActiveUsers().map(u => u.username)).toEqual(['thu2']);
      expect(service.getById(a.id)?.isActive).toBe(false);
    });
  });
});
