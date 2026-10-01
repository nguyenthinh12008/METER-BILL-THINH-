import { getDatabase } from '../database/database';
import type { SqlDb } from '../database/types';
import type { AppSettingKey, AppSettings } from '../models/AppSetting';

const DEFAULT_SETTINGS: AppSettings = {
  companyName: '',
  hotline: '',
  collectorName: '',
  collectorPhone: '',
  bankAccountNumber: '',
  bankName: '',
};

export class SettingsRepository {
  constructor(private readonly db: SqlDb = getDatabase()) {}

  get(key: AppSettingKey): string | null {
    const result = this.db.execute<{ value: string }>(
      `SELECT value FROM app_settings WHERE key = ?`,
      [key],
    );
    return result.rows[0]?.value ?? null;
  }

  /** Trả về đủ 6 key kể cả khi chưa được seed/set — dùng an toàn ngay trong EscPosService. */
  getAll(): AppSettings {
    const result = this.db.execute<{ key: AppSettingKey; value: string }>(
      `SELECT key, value FROM app_settings`,
    );
    const settings = { ...DEFAULT_SETTINGS };
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }
    return settings;
  }

  set(key: AppSettingKey, value: string): void {
    this.db.execute(
      `INSERT INTO app_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value],
    );
  }

  setMany(entries: Partial<AppSettings>): void {
    this.db.transaction(tx => {
      for (const [key, value] of Object.entries(entries)) {
        tx.execute(
          `INSERT INTO app_settings (key, value) VALUES (?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
          [key, value as string],
        );
      }
    });
  }
}
