import { createMigratedTestDb } from '../../test-utils/sqliteTestDb';
import { CustomerRepository } from '../../repositories/CustomerRepository';
import { MeterRepository } from '../../repositories/MeterRepository';
import { MeterService } from '../MeterService';
import type { SqlDb } from '../../database/types';

function createCustomer(db: SqlDb): number {
  return new CustomerRepository(db).create({
    customerCode: 'C0001',
    fullName: 'Nguyễn Văn A',
    address: '',
    phone: '',
    meterCode: 'DC0001',
    serviceType: 'ELECTRIC',
    readingBookCode: null,
  }).id;
}

function makeService(db: SqlDb): MeterService {
  return new MeterService(new MeterRepository(db));
}

describe('MeterService', () => {
  describe('getSuggestedOldReading', () => {
    it('trả 0 khi khách hàng chưa có lịch sử chỉ số', () => {
      const db = createMigratedTestDb();
      const customerId = createCustomer(db);
      expect(makeService(db).getSuggestedOldReading(customerId)).toBe(0);
    });

    it('trả newReading của kỳ gần nhất khi đã có lịch sử', () => {
      const db = createMigratedTestDb();
      const customerId = createCustomer(db);
      const service = makeService(db);
      service.create({ customerId, period: '07/2026', oldReading: 0, newReading: 50 });
      service.create({ customerId, period: '08/2026', oldReading: 50, newReading: 90 });

      expect(service.getSuggestedOldReading(customerId)).toBe(90);
    });
  });

  describe('create', () => {
    it('throw khi newReading < oldReading', () => {
      const db = createMigratedTestDb();
      const customerId = createCustomer(db);
      expect(() =>
        makeService(db).create({
          customerId,
          period: '08/2026',
          oldReading: 100,
          newReading: 50,
        }),
      ).toThrow('Chỉ số mới phải lớn hơn hoặc bằng chỉ số cũ');
    });

    it('throw thông báo tiếng Việt khi trùng kỳ đã nhập', () => {
      const db = createMigratedTestDb();
      const customerId = createCustomer(db);
      const service = makeService(db);
      service.create({ customerId, period: '08/2026', oldReading: 0, newReading: 50 });

      expect(() =>
        service.create({ customerId, period: '08/2026', oldReading: 50, newReading: 90 }),
      ).toThrow('Đã nhập chỉ số cho kỳ 08/2026 rồi');
    });

    it('cho phép newReading = oldReading (tiêu thụ 0)', () => {
      const db = createMigratedTestDb();
      const customerId = createCustomer(db);
      const reading = makeService(db).create({
        customerId,
        period: '08/2026',
        oldReading: 50,
        newReading: 50,
      });
      expect(reading.consumption).toBe(0);
    });
  });

  describe('listByCustomer', () => {
    it('trả đúng danh sách chỉ số của khách hàng', () => {
      const db = createMigratedTestDb();
      const customerId = createCustomer(db);
      const service = makeService(db);
      service.create({ customerId, period: '07/2026', oldReading: 0, newReading: 50 });
      service.create({ customerId, period: '08/2026', oldReading: 50, newReading: 90 });

      expect(service.listByCustomer(customerId).length).toBe(2);
    });
  });
});
