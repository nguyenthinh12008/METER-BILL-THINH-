import { getDatabase } from '../database/database';
import type { SqlDb } from '../database/types';
import type { MeterReading, NewMeterReading } from '../models/MeterReading';

export class MeterRepository {
  constructor(private readonly db: SqlDb = getDatabase()) {}

  /** DB có UNIQUE(customerId, period) — insert trùng kỳ sẽ ném lỗi constraint. */
  create(input: NewMeterReading): MeterReading {
    const consumption = input.newReading - input.oldReading;
    const now = new Date().toISOString();
    const result = this.db.execute(
      `INSERT INTO meter_readings
         (customerId, period, oldReading, newReading, consumption, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        input.customerId,
        input.period,
        input.oldReading,
        input.newReading,
        consumption,
        now,
      ],
    );
    return this.findById(result.insertId as number) as MeterReading;
  }

  findById(id: number): MeterReading | null {
    const result = this.db.execute<MeterReading>(
      `SELECT * FROM meter_readings WHERE id = ?`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  findByCustomerAndPeriod(
    customerId: number,
    period: string,
  ): MeterReading | null {
    const result = this.db.execute<MeterReading>(
      `SELECT * FROM meter_readings WHERE customerId = ? AND period = ?`,
      [customerId, period],
    );
    return result.rows[0] ?? null;
  }

  /** Dùng để gợi ý sẵn oldReading cho lần nhập chỉ số tiếp theo. */
  findLatestByCustomer(customerId: number): MeterReading | null {
    const result = this.db.execute<MeterReading>(
      `SELECT * FROM meter_readings
       WHERE customerId = ? ORDER BY period DESC, id DESC LIMIT 1`,
      [customerId],
    );
    return result.rows[0] ?? null;
  }

  listByCustomer(customerId: number): MeterReading[] {
    const result = this.db.execute<MeterReading>(
      `SELECT * FROM meter_readings WHERE customerId = ? ORDER BY period DESC`,
      [customerId],
    );
    return result.rows;
  }

  listByPeriod(
    period: string,
    options: { limit?: number; offset?: number } = {},
  ): MeterReading[] {
    const { limit = 50, offset = 0 } = options;
    const result = this.db.execute<MeterReading>(
      `SELECT * FROM meter_readings WHERE period = ? LIMIT ? OFFSET ?`,
      [period, limit, offset],
    );
    return result.rows;
  }
}
