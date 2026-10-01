import { getDatabase } from '../database/database';
import type { SqlDb } from '../database/types';
import type { User, UserWithCredentials } from '../models/User';

interface UserRow {
  id: number;
  username: string;
  fullName: string;
  phone: string;
  passwordHash: string;
  passwordSalt: string;
  isActive: number;
  createdAt: string;
}

function mapRow(row: UserRow): UserWithCredentials {
  return { ...row, isActive: row.isActive === 1 };
}

function toPublicUser(user: UserWithCredentials): User {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    phone: user.phone,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

export class UserRepository {
  constructor(private readonly db: SqlDb = getDatabase()) {}

  create(input: {
    username: string;
    fullName: string;
    phone: string;
    passwordHash: string;
    passwordSalt: string;
  }): User {
    const now = new Date().toISOString();
    const result = this.db.execute(
      `INSERT INTO users (username, fullName, phone, passwordHash, passwordSalt, isActive, createdAt)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [input.username, input.fullName, input.phone, input.passwordHash, input.passwordSalt, now],
    );
    return this.findById(result.insertId as number) as User;
  }

  findById(id: number): User | null {
    const result = this.db.execute<UserRow>(`SELECT * FROM users WHERE id = ?`, [id]);
    return result.rows[0] ? toPublicUser(mapRow(result.rows[0])) : null;
  }

  /** Trả kèm passwordHash/passwordSalt — chỉ AuthService.login() dùng để verify. */
  findByUsername(username: string): UserWithCredentials | null {
    const result = this.db.execute<UserRow>(
      `SELECT * FROM users WHERE username = ?`,
      [username],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  existsByUsername(username: string): boolean {
    return this.findByUsername(username) !== null;
  }

  /** Dùng phát hiện "chưa có tài khoản nào" để chuyển sang màn Bootstrap. */
  count(): number {
    const result = this.db.execute<{ total: number }>(
      `SELECT COUNT(*) as total FROM users`,
    );
    return result.rows[0]?.total ?? 0;
  }

  listActive(): User[] {
    const result = this.db.execute<UserRow>(
      `SELECT * FROM users WHERE isActive = 1 ORDER BY fullName`,
    );
    return result.rows.map(row => toPublicUser(mapRow(row)));
  }

  /** Soft-delete — giữ nguyên bản ghi để hóa đơn cũ vẫn tra được tên người thu. */
  deactivate(id: number): void {
    this.db.execute(`UPDATE users SET isActive = 0 WHERE id = ?`, [id]);
  }
}
