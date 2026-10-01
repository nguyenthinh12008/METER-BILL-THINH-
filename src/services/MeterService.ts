import { MeterRepository } from '../repositories/MeterRepository';
import type { MeterReading, NewMeterReading } from '../models/MeterReading';

export class MeterService {
  constructor(private readonly repo: MeterRepository = new MeterRepository()) {}

  /** 0 nếu khách hàng chưa có lịch sử chỉ số nào. */
  getSuggestedOldReading(customerId: number): number {
    return this.repo.findLatestByCustomer(customerId)?.newReading ?? 0;
  }

  create(input: NewMeterReading): MeterReading {
    if (input.newReading < input.oldReading) {
      throw new Error('Chỉ số mới phải lớn hơn hoặc bằng chỉ số cũ');
    }
    try {
      return this.repo.create(input);
    } catch (error) {
      if (String(error).toUpperCase().includes('UNIQUE')) {
        throw new Error(`Đã nhập chỉ số cho kỳ ${input.period} rồi`);
      }
      throw error;
    }
  }

  listByCustomer(customerId: number): MeterReading[] {
    return this.repo.listByCustomer(customerId);
  }
}
