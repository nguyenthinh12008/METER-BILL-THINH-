import { createMigratedTestDb } from '../../test-utils/sqliteTestDb';
import { CustomerRepository } from '../CustomerRepository';
import { MeterRepository } from '../MeterRepository';
import type { SqlDb } from '../../database/types';

function createCustomer(db: SqlDb): number {
  const customerRepo = new CustomerRepository(db);
  return customerRepo.create({
    customerCode: 'C0001',
    fullName: 'Nguyễn Văn A',
    address: '',
    phone: '',
    meterCode: 'DC0001',
    serviceType: 'ELECTRIC',
    readingBookCode: null,
  }).id;
}

describe('MeterRepository', () => {
  it('create() tự tính consumption = newReading - oldReading', () => {
    const db = createMigratedTestDb();
    const customerId = createCustomer(db);
    const repo = new MeterRepository(db);

    const reading = repo.create({
      customerId,
      period: '08/2026',
      oldReading: 100,
      newReading: 150,
    });

    expect(reading.consumption).toBe(50);
    expect(repo.findById(reading.id)).toEqual(reading);
  });

  it('findByCustomerAndPeriod() và listByCustomer() trả đúng dữ liệu', () => {
    const db = createMigratedTestDb();
    const customerId = createCustomer(db);
    const repo = new MeterRepository(db);
    repo.create({ customerId, period: '07/2026', oldReading: 0, newReading: 50 });
    repo.create({ customerId, period: '08/2026', oldReading: 50, newReading: 90 });

    expect(
      repo.findByCustomerAndPeriod(customerId, '08/2026')?.consumption,
    ).toBe(40);
    expect(repo.listByCustomer(customerId).map(r => r.period)).toEqual([
      '08/2026',
      '07/2026',
    ]);
  });

  it('findLatestByCustomer() trả kỳ mới nhất', () => {
    const db = createMigratedTestDb();
    const customerId = createCustomer(db);
    const repo = new MeterRepository(db);
    repo.create({ customerId, period: '07/2026', oldReading: 0, newReading: 50 });
    repo.create({ customerId, period: '08/2026', oldReading: 50, newReading: 90 });

    expect(repo.findLatestByCustomer(customerId)?.period).toBe('08/2026');
  });

  it('nhập trùng (customerId, period) bị DB từ chối', () => {
    const db = createMigratedTestDb();
    const customerId = createCustomer(db);
    const repo = new MeterRepository(db);
    repo.create({ customerId, period: '08/2026', oldReading: 0, newReading: 50 });

    expect(() =>
      repo.create({ customerId, period: '08/2026', oldReading: 50, newReading: 90 }),
    ).toThrow();
  });
});
