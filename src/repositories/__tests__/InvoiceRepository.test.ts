import { createMigratedTestDb } from '../../test-utils/sqliteTestDb';
import { CustomerRepository } from '../CustomerRepository';
import {
  DuplicateInvoiceCodeError,
  InvoiceRepository,
} from '../InvoiceRepository';
import type { NewInvoice } from '../../models/Invoice';
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

function makeInvoice(customerId: number, overrides: Partial<NewInvoice> = {}): NewInvoice {
  return {
    invoiceCode: 'HD000001',
    customerId,
    period: '08/2026',
    periodFrom: '2026-07-01',
    periodTo: '2026-07-31',
    oldReading: 100,
    newReading: 150,
    consumption: 50,
    subtotal: 100000,
    tax: 10000,
    serviceFee: 5000,
    total: 115000,
    collectedByUserId: null,
    ...overrides,
  };
}

describe('InvoiceRepository', () => {
  it('create() lưu đủ các field in hóa đơn (period, serviceFee...) với printStatus mặc định NOT_PRINTED', () => {
    const db = createMigratedTestDb();
    const customerId = createCustomer(db);
    const repo = new InvoiceRepository(db);

    const invoice = repo.create(makeInvoice(customerId));

    expect(invoice.printStatus).toBe('NOT_PRINTED');
    expect(invoice.printedAt).toBeNull();
    expect(invoice.serviceFee).toBe(5000);
    expect(invoice.periodFrom).toBe('2026-07-01');
    expect(invoice.periodTo).toBe('2026-07-31');
    expect(repo.findByCode('HD000001')).toEqual(invoice);
  });

  it('invoiceCode trùng ném DuplicateInvoiceCodeError', () => {
    const db = createMigratedTestDb();
    const customerId = createCustomer(db);
    const repo = new InvoiceRepository(db);
    repo.create(makeInvoice(customerId));

    expect(() => repo.create(makeInvoice(customerId))).toThrow(
      DuplicateInvoiceCodeError,
    );
  });

  it('updatePrintStatus() cập nhật printStatus và printedAt', () => {
    const db = createMigratedTestDb();
    const customerId = createCustomer(db);
    const repo = new InvoiceRepository(db);
    const invoice = repo.create(makeInvoice(customerId));

    repo.updatePrintStatus(invoice.id, 'PRINTED', '2026-08-12T15:07:00.000Z');

    const updated = repo.findById(invoice.id);
    expect(updated?.printStatus).toBe('PRINTED');
    expect(updated?.printedAt).toBe('2026-08-12T15:07:00.000Z');
  });

  it('listByCustomer() và listByPeriod() lọc đúng', () => {
    const db = createMigratedTestDb();
    const customerId = createCustomer(db);
    const repo = new InvoiceRepository(db);
    repo.create(makeInvoice(customerId, { invoiceCode: 'HD000001', period: '07/2026' }));
    repo.create(makeInvoice(customerId, { invoiceCode: 'HD000002', period: '08/2026' }));

    expect(repo.listByCustomer(customerId).length).toBe(2);
    expect(repo.listByPeriod('08/2026').map(i => i.invoiceCode)).toEqual([
      'HD000002',
    ]);
  });
});
