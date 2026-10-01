import { createMigratedTestDb } from '../../test-utils/sqliteTestDb';
import { CustomerRepository } from '../CustomerRepository';
import type { NewCustomer } from '../../models/Customer';

function makeCustomer(overrides: Partial<NewCustomer> = {}): NewCustomer {
  return {
    customerCode: 'C0001',
    fullName: 'Nguyễn Văn A',
    address: '1 Đường A',
    phone: '0900000000',
    meterCode: 'DC0001',
    serviceType: 'ELECTRIC',
    readingBookCode: null,
    ...overrides,
  };
}

describe('CustomerRepository', () => {
  it('create() rồi findById()/findByCode() đọc lại đúng dữ liệu', () => {
    const repo = new CustomerRepository(createMigratedTestDb());
    const created = repo.create(makeCustomer());

    expect(created.id).toBeGreaterThan(0);
    expect(repo.findById(created.id)).toEqual(created);
    expect(repo.findByCode('C0001')).toEqual(created);
    expect(repo.existsByCode('C0001')).toBe(true);
    expect(repo.existsByCode('KHONG_TON_TAI')).toBe(false);
  });

  it('update() ghi đè các field được truyền, giữ nguyên field còn lại', () => {
    const repo = new CustomerRepository(createMigratedTestDb());
    const created = repo.create(makeCustomer());

    repo.update(created.id, { fullName: 'Tên Mới' });
    const updated = repo.findById(created.id);

    expect(updated?.fullName).toBe('Tên Mới');
    expect(updated?.customerCode).toBe(created.customerCode);
  });

  it('remove() xoá khách hàng khỏi bảng', () => {
    const repo = new CustomerRepository(createMigratedTestDb());
    const created = repo.create(makeCustomer());

    repo.remove(created.id);

    expect(repo.findById(created.id)).toBeNull();
  });

  it('search() theo tiền tố customerCode/fullName/meterCode, count() khớp số kết quả', () => {
    const repo = new CustomerRepository(createMigratedTestDb());
    repo.create(makeCustomer({ customerCode: 'C0001', fullName: 'Nguyễn Văn A' }));
    repo.create(makeCustomer({ customerCode: 'C0002', fullName: 'Trần Thị B' }));

    expect(repo.search({ keyword: 'Nguyễn' }).map(c => c.customerCode)).toEqual([
      'C0001',
    ]);
    expect(repo.count({ keyword: 'Nguyễn' })).toBe(1);
    expect(repo.search().length).toBe(2);
    expect(repo.count()).toBe(2);
  });

  it('readingBookCode lưu và đọc lại đúng, giữ nguyên khi update field rỗng', () => {
    const repo = new CustomerRepository(createMigratedTestDb());
    const created = repo.create(makeCustomer({ readingBookCode: 'I0207-414' }));
    expect(created.readingBookCode).toBe('I0207-414');

    repo.update(created.id, { readingBookCode: null });
    expect(repo.findById(created.id)?.readingBookCode).toBeNull();
  });

  it('customerCode trùng bị DB từ chối (UNIQUE constraint)', () => {
    const repo = new CustomerRepository(createMigratedTestDb());
    repo.create(makeCustomer({ customerCode: 'C0001' }));

    expect(() => repo.create(makeCustomer({ customerCode: 'C0001' }))).toThrow();
  });

  describe('createMany()', () => {
    it('insert toàn bộ khi không có trùng, trả về đúng số created', () => {
      const repo = new CustomerRepository(createMigratedTestDb());
      const result = repo.createMany([
        makeCustomer({ customerCode: 'C0001' }),
        makeCustomer({ customerCode: 'C0002' }),
      ]);

      expect(result.created.length).toBe(2);
      expect(result.skippedDuplicateCodes).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(repo.count()).toBe(2);
    });

    it('bỏ qua customerCode đã tồn tại trong DB, không ghi đè', () => {
      const repo = new CustomerRepository(createMigratedTestDb());
      repo.create(makeCustomer({ customerCode: 'C0001', fullName: 'Đã có' }));

      const result = repo.createMany([
        makeCustomer({ customerCode: 'C0001', fullName: 'Từ import' }),
        makeCustomer({ customerCode: 'C0002' }),
      ]);

      expect(result.created.length).toBe(1);
      expect(result.skippedDuplicateCodes).toEqual(['C0001']);
      expect(repo.findByCode('C0001')?.fullName).toBe('Đã có');
      expect(repo.count()).toBe(2);
    });

    it('onDuplicate: "update" cập nhật field có giá trị, giữ nguyên field rỗng trong input', () => {
      const repo = new CustomerRepository(createMigratedTestDb());
      const original = repo.create(
        makeCustomer({
          customerCode: 'C0001',
          fullName: 'Tên cũ',
          address: 'Địa chỉ cũ',
          phone: '0900000001',
          meterCode: 'DC-CU',
        }),
      );

      const result = repo.createMany(
        [
          makeCustomer({
            customerCode: 'C0001',
            fullName: 'Tên mới',
            address: '',
            phone: '0900000099',
            meterCode: '',
          }),
        ],
        { onDuplicate: 'update' },
      );

      expect(result.created).toEqual([]);
      expect(result.skippedDuplicateCodes).toEqual([]);
      expect(result.updated.length).toBe(1);

      const updated = repo.findByCode('C0001');
      expect(updated?.id).toBe(original.id);
      expect(updated?.fullName).toBe('Tên mới');
      expect(updated?.phone).toBe('0900000099');
      expect(updated?.address).toBe('Địa chỉ cũ'); // input rỗng -> giữ nguyên
      expect(updated?.meterCode).toBe('DC-CU'); // input rỗng -> giữ nguyên
    });

    it('onDuplicate: "update" cập nhật readingBookCode có giá trị, giữ nguyên khi input null', () => {
      const repo = new CustomerRepository(createMigratedTestDb());
      repo.create(makeCustomer({ customerCode: 'C0001', readingBookCode: 'I0207-414' }));

      repo.createMany(
        [makeCustomer({ customerCode: 'C0001', readingBookCode: null })],
        { onDuplicate: 'update' },
      );
      expect(repo.findByCode('C0001')?.readingBookCode).toBe('I0207-414');

      repo.createMany(
        [makeCustomer({ customerCode: 'C0001', readingBookCode: 'I0207-999' })],
        { onDuplicate: 'update' },
      );
      expect(repo.findByCode('C0001')?.readingBookCode).toBe('I0207-999');
    });

    it('onDuplicate: "update" vẫn insert bình thường customerCode chưa tồn tại', () => {
      const repo = new CustomerRepository(createMigratedTestDb());

      const result = repo.createMany(
        [makeCustomer({ customerCode: 'C0001' })],
        { onDuplicate: 'update' },
      );

      expect(result.created.length).toBe(1);
      expect(result.updated).toEqual([]);
    });
  });
});
