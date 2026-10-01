import { createMigratedTestDb } from '../../test-utils/sqliteTestDb';
import { seedDatabase } from '../seed';

describe('seedDatabase', () => {
  it('seed 10 khách hàng, meter_readings, tariff bậc thang và 6 app_settings mặc định', () => {
    const db = createMigratedTestDb();
    seedDatabase(db);

    expect(
      db.execute<{ total: number }>('SELECT COUNT(*) as total FROM customers')
        .rows[0].total,
    ).toBe(10);
    expect(
      db.execute<{ total: number }>(
        'SELECT COUNT(*) as total FROM meter_readings',
      ).rows[0].total,
    ).toBeGreaterThan(0);
    expect(
      db.execute<{ total: number }>('SELECT COUNT(*) as total FROM tariffs')
        .rows[0].total,
    ).toBeGreaterThan(0);
    expect(
      db.execute<{ total: number }>(
        'SELECT COUNT(*) as total FROM app_settings',
      ).rows[0].total,
    ).toBe(6);
  });

  it('không seed lại (bỏ qua) nếu bảng customers đã có dữ liệu', () => {
    const db = createMigratedTestDb();
    seedDatabase(db);
    seedDatabase(db);

    expect(
      db.execute<{ total: number }>('SELECT COUNT(*) as total FROM customers')
        .rows[0].total,
    ).toBe(10);
  });
});
