import { UserRepository } from '../repositories/UserRepository';
import { hashNewPassword, verifyPassword } from '../utils/passwordHash';
import { validatePassword } from '../utils/passwordPolicy';
import type { NewUserInput, User } from '../models/User';

export class AuthService {
  constructor(private readonly repo: UserRepository = new UserRepository()) {}

  /** Dùng phát hiện "chưa có tài khoản nào" để chuyển sang màn Bootstrap. */
  hasAnyAccount(): boolean {
    return this.repo.count() > 0;
  }

  register(input: NewUserInput): User {
    const username = input.username.trim();
    const fullName = input.fullName.trim();
    const phone = input.phone.trim();

    if (username.length === 0) {
      throw new Error('Tên đăng nhập không được để trống');
    }
    if (fullName.length === 0) {
      throw new Error('Họ tên không được để trống');
    }
    if (phone.length === 0) {
      throw new Error('Số điện thoại không được để trống');
    }
    const passwordError = validatePassword(input.password);
    if (passwordError) {
      throw new Error(passwordError);
    }
    if (this.repo.existsByUsername(username)) {
      throw new Error(`Tên đăng nhập đã tồn tại: ${username}`);
    }

    const { hash, salt } = hashNewPassword(input.password);
    return this.repo.create({
      username,
      fullName,
      phone,
      passwordHash: hash,
      passwordSalt: salt,
    });
  }

  /**
   * Thông báo lỗi giống nhau cho cả 2 trường hợp (sai username / sai mật khẩu)
   * để không lộ việc 1 username có tồn tại hay không.
   */
  login(username: string, password: string): User {
    const invalidCredentialsError = new Error('Sai tên đăng nhập hoặc mật khẩu');
    const user = this.repo.findByUsername(username.trim());
    if (!user || !user.isActive) {
      throw invalidCredentialsError;
    }
    if (!verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      throw invalidCredentialsError;
    }
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      phone: user.phone,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  getById(id: number): User | null {
    return this.repo.findById(id);
  }

  listActiveUsers(): User[] {
    return this.repo.listActive();
  }

  deactivate(id: number): void {
    this.repo.deactivate(id);
  }
}
