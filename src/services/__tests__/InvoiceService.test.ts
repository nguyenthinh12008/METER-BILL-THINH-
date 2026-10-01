import { createMigratedTestDb } from '../../test-utils/sqliteTestDb';
import { CustomerRepository } from '../../repositories/CustomerRepository';
import { MeterRepository } from '../../repositories/MeterRepository';
import { InvoiceRepository } from '../../repositories/InvoiceRepository';
import { TariffRepository } from '../../repositories/TariffRepository';
import { UserRepository } from '../../repositories/UserRepository';
import { BillingService } from '../BillingService';
import { InvoiceService } from '../InvoiceService';
import type { SqlDb } from '../../database/types';

function setup(db: SqlDb) {
  const customerRepo = new CustomerRepository(db);
  const meterRepo = new MeterRepository(db);
  const invoiceRepo = new InvoiceRepository(db);
  const tariffRepo = new TariffRepository(db);
  const userRepo = new UserRepository(db);
  const billingService = new BillingService(tariffRepo);
  const service = new InvoiceService(
    invoiceRepo,
    meterRepo,
    customerRepo,
    billingService,
  );

  // Bậc giá phẳng (1 bậc) để phép tính kỳ vọng trong test đơn giản, dễ theo dõi.
  tariffRepo.create({ serviceType: 'ELECTRIC', fromValue: 0, toValue: null, price: 2000 });

  const customer = customerRepo.create({
    customerCode: 'C0001',
    fullName: 'Nguyễn Văn A',
    address: '',
    phone: '',
    meterCode: 'DC0001',
    serviceType: 'ELECTRIC',
    readingBookCode: null,
  });

  // invoices.collectedByUserId có FK thật (PRAGMA foreign_keys = ON trong test
  // DB) — phải có 1 user thật để tham chiếu.
  const collector = userRepo.create({
    username: 'thu1',
    fullName: 'Nhân viên thu',
    phone: '',
    passwordHash: 'hash',
    passwordSalt: 'salt',
  });

  return { customerRepo, meterRepo, invoiceRepo, service, customer, collectorUserId: collector.id };
}

describe('InvoiceService', () => {
  it('buildPreview() tính đúng bill và khoảng ngày mặc định theo period', () => {
    const db = createMigratedTestDb();
    const { meterRepo, service, customer } = setup(db);
    const reading = meterRepo.create({
      customerId: customer.id,
      period: '09/2026',
      oldReading: 0,
      newReading: 100,
    });

    const preview = service.buildPreview(reading.id);

    expect(preview.bill).toEqual({ subtotal: 200000, tax: 0, total: 200000 });
    expect(preview.periodFrom).toBe('2026-09-01');
    expect(preview.periodTo).toBe('2026-09-30');
    expect(preview.customer.id).toBe(customer.id);
  });

  it('create() tính total = subtotal + tax + serviceFee, sinh invoiceCode HD000001, lưu đúng collectedByUserId', () => {
    const db = createMigratedTestDb();
    const { meterRepo, service, customer, collectorUserId } = setup(db);
    const reading = meterRepo.create({
      customerId: customer.id,
      period: '09/2026',
      oldReading: 0,
      newReading: 100,
    });

    const invoice = service.create({
      meterReadingId: reading.id,
      periodFrom: '2026-09-01',
      periodTo: '2026-09-30',
      serviceFee: 5000,
      collectedByUserId: collectorUserId,
    });

    expect(invoice.invoiceCode).toBe('HD000001');
    expect(invoice.subtotal).toBe(200000);
    expect(invoice.serviceFee).toBe(5000);
    expect(invoice.total).toBe(205000);
    expect(invoice.printStatus).toBe('NOT_PRINTED');
    expect(invoice.collectedByUserId).toBe(collectorUserId);
  });

  it('invoiceCode tăng dần tuần tự qua nhiều lần tạo', () => {
    const db = createMigratedTestDb();
    const { meterRepo, service, customer, collectorUserId } = setup(db);
    const reading1 = meterRepo.create({
      customerId: customer.id,
      period: '08/2026',
      oldReading: 0,
      newReading: 50,
    });
    const reading2 = meterRepo.create({
      customerId: customer.id,
      period: '09/2026',
      oldReading: 50,
      newReading: 100,
    });

    const invoice1 = service.create({
      meterReadingId: reading1.id,
      periodFrom: '2026-08-01',
      periodTo: '2026-08-31',
      serviceFee: 0,
      collectedByUserId: collectorUserId,
    });
    const invoice2 = service.create({
      meterReadingId: reading2.id,
      periodFrom: '2026-09-01',
      periodTo: '2026-09-30',
      serviceFee: 0,
      collectedByUserId: collectorUserId,
    });

    expect(invoice1.invoiceCode).toBe('HD000001');
    expect(invoice2.invoiceCode).toBe('HD000002');
  });

  it('getById() đọc lại đúng hóa đơn vừa tạo', () => {
    const db = createMigratedTestDb();
    const { meterRepo, service, customer, collectorUserId } = setup(db);
    const reading = meterRepo.create({
      customerId: customer.id,
      period: '09/2026',
      oldReading: 0,
      newReading: 100,
    });
    const created = service.create({
      meterReadingId: reading.id,
      periodFrom: '2026-09-01',
      periodTo: '2026-09-30',
      serviceFee: 0,
      collectedByUserId: collectorUserId,
    });

    expect(service.getById(created.id)).toEqual(created);
    expect(service.getById(999999)).toBeNull();
  });

  describe('markPrinted / markPrintFailed', () => {
    it('markPrinted() cập nhật printStatus = PRINTED và printedAt', () => {
      const db = createMigratedTestDb();
      const { meterRepo, service, customer, collectorUserId } = setup(db);
      const reading = meterRepo.create({
        customerId: customer.id,
        period: '09/2026',
        oldReading: 0,
        newReading: 100,
      });
      const invoice = service.create({
        meterReadingId: reading.id,
        periodFrom: '2026-09-01',
        periodTo: '2026-09-30',
        serviceFee: 0,
        collectedByUserId: collectorUserId,
      });

      service.markPrinted(invoice.id, '2026-08-12T15:07:00.000Z');

      const updated = service.getById(invoice.id);
      expect(updated?.printStatus).toBe('PRINTED');
      expect(updated?.printedAt).toBe('2026-08-12T15:07:00.000Z');
    });

    it('markPrintFailed() cập nhật printStatus = PRINT_FAILED, không set printedAt', () => {
      const db = createMigratedTestDb();
      const { meterRepo, service, customer, collectorUserId } = setup(db);
      const reading = meterRepo.create({
        customerId: customer.id,
        period: '09/2026',
        oldReading: 0,
        newReading: 100,
      });
      const invoice = service.create({
        meterReadingId: reading.id,
        periodFrom: '2026-09-01',
        periodTo: '2026-09-30',
        serviceFee: 0,
        collectedByUserId: collectorUserId,
      });

      service.markPrintFailed(invoice.id);

      const updated = service.getById(invoice.id);
      expect(updated?.printStatus).toBe('PRINT_FAILED');
      expect(updated?.printedAt).toBeNull();
    });
  });

  describe('listByPeriod / listRecent (dùng cho trang chủ)', () => {
    it('listByPeriod() chỉ trả hóa đơn đúng kỳ', () => {
      const db = createMigratedTestDb();
      const { meterRepo, service, customer, collectorUserId } = setup(db);
      const reading1 = meterRepo.create({
        customerId: customer.id,
        period: '08/2026',
        oldReading: 0,
        newReading: 50,
      });
      const reading2 = meterRepo.create({
        customerId: customer.id,
        period: '09/2026',
        oldReading: 50,
        newReading: 100,
      });
      service.create({
        meterReadingId: reading1.id,
        periodFrom: '2026-08-01',
        periodTo: '2026-08-31',
        serviceFee: 0,
        collectedByUserId: collectorUserId,
      });
      service.create({
        meterReadingId: reading2.id,
        periodFrom: '2026-09-01',
        periodTo: '2026-09-30',
        serviceFee: 0,
        collectedByUserId: collectorUserId,
      });

      expect(service.listByPeriod('08/2026').length).toBe(1);
      expect(service.listByPeriod('09/2026').length).toBe(1);
      expect(service.listByPeriod('10/2026').length).toBe(0);
    });

    it('listRecent() trả tối đa n hóa đơn, mới nhất trước', () => {
      const db = createMigratedTestDb();
      const { meterRepo, service, customer, collectorUserId } = setup(db);
      for (let i = 0; i < 3; i += 1) {
        const reading = meterRepo.create({
          customerId: customer.id,
          period: `0${i + 1}/2026`,
          oldReading: 0,
          newReading: 50,
        });
        service.create({
          meterReadingId: reading.id,
          periodFrom: `2026-0${i + 1}-01`,
          periodTo: `2026-0${i + 1}-28`,
          serviceFee: 0,
          collectedByUserId: collectorUserId,
        });
      }

      const recent = service.listRecent(2);
      expect(recent.length).toBe(2);
      expect(recent[0].invoiceCode).toBe('HD000003');
      expect(recent[1].invoiceCode).toBe('HD000002');
    });
  });
});
