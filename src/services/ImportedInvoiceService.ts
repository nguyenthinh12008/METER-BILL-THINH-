import { ImportedInvoiceRecordRepository } from '../repositories/ImportedInvoiceRecordRepository';
import type {
  ImportedInvoiceRecord,
  ImportedInvoiceRecordWithCustomer,
} from '../models/ImportedInvoiceRecord';

export class ImportedInvoiceService {
  constructor(
    private readonly repo: ImportedInvoiceRecordRepository = new ImportedInvoiceRecordRepository(),
  ) {}

  listByCustomerId(customerId: number): ImportedInvoiceRecord[] {
    return this.repo.listByCustomerId(customerId);
  }

  getById(id: number): ImportedInvoiceRecord | null {
    return this.repo.findById(id);
  }

  list(options: {
    keyword?: string;
    page: number;
    pageSize: number;
  }): { items: ImportedInvoiceRecordWithCustomer[]; total: number } {
    const { keyword, page, pageSize } = options;
    const offset = page * pageSize;
    const items = this.repo.search({ keyword, limit: pageSize, offset });
    const total = this.repo.count({ keyword });
    return { items, total };
  }
}
