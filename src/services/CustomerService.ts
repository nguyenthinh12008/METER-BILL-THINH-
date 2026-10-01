import { CustomerRepository } from '../repositories/CustomerRepository';
import type { Customer, NewCustomer, ServiceType } from '../models/Customer';

const SERVICE_TYPES: ServiceType[] = ['ELECTRIC', 'WATER'];

function trimmed(value: string): string {
  return value.trim();
}

export class CustomerService {
  constructor(private readonly repo: CustomerRepository = new CustomerRepository()) {}

  /** Trả về danh sách lỗi (rỗng = hợp lệ). Không throw — để Screen tự hiển thị. */
  validate(input: NewCustomer): string[] {
    const errors: string[] = [];
    if (trimmed(input.customerCode).length === 0) {
      errors.push('Mã khách hàng không được để trống');
    }
    if (trimmed(input.fullName).length === 0) {
      errors.push('Họ tên không được để trống');
    }
    if (!SERVICE_TYPES.includes(input.serviceType)) {
      errors.push('Loại dịch vụ không hợp lệ');
    }
    return errors;
  }

  private normalize(input: NewCustomer): NewCustomer {
    const readingBookCode = input.readingBookCode?.trim();
    return {
      customerCode: trimmed(input.customerCode),
      fullName: trimmed(input.fullName),
      address: trimmed(input.address),
      phone: trimmed(input.phone),
      meterCode: trimmed(input.meterCode),
      serviceType: input.serviceType,
      readingBookCode: readingBookCode ? readingBookCode : null,
    };
  }

  create(input: NewCustomer): Customer {
    const normalized = this.normalize(input);
    const errors = this.validate(normalized);
    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
    if (this.repo.existsByCode(normalized.customerCode)) {
      throw new Error(`Mã khách hàng đã tồn tại: ${normalized.customerCode}`);
    }
    return this.repo.create(normalized);
  }

  update(id: number, input: Partial<NewCustomer>): void {
    const current = this.repo.findById(id);
    if (!current) {
      throw new Error(`Không tìm thấy khách hàng #${id}`);
    }
    const merged = this.normalize({ ...current, ...input });
    const errors = this.validate(merged);
    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
    if (
      merged.customerCode !== current.customerCode &&
      this.repo.existsByCode(merged.customerCode)
    ) {
      throw new Error(`Mã khách hàng đã tồn tại: ${merged.customerCode}`);
    }
    this.repo.update(id, merged);
  }

  remove(id: number): void {
    this.repo.remove(id);
  }

  getById(id: number): Customer | null {
    return this.repo.findById(id);
  }

  list(options: {
    keyword?: string;
    page: number;
    pageSize: number;
  }): { items: Customer[]; total: number } {
    const { keyword, page, pageSize } = options;
    const offset = page * pageSize;
    const items = this.repo.search({ keyword, limit: pageSize, offset });
    const total = this.repo.count({ keyword });
    return { items, total };
  }

  count(): number {
    return this.repo.count();
  }
}
