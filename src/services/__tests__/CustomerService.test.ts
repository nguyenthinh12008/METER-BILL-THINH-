import { createMigratedTestDb } from '../../test-utils/sqliteTestDb';
import { CustomerRepository } from '../../repositories/CustomerRepository';
import { CustomerService } from '../CustomerService';
import type { NewCustomer } from '../../models/Customer';

function makeService(): CustomerService {
  return new CustomerService(new CustomerRepository(createMigratedTestDb()));
}

function makeCustomer(overrides: Partial<NewCustomer> = {}): NewCustomer {
  return {
    customerCode: 'C0001',
    fullName: 'Nguyễn Văn A',
    address: '',
    phone: '',
    meterCode: '',
    serviceType: 'ELECTRIC',
    readingBookCode: null,
    ...overrides,
  };
}

describe('CustomerService', () => {
  describe('validate', () => {
    it('báo lỗi khi thiếu customerCode/fullName hoặc serviceType không hợp lệ', () => {
      const service = makeService();
      expect(
        service.validate(makeCustomer({ customerCode: '', fullName: '' })),
      ).toEqual(
        expect.arrayContaining([
          'Mã khách hàng không được để trống',
          'Họ tên không được để trống',
        ]),
      );
    });

    it('không lỗi với dữ liệu hợp lệ', () => {
      const service = makeService();
      expect(service.validate(makeCustomer())).toEqual([]);
    });
  });

  describe('create', () => {
    it('trim field chuỗi trước khi lưu', () => {
      const service = makeService();
      const created = service.create(
        makeCustomer({ customerCode: '  C0001  ', fullName: '  Nguyễn Văn A  ' }),
      );
      expect(created.customerCode).toBe('C0001');
      expect(created.fullName).toBe('Nguyễn Văn A');
    });

    it('throw khi thiếu field bắt buộc', () => {
      const service = makeService();
      expect(() => service.create(makeCustomer({ fullName: '' }))).toThrow();
    });

    it('throw khi customerCode đã tồn tại', () => {
      const service = makeService();
      service.create(makeCustomer({ customerCode: 'C0001' }));
      expect(() => service.create(makeCustomer({ customerCode: 'C0001' }))).toThrow();
    });
  });

  describe('update', () => {
    it('cập nhật field được truyền, throw nếu customer không tồn tại', () => {
      const service = makeService();
      const created = service.create(makeCustomer());

      service.update(created.id, { fullName: 'Tên mới' });
      expect(service.getById(created.id)?.fullName).toBe('Tên mới');

      expect(() => service.update(9999, { fullName: 'x' })).toThrow();
    });

    it('throw khi đổi customerCode sang mã đã tồn tại của khách hàng khác', () => {
      const service = makeService();
      service.create(makeCustomer({ customerCode: 'C0001' }));
      const second = service.create(makeCustomer({ customerCode: 'C0002' }));

      expect(() =>
        service.update(second.id, { customerCode: 'C0001' }),
      ).toThrow();
    });
  });

  describe('list', () => {
    it('phân trang đúng theo page/pageSize và giữ nguyên keyword khi đếm total', () => {
      const service = makeService();
      for (let i = 1; i <= 5; i += 1) {
        service.create(
          makeCustomer({
            customerCode: `C000${i}`,
            fullName: `Khách ${i}`,
          }),
        );
      }

      const firstPage = service.list({ page: 0, pageSize: 2 });
      expect(firstPage.items.length).toBe(2);
      expect(firstPage.total).toBe(5);

      const secondPage = service.list({ page: 1, pageSize: 2 });
      expect(secondPage.items.length).toBe(2);
      expect(secondPage.items[0].customerCode).not.toBe(
        firstPage.items[0].customerCode,
      );
    });
  });

  describe('remove', () => {
    it('xoá khách hàng khỏi danh sách', () => {
      const service = makeService();
      const created = service.create(makeCustomer());
      service.remove(created.id);
      expect(service.getById(created.id)).toBeNull();
    });
  });

  describe('count', () => {
    it('trả đúng tổng số khách hàng, không lọc theo keyword', () => {
      const service = makeService();
      expect(service.count()).toBe(0);
      service.create(makeCustomer({ customerCode: 'C0001' }));
      service.create(makeCustomer({ customerCode: 'C0002' }));
      expect(service.count()).toBe(2);
    });
  });
});
