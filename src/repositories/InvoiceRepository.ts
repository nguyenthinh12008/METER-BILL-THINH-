import { getDatabase } from '../database/database';
import type { SqlDb } from '../database/types';
import type { Invoice, NewInvoice, PrintStatus } from '../models/Invoice';

export class DuplicateInvoiceCodeError extends Error {
  constructor(invoiceCode: string) {
    super(`Invoice code already exists: ${invoiceCode}`);
    this.name = 'DuplicateInvoiceCodeError';
  }
}

export class InvoiceRepository {
  constructor(private readonly db: SqlDb = getDatabase()) {}

  /** invoiceCode unique được DB đảm bảo (UNIQUE constraint) — không chỉ kiểm tra ở đây. */
  create(input: NewInvoice): Invoice {
    return this.db.transaction(tx => {
      let insertId: number;
      try {
        const result = tx.execute(
          `INSERT INTO invoices
             (invoiceCode, customerId, period, periodFrom, periodTo, oldReading, newReading,
              consumption, subtotal, tax, serviceFee, total, createdAt, printedAt, printStatus,
              collectedByUserId)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'NOT_PRINTED', ?)`,
          [
            input.invoiceCode,
            input.customerId,
            input.period,
            input.periodFrom,
            input.periodTo,
            input.oldReading,
            input.newReading,
            input.consumption,
            input.subtotal,
            input.tax,
            input.serviceFee,
            input.total,
            new Date().toISOString(),
            input.collectedByUserId,
          ],
        );
        insertId = result.insertId as number;
      } catch (error) {
        if (String(error).toUpperCase().includes('UNIQUE')) {
          throw new DuplicateInvoiceCodeError(input.invoiceCode);
        }
        throw error;
      }
      const row = tx.execute<Invoice>(`SELECT * FROM invoices WHERE id = ?`, [
        insertId,
      ]);
      return row.rows[0];
    });
  }

  findById(id: number): Invoice | null {
    const result = this.db.execute<Invoice>(
      `SELECT * FROM invoices WHERE id = ?`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  findByCode(invoiceCode: string): Invoice | null {
    const result = this.db.execute<Invoice>(
      `SELECT * FROM invoices WHERE invoiceCode = ?`,
      [invoiceCode],
    );
    return result.rows[0] ?? null;
  }

  listByCustomer(customerId: number): Invoice[] {
    const result = this.db.execute<Invoice>(
      `SELECT * FROM invoices WHERE customerId = ? ORDER BY createdAt DESC`,
      [customerId],
    );
    return result.rows;
  }

  listByPeriod(period: string): Invoice[] {
    const result = this.db.execute<Invoice>(
      `SELECT * FROM invoices WHERE period = ?`,
      [period],
    );
    return result.rows;
  }

  /** Dùng cho trang chủ — n hóa đơn tạo gần đây nhất, không phân biệt khách hàng/kỳ. */
  listRecent(limit: number): Invoice[] {
    const result = this.db.execute<Invoice>(
      `SELECT * FROM invoices ORDER BY createdAt DESC, id DESC LIMIT ?`,
      [limit],
    );
    return result.rows;
  }

  /** Dùng để sinh invoiceCode tuần tự (HD000001, HD000002, ...). */
  count(): number {
    const result = this.db.execute<{ total: number }>(
      `SELECT COUNT(*) as total FROM invoices`,
    );
    return result.rows[0]?.total ?? 0;
  }

  /** Gọi sau khi in (thành công hoặc thất bại) qua BluetoothPrinterService — không chung transaction với create(). */
  updatePrintStatus(
    id: number,
    status: PrintStatus,
    printedAt: string | null = null,
  ): void {
    this.db.execute(
      `UPDATE invoices SET printStatus = ?, printedAt = ? WHERE id = ?`,
      [status, printedAt, id],
    );
  }
}
