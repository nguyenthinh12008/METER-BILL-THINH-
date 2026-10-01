import {
  DuplicateInvoiceCodeError,
  InvoiceRepository,
} from '../repositories/InvoiceRepository';
import { MeterRepository } from '../repositories/MeterRepository';
import { CustomerRepository } from '../repositories/CustomerRepository';
import { BillingService } from './BillingService';
import { getMonthRange } from '../utils/date';
import type { Customer } from '../models/Customer';
import type { MeterReading } from '../models/MeterReading';
import type { Invoice } from '../models/Invoice';
import type { BillResult } from './BillingCalculator';

export interface InvoicePreviewData {
  customer: Customer;
  reading: MeterReading;
  bill: BillResult;
  periodFrom: string;
  periodTo: string;
}

export interface CreateInvoiceInput {
  meterReadingId: number;
  periodFrom: string;
  periodTo: string;
  serviceFee: number;
  /** Nhân viên đang đăng nhập tạo hóa đơn — bắt buộc, chỉ gọi được sau khi đăng nhập. */
  collectedByUserId: number;
}

const MAX_INVOICE_CODE_ATTEMPTS = 5;

export class InvoiceService {
  constructor(
    private readonly repo: InvoiceRepository = new InvoiceRepository(),
    private readonly meterRepo: MeterRepository = new MeterRepository(),
    private readonly customerRepo: CustomerRepository = new CustomerRepository(),
    private readonly billingService: BillingService = new BillingService(),
  ) {}

  private loadReadingAndCustomer(meterReadingId: number): {
    reading: MeterReading;
    customer: Customer;
  } {
    const reading = this.meterRepo.findById(meterReadingId);
    if (!reading) {
      throw new Error(`Không tìm thấy chỉ số #${meterReadingId}`);
    }
    const customer = this.customerRepo.findById(reading.customerId);
    if (!customer) {
      throw new Error(`Không tìm thấy khách hàng #${reading.customerId}`);
    }
    return { reading, customer };
  }

  buildPreview(meterReadingId: number): InvoicePreviewData {
    const { reading, customer } = this.loadReadingAndCustomer(meterReadingId);
    const bill = this.billingService.estimate(
      customer.serviceType,
      reading.consumption,
    );
    const { from, to } = getMonthRange(reading.period);
    return { customer, reading, bill, periodFrom: from, periodTo: to };
  }

  create(input: CreateInvoiceInput): Invoice {
    const { reading, customer } = this.loadReadingAndCustomer(
      input.meterReadingId,
    );
    const bill = this.billingService.estimate(
      customer.serviceType,
      reading.consumption,
    );
    const total = bill.subtotal + bill.tax + input.serviceFee;
    const baseNumber = this.repo.count() + 1;

    for (let attempt = 0; attempt < MAX_INVOICE_CODE_ATTEMPTS; attempt += 1) {
      const invoiceCode = `HD${String(baseNumber + attempt).padStart(6, '0')}`;
      try {
        return this.repo.create({
          invoiceCode,
          customerId: customer.id,
          period: reading.period,
          periodFrom: input.periodFrom,
          periodTo: input.periodTo,
          oldReading: reading.oldReading,
          newReading: reading.newReading,
          consumption: reading.consumption,
          subtotal: bill.subtotal,
          tax: bill.tax,
          serviceFee: input.serviceFee,
          total,
          collectedByUserId: input.collectedByUserId,
        });
      } catch (error) {
        if (error instanceof DuplicateInvoiceCodeError) {
          continue;
        }
        throw error;
      }
    }
    throw new Error('Không thể sinh mã hóa đơn, vui lòng thử lại');
  }

  getById(id: number): Invoice | null {
    return this.repo.findById(id);
  }

  listByPeriod(period: string): Invoice[] {
    return this.repo.listByPeriod(period);
  }

  listRecent(limit: number): Invoice[] {
    return this.repo.listRecent(limit);
  }

  markPrinted(id: number, printedAt: string): void {
    this.repo.updatePrintStatus(id, 'PRINTED', printedAt);
  }

  markPrintFailed(id: number): void {
    this.repo.updatePrintStatus(id, 'PRINT_FAILED');
  }
}
