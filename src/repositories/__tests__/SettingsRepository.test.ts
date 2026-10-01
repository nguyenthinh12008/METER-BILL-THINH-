import { createMigratedTestDb } from '../../test-utils/sqliteTestDb';
import { SettingsRepository } from '../SettingsRepository';

describe('SettingsRepository', () => {
  it('get() trả null khi key chưa được set', () => {
    const repo = new SettingsRepository(createMigratedTestDb());
    expect(repo.get('hotline')).toBeNull();
  });

  it('set() rồi get() đọc lại đúng giá trị, set() lần 2 upsert (không lỗi trùng key)', () => {
    const repo = new SettingsRepository(createMigratedTestDb());
    repo.set('hotline', '19001006');
    expect(repo.get('hotline')).toBe('19001006');

    repo.set('hotline', '1900xxxx');
    expect(repo.get('hotline')).toBe('1900xxxx');
  });

  it('getAll() luôn trả đủ 6 key, dùng chuỗi rỗng cho key chưa set', () => {
    const repo = new SettingsRepository(createMigratedTestDb());
    repo.set('companyName', 'Điện lực mẫu');

    const all = repo.getAll();
    expect(all.companyName).toBe('Điện lực mẫu');
    expect(all.hotline).toBe('');
    expect(Object.keys(all).sort()).toEqual(
      [
        'bankAccountNumber',
        'bankName',
        'collectorName',
        'collectorPhone',
        'companyName',
        'hotline',
      ].sort(),
    );
  });

  it('setMany() ghi nhiều key trong 1 transaction', () => {
    const repo = new SettingsRepository(createMigratedTestDb());
    repo.setMany({ collectorName: 'Nhân viên A', collectorPhone: '0900000000' });

    expect(repo.get('collectorName')).toBe('Nhân viên A');
    expect(repo.get('collectorPhone')).toBe('0900000000');
  });
});
