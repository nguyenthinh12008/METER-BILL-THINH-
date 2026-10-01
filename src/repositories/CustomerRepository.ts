import { getDatabase } from '../database/database';
import type { SqlDb } from '../database/types';
import type { Customer, NewCustomer } from '../models/Customer';

export type ImportDuplicateMode = 'skip' | 'update';

export class CustomerRepository {
  constructor(private readonly db: SqlDb = getDatabase()) {}

  create(input: NewCustomer): Customer {
    const now = new Date().toISOString();
    const result = this.db.execute(
      `INSERT INTO customers
         (customerCode, fullName, address, phone, meterCode, serviceType, readingBookCode, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.customerCode,
        input.fullName,
        input.address,
        input.phone,
        input.meterCode,
        input.serviceType,
        input.readingBookCode,
        now,
        now,
      ],
    );
    return this.findById(result.insertId as number) as Customer;
  }

  update(id: number, input: Partial<NewCustomer>): void {
    const current = this.findById(id);
    if (!current) {
      throw new Error(`Customer ${id} not found`);
    }
    const next = { ...current, ...input };
    this.db.execute(
      `UPDATE customers
       SET customerCode = ?, fullName = ?, address = ?, phone = ?, meterCode = ?, serviceType = ?, readingBookCode = ?, updatedAt = ?
       WHERE id = ?`,
      [
        next.customerCode,
        next.fullName,
        next.address,
        next.phone,
        next.meterCode,
        next.serviceType,
        next.readingBookCode,
        new Date().toISOString(),
        id,
      ],
    );
  }

  remove(id: number): void {
    this.db.execute(`DELETE FROM customers WHERE id = ?`, [id]);
  }

  findById(id: number): Customer | null {
    const result = this.db.execute<Customer>(
      `SELECT * FROM customers WHERE id = ?`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  findByCode(customerCode: string): Customer | null {
    const result = this.db.execute<Customer>(
      `SELECT * FROM customers WHERE customerCode = ?`,
      [customerCode],
    );
    return result.rows[0] ?? null;
  }

  existsByCode(customerCode: string): boolean {
    return this.findByCode(customerCode) !== null;
  }

  /** keyword là tiền tố (prefix) — giữ nguyên khả năng dùng index, không quét toàn bảng. */
  search(
    options: { keyword?: string; limit?: number; offset?: number } = {},
  ): Customer[] {
    const { keyword, limit = 50, offset = 0 } = options;
    if (keyword && keyword.trim().length > 0) {
      const prefix = `${keyword.trim()}%`;
      const result = this.db.execute<Customer>(
        `SELECT * FROM customers
         WHERE customerCode LIKE ? OR fullName LIKE ? OR meterCode LIKE ?
         ORDER BY fullName LIMIT ? OFFSET ?`,
        [prefix, prefix, prefix, limit, offset],
      );
      return result.rows;
    }
    const result = this.db.execute<Customer>(
      `SELECT * FROM customers ORDER BY fullName LIMIT ? OFFSET ?`,
      [limit, offset],
    );
    return result.rows;
  }

  /**
   * Dùng cho import Excel hàng loạt. Khi gặp customerCode đã tồn tại:
   * `onDuplicate: 'skip'` (mặc định) — bỏ qua, không ghi đè gì.
   * `onDuplicate: 'update'` — cập nhật, field nào trong `input` rỗng thì giữ
   * nguyên giá trị cũ (không xoá dữ liệu đã có chỉ vì file thiếu cột).
   * Lỗi từng dòng được bắt riêng để 1 dòng lỗi không phá cả batch.
   */
  createMany(
    inputs: NewCustomer[],
    options: { onDuplicate?: ImportDuplicateMode } = {},
  ): {
    created: Customer[];
    updated: Customer[];
    skippedDuplicateCodes: string[];
    errors: { customerCode: string; reason: string }[];
  } {
    const { onDuplicate = 'skip' } = options;
    return this.db.transaction(tx => {
      const created: Customer[] = [];
      const updated: Customer[] = [];
      const skippedDuplicateCodes: string[] = [];
      const errors: { customerCode: string; reason: string }[] = [];
      const now = new Date().toISOString();

      for (const input of inputs) {
        const existing = tx.execute<Customer>(
          `SELECT * FROM customers WHERE customerCode = ?`,
          [input.customerCode],
        ).rows[0];

        if (existing) {
          if (onDuplicate === 'skip') {
            skippedDuplicateCodes.push(input.customerCode);
            continue;
          }
          try {
            tx.execute(
              `UPDATE customers
               SET fullName = ?, address = ?, phone = ?, meterCode = ?, serviceType = ?, readingBookCode = ?, updatedAt = ?
               WHERE id = ?`,
              [
                input.fullName || existing.fullName,
                input.address || existing.address,
                input.phone || existing.phone,
                input.meterCode || existing.meterCode,
                input.serviceType,
                input.readingBookCode || existing.readingBookCode,
                now,
                existing.id,
              ],
            );
            const row = tx.execute<Customer>(
              `SELECT * FROM customers WHERE id = ?`,
              [existing.id],
            );
            updated.push(row.rows[0]);
          } catch (error) {
            errors.push({
              customerCode: input.customerCode,
              reason: String(error),
            });
          }
          continue;
        }

        try {
          const result = tx.execute(
            `INSERT INTO customers
               (customerCode, fullName, address, phone, meterCode, serviceType, readingBookCode, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              input.customerCode,
              input.fullName,
              input.address,
              input.phone,
              input.meterCode,
              input.serviceType,
              input.readingBookCode,
              now,
              now,
            ],
          );
          const row = tx.execute<Customer>(
            `SELECT * FROM customers WHERE id = ?`,
            [result.insertId as number],
          );
          created.push(row.rows[0]);
        } catch (error) {
          errors.push({
            customerCode: input.customerCode,
            reason: String(error),
          });
        }
      }

      return { created, updated, skippedDuplicateCodes, errors };
    });
  }

  count(options: { keyword?: string } = {}): number {
    const { keyword } = options;
    if (keyword && keyword.trim().length > 0) {
      const prefix = `${keyword.trim()}%`;
      const result = this.db.execute<{ total: number }>(
        `SELECT COUNT(*) as total FROM customers
         WHERE customerCode LIKE ? OR fullName LIKE ? OR meterCode LIKE ?`,
        [prefix, prefix, prefix],
      );
      return result.rows[0]?.total ?? 0;
    }
    const result = this.db.execute<{ total: number }>(
      `SELECT COUNT(*) as total FROM customers`,
    );
    return result.rows[0]?.total ?? 0;
  }
}
