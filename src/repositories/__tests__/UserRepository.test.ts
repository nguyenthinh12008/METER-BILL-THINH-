import { createMigratedTestDb } from '../../test-utils/sqliteTestDb';
import { UserRepository } from '../UserRepository';

function makeInput(overrides: Partial<{ username: string; fullName: string; phone: string }> = {}) {
  return {
    username: 'thu1',
    fullName: 'Nguyễn Văn A',
    phone: '0900000000',
    passwordHash: 'hash',
    passwordSalt: 'salt',
    ...overrides,
  };
}

describe('UserRepository', () => {
  it('create() rồi findById()/findByUsername() đọc lại đúng, isActive mặc định true', () => {
    const repo = new UserRepository(createMigratedTestDb());
    const created = repo.create(makeInput());

    expect(created.isActive).toBe(true);
    expect(repo.findById(created.id)).toEqual(created);

    const withCredentials = repo.findByUsername('thu1');
    expect(withCredentials?.passwordHash).toBe('hash');
    expect(withCredentials?.passwordSalt).toBe('salt');
    expect(withCredentials?.isActive).toBe(true);
  });

  it('findById()/findByUsername() không trả kèm password khi dùng bản public (User)', () => {
    const repo = new UserRepository(createMigratedTestDb());
    const created = repo.create(makeInput());
    expect((created as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
    expect((created as unknown as Record<string, unknown>).passwordSalt).toBeUndefined();
  });

  it('existsByUsername() đúng theo dữ liệu đã tạo', () => {
    const repo = new UserRepository(createMigratedTestDb());
    repo.create(makeInput({ username: 'thu1' }));
    expect(repo.existsByUsername('thu1')).toBe(true);
    expect(repo.existsByUsername('khong_ton_tai')).toBe(false);
  });

  it('username trùng bị DB từ chối (UNIQUE constraint)', () => {
    const repo = new UserRepository(createMigratedTestDb());
    repo.create(makeInput({ username: 'thu1' }));
    expect(() => repo.create(makeInput({ username: 'thu1' }))).toThrow();
  });

  it('count() đúng tổng số tài khoản', () => {
    const repo = new UserRepository(createMigratedTestDb());
    expect(repo.count()).toBe(0);
    repo.create(makeInput({ username: 'thu1' }));
    repo.create(makeInput({ username: 'thu2' }));
    expect(repo.count()).toBe(2);
  });

  it('listActive() sắp xếp theo tên, bỏ tài khoản đã deactivate', () => {
    const repo = new UserRepository(createMigratedTestDb());
    const a = repo.create(makeInput({ username: 'thu1', fullName: 'Bùi Văn B' }));
    repo.create(makeInput({ username: 'thu2', fullName: 'An Văn A' }));

    expect(repo.listActive().map(u => u.fullName)).toEqual(['An Văn A', 'Bùi Văn B']);

    repo.deactivate(a.id);
    expect(repo.listActive().map(u => u.username)).toEqual(['thu2']);
  });

  it('deactivate() không xoá bản ghi — vẫn tra được bằng findById()', () => {
    const repo = new UserRepository(createMigratedTestDb());
    const created = repo.create(makeInput());
    repo.deactivate(created.id);

    const found = repo.findById(created.id);
    expect(found).not.toBeNull();
    expect(found?.isActive).toBe(false);
  });
});
