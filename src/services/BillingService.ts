import { TariffRepository } from '../repositories/TariffRepository';
import type { ServiceType } from '../models/Customer';
import { calculateBill, type BillResult } from './BillingCalculator';

export class BillingService {
  constructor(private readonly tariffRepo: TariffRepository = new TariffRepository()) {}

  /** Trả {0,0,0} nếu chưa có tariff nào cho serviceType — Screen tự cảnh báo, không throw. */
  estimate(serviceType: ServiceType, consumption: number, taxRate = 0): BillResult {
    const tiers = this.tariffRepo.listByServiceType(serviceType);
    return calculateBill(consumption, tiers, taxRate);
  }
}
