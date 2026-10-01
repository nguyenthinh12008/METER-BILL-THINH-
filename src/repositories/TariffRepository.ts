import { getDatabase } from '../database/database';
import type { SqlDb } from '../database/types';
import type { NewTariffTier, TariffTier } from '../models/Tariff';

export class TariffRepository {
  constructor(private readonly db: SqlDb = getDatabase()) {}

  listByServiceType(serviceType: string): TariffTier[] {
    const result = this.db.execute<TariffTier>(
      `SELECT * FROM tariffs WHERE serviceType = ? ORDER BY fromValue ASC`,
      [serviceType],
    );
    return result.rows;
  }

  create(input: NewTariffTier): TariffTier {
    const result = this.db.execute(
      `INSERT INTO tariffs (serviceType, fromValue, toValue, price) VALUES (?, ?, ?, ?)`,
      [input.serviceType, input.fromValue, input.toValue, input.price],
    );
    const row = this.db.execute<TariffTier>(
      `SELECT * FROM tariffs WHERE id = ?`,
      [result.insertId as number],
    );
    return row.rows[0];
  }

  update(id: number, input: Partial<NewTariffTier>): void {
    const current = this.db.execute<TariffTier>(
      `SELECT * FROM tariffs WHERE id = ?`,
      [id],
    ).rows[0];
    if (!current) {
      throw new Error(`Tariff ${id} not found`);
    }
    const next = { ...current, ...input };
    this.db.execute(
      `UPDATE tariffs SET serviceType = ?, fromValue = ?, toValue = ?, price = ? WHERE id = ?`,
      [next.serviceType, next.fromValue, next.toValue, next.price, id],
    );
  }

  remove(id: number): void {
    this.db.execute(`DELETE FROM tariffs WHERE id = ?`, [id]);
  }

  /** Xoá toàn bộ bậc thang cũ của serviceType và thay bằng danh sách mới, trong 1 transaction. */
  replaceForServiceType(serviceType: string, tiers: NewTariffTier[]): void {
    this.db.transaction(tx => {
      tx.execute(`DELETE FROM tariffs WHERE serviceType = ?`, [serviceType]);
      for (const tier of tiers) {
        tx.execute(
          `INSERT INTO tariffs (serviceType, fromValue, toValue, price) VALUES (?, ?, ?, ?)`,
          [tier.serviceType, tier.fromValue, tier.toValue, tier.price],
        );
      }
    });
  }
}
