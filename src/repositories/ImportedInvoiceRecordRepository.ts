import { getDatabase } from '../database/database';
import type { SqlDb } from '../database/types';
import type {
  ImportedInvoiceRecord,
  ImportedInvoiceRecordWithCustomer,
  NewImportedInvoiceRecord,
} from '../models/ImportedInvoiceRecord';

export class ImportedInvoiceRecordRepository {
  constructor(private readonly db: SqlDb = getDatabase()) {}

  create(input: NewImportedInvoiceRecord): ImportedInvoiceRecord {
    const now = new Date().toISOString();
    const result = this.db.execute(
      `INSERT INTO imported_invoice_records
         (customerId, externalInvoiceId, invoiceType, amount, importedAt)
       VALUES (?, ?, ?, ?, ?)`,
      [
        input.customerId,
        input.externalInvoiceId,
        input.invoiceType,
        input.amount,
        now,
      ],
    );
    const row = this.db.execute<ImportedInvoiceRecord>(
      `SELECT * FROM imported_invoice_records WHERE id = ?`,
      [result.insertId as number],
    );
    return row.rows[0];
  }

  findById(id: number): ImportedInvoiceRecord | null {
    const result = this.db.execute<ImportedInvoiceRecord>(
      `SELECT * FROM imported_invoice_records WHERE id = ?`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  listByCustomerId(customerId: number): ImportedInvoiceRecord[] {
    const result = this.db.execute<ImportedInvoiceRecord>(
      `SELECT * FROM imported_invoice_records
       WHERE customerId = ? ORDER BY importedAt DESC`,
      [customerId],
    );
    return result.rows;
  }

  existsByExternalInvoiceId(externalInvoiceId: string): boolean {
    const result = this.db.execute<{ total: number }>(
      `SELECT COUNT(*) as total FROM imported_invoice_records WHERE externalInvoiceId = ?`,
      [externalInvoiceId],
    );
    return (result.rows[0]?.total ?? 0) > 0;
  }

  /**
   * Dùng cho màn "Hóa đơn cần in" — join sẵn tên/mã khách hàng để hiển thị,
   * tìm theo tiền tố (giữ được index của customers) như
   * `CustomerRepository.search()`.
   */
  search(
    options: { keyword?: string; limit?: number; offset?: number } = {},
  ): ImportedInvoiceRecordWithCustomer[] {
    const { keyword, limit = 50, offset = 0 } = options;
    if (keyword && keyword.trim().length > 0) {
      const prefix = `${keyword.trim()}%`;
      const result = this.db.execute<ImportedInvoiceRecordWithCustomer>(
        `SELECT r.*, c.customerCode as customerCode, c.fullName as customerFullName
         FROM imported_invoice_records r
         JOIN customers c ON c.id = r.customerId
         WHERE c.customerCode LIKE ? OR c.fullName LIKE ? OR c.meterCode LIKE ?
         ORDER BY c.fullName, r.importedAt DESC
         LIMIT ? OFFSET ?`,
        [prefix, prefix, prefix, limit, offset],
      );
      return result.rows;
    }
    const result = this.db.execute<ImportedInvoiceRecordWithCustomer>(
      `SELECT r.*, c.customerCode as customerCode, c.fullName as customerFullName
       FROM imported_invoice_records r
       JOIN customers c ON c.id = r.customerId
       ORDER BY c.fullName, r.importedAt DESC
       LIMIT ? OFFSET ?`,
      [limit, offset],
    );
    return result.rows;
  }

  count(options: { keyword?: string } = {}): number {
    const { keyword } = options;
    if (keyword && keyword.trim().length > 0) {
      const prefix = `${keyword.trim()}%`;
      const result = this.db.execute<{ total: number }>(
        `SELECT COUNT(*) as total
         FROM imported_invoice_records r
         JOIN customers c ON c.id = r.customerId
         WHERE c.customerCode LIKE ? OR c.fullName LIKE ? OR c.meterCode LIKE ?`,
        [prefix, prefix, prefix],
      );
      return result.rows[0]?.total ?? 0;
    }
    const result = this.db.execute<{ total: number }>(
      `SELECT COUNT(*) as total
       FROM imported_invoice_records r
       JOIN customers c ON c.id = r.customerId`,
    );
    return result.rows[0]?.total ?? 0;
  }
}
