import { createMigratedTestDb } from '../../test-utils/sqliteTestDb';
import { CustomerRepository } from '../CustomerRepository';
import { ImportedInvoiceRecordRepository } from '../ImportedInvoiceRecordRepository';
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

describe('ImportedInvoiceRecordRepository', () => {
  it('create() rồi listByCustomerId() đọc lại đúng dữ liệu', () => {
    const db = createMigratedTestDb();
    const repo = new ImportedInvoiceRecordRepository(db);
    const customerId = createCustomer(db);

    const created = repo.create({
      customerId,
      externalInvoiceId: 'INV001',
      invoiceType: 'TD',
      amount: 123456,
    });

    expect(created.id).toBeGreaterThan(0);
    const records = repo.listByCustomerId(customerId);
    expect(records).toHaveLength(1);
    expect(records[0]).toEqual(created);
  });

  it('listByCustomerId() chỉ trả về bản ghi của đúng khách hàng', () => {
    const db = createMigratedTestDb();
    const repo = new ImportedInvoiceRecordRepository(db);
    const customerId1 = createCustomer(db);
    const customerId2 = new CustomerRepository(db).create({
      customerCode: 'C0002',
      fullName: 'Trần Thị B',
      address: '',
      phone: '',
      meterCode: 'DC0002',
      serviceType: 'ELECTRIC',
      readingBookCode: null,
    }).id;

    repo.create({
      customerId: customerId1,
      externalInvoiceId: 'INV001',
      invoiceType: 'TD',
      amount: 100,
    });
    repo.create({
      customerId: customerId2,
      externalInvoiceId: 'INV002',
      invoiceType: 'VC',
      amount: 200,
    });

    expect(repo.listByCustomerId(customerId1)).toHaveLength(1);
    expect(repo.listByCustomerId(customerId2)).toHaveLength(1);
  });

  it('existsByExternalInvoiceId() đúng true/false', () => {
    const db = createMigratedTestDb();
    const repo = new ImportedInvoiceRecordRepository(db);
    const customerId = createCustomer(db);

    expect(repo.existsByExternalInvoiceId('INV001')).toBe(false);
    repo.create({
      customerId,
      externalInvoiceId: 'INV001',
      invoiceType: null,
      amount: 100,
    });
    expect(repo.existsByExternalInvoiceId('INV001')).toBe(true);
  });

  it('invoiceType null được lưu và đọc lại đúng', () => {
    const db = createMigratedTestDb();
    const repo = new ImportedInvoiceRecordRepository(db);
    const customerId = createCustomer(db);

    const created = repo.create({
      customerId,
      externalInvoiceId: 'INV001',
      invoiceType: null,
      amount: 100,
    });
    expect(created.invoiceType).toBeNull();
  });

  it('findById() đọc lại đúng bản ghi, trả về null nếu không tồn tại', () => {
    const db = createMigratedTestDb();
    const repo = new ImportedInvoiceRecordRepository(db);
    const customerId = createCustomer(db);

    const created = repo.create({
      customerId,
      externalInvoiceId: 'INV001',
      invoiceType: 'TD',
      amount: 100,
    });

    expect(repo.findById(created.id)).toEqual(created);
    expect(repo.findById(999999)).toBeNull();
  });

  describe('search() / count()', () => {
    function setup(db: SqlDb) {
      const repo = new ImportedInvoiceRecordRepository(db);
      const customerRepo = new CustomerRepository(db);
      const customerId1 = customerRepo.create({
        customerCode: 'C0001',
        fullName: 'Nguyễn Văn A',
        address: '',
        phone: '',
        meterCode: 'DC0001',
        serviceType: 'ELECTRIC',
        readingBookCode: null,
      }).id;
      const customerId2 = customerRepo.create({
        customerCode: 'C0002',
        fullName: 'Trần Thị B',
        address: '',
        phone: '',
        meterCode: 'DC0002',
        serviceType: 'ELECTRIC',
        readingBookCode: null,
      }).id;
      repo.create({
        customerId: customerId1,
        externalInvoiceId: 'INV001',
        invoiceType: 'TD',
        amount: 100,
      });
      repo.create({
        customerId: customerId2,
        externalInvoiceId: 'INV002',
        invoiceType: 'VC',
        amount: 200,
      });
      return repo;
    }

    it('không truyền keyword trả về đủ, kèm đúng tên/mã khách hàng (join)', () => {
      const db = createMigratedTestDb();
      const repo = setup(db);

      const items = repo.search();
      expect(items).toHaveLength(2);
      expect(repo.count()).toBe(2);
      const forC0001 = items.find(i => i.customerCode === 'C0001');
      expect(forC0001?.customerFullName).toBe('Nguyễn Văn A');
      expect(forC0001?.externalInvoiceId).toBe('INV001');
    });

    it('tìm theo tiền tố tên khách hàng', () => {
      const db = createMigratedTestDb();
      const repo = setup(db);

      const items = repo.search({ keyword: 'Nguyễn' });
      expect(items).toHaveLength(1);
      expect(items[0].customerCode).toBe('C0001');
      expect(repo.count({ keyword: 'Nguyễn' })).toBe(1);
    });

    it('tìm theo tiền tố mã khách hàng', () => {
      const db = createMigratedTestDb();
      const repo = setup(db);

      const items = repo.search({ keyword: 'C0002' });
      expect(items).toHaveLength(1);
      expect(items[0].externalInvoiceId).toBe('INV002');
    });

    it('phân trang đúng qua limit/offset', () => {
      const db = createMigratedTestDb();
      const repo = setup(db);

      const firstPage = repo.search({ limit: 1, offset: 0 });
      const secondPage = repo.search({ limit: 1, offset: 1 });
      expect(firstPage).toHaveLength(1);
      expect(secondPage).toHaveLength(1);
      expect(firstPage[0].id).not.toBe(secondPage[0].id);
    });
  });
});
