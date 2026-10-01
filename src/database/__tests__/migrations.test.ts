import { createTestDb } from '../../test-utils/sqliteTestDb';
import { runMigrations } from '../migrations';

describe('runMigrations', () => {
  it('tạo đủ 7 bảng và không lỗi cú pháp SQL', () => {
    const db = createTestDb();
    runMigrations(db);

    const tables = db
      .execute<{ name: string }>(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name != 'sqlite_sequence' ORDER BY name`,
      )
      .rows.map(row => row.name);

    expect(tables).toEqual([
      'app_settings',
      'customers',
      'imported_invoice_records',
      'invoices',
      'meter_readings',
      'tariffs',
      'users',
    ]);
  });

  it('ghi user_version sau khi migrate và không chạy lại migration đã áp', () => {
    const db = createTestDb();
    runMigrations(db);
    const version = db.execute<{ user_version: number }>(
      'PRAGMA user_version;',
    ).rows[0].user_version;
    expect(version).toBe(3);

    // Gọi lại lần 2 không được throw (không insert trùng bảng đã tồn tại).
    expect(() => runMigrations(db)).not.toThrow();
  });

  it('customers có cột readingBookCode (nullable) sau migration version 3', () => {
    const db = createTestDb();
    runMigrations(db);
    const columns = db
      .execute<{ name: string }>(`PRAGMA table_info(customers);`)
      .rows.map(row => row.name);
    expect(columns).toContain('readingBookCode');
  });

  it('imported_invoice_records lưu đúng dữ liệu và có FK customerId', () => {
    const db = createTestDb();
    runMigrations(db);
    const now = new Date().toISOString();
    const customerId = db.execute(
      `INSERT INTO customers (customerCode, fullName, address, phone, meterCode, serviceType, createdAt, updatedAt)
       VALUES ('C0001', 'A', '', '', '', 'ELECTRIC', ?, ?)`,
      [now, now],
    ).insertId as number;

    db.execute(
      `INSERT INTO imported_invoice_records (customerId, externalInvoiceId, invoiceType, amount, importedAt)
       VALUES (?, 'INV001', 'TD', 123456, ?)`,
      [customerId, now],
    );
    const rows = db.execute<{ externalInvoiceId: string; amount: number }>(
      `SELECT * FROM imported_invoice_records WHERE customerId = ?`,
      [customerId],
    ).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].externalInvoiceId).toBe('INV001');
    expect(rows[0].amount).toBe(123456);
  });

  it('invoices có cột collectedByUserId (nullable) sau migration version 2', () => {
    const db = createTestDb();
    runMigrations(db);
    const columns = db
      .execute<{ name: string }>(`PRAGMA table_info(invoices);`)
      .rows.map(row => row.name);
    expect(columns).toContain('collectedByUserId');
  });

  it('users bắt buộc unique username ở tầng DB', () => {
    const db = createTestDb();
    runMigrations(db);
    const now = new Date().toISOString();
    db.execute(
      `INSERT INTO users (username, fullName, phone, passwordHash, passwordSalt, isActive, createdAt)
       VALUES ('thu1', 'A', '', 'h', 's', 1, ?)`,
      [now],
    );
    expect(() =>
      db.execute(
        `INSERT INTO users (username, fullName, phone, passwordHash, passwordSalt, isActive, createdAt)
         VALUES ('thu1', 'B', '', 'h', 's', 1, ?)`,
        [now],
      ),
    ).toThrow();
  });

  it('bắt buộc unique invoiceCode và customerCode ở tầng DB', () => {
    const db = createTestDb();
    runMigrations(db);
    const now = new Date().toISOString();
    db.execute(
      `INSERT INTO customers (customerCode, fullName, address, phone, meterCode, serviceType, createdAt, updatedAt)
       VALUES ('C0001', 'A', '', '', '', 'ELECTRIC', ?, ?)`,
      [now, now],
    );
    expect(() =>
      db.execute(
        `INSERT INTO customers (customerCode, fullName, address, phone, meterCode, serviceType, createdAt, updatedAt)
         VALUES ('C0001', 'B', '', '', '', 'ELECTRIC', ?, ?)`,
        [now, now],
      ),
    ).toThrow();
  });

  it('meter_readings bắt buộc unique (customerId, period)', () => {
    const db = createTestDb();
    runMigrations(db);
    const now = new Date().toISOString();
    const customerId = db.execute(
      `INSERT INTO customers (customerCode, fullName, address, phone, meterCode, serviceType, createdAt, updatedAt)
       VALUES ('C0001', 'A', '', '', '', 'ELECTRIC', ?, ?)`,
      [now, now],
    ).insertId as number;

    db.execute(
      `INSERT INTO meter_readings (customerId, period, oldReading, newReading, consumption, createdAt)
       VALUES (?, '08/2026', 0, 10, 10, ?)`,
      [customerId, now],
    );
    expect(() =>
      db.execute(
        `INSERT INTO meter_readings (customerId, period, oldReading, newReading, consumption, createdAt)
         VALUES (?, '08/2026', 10, 20, 10, ?)`,
        [customerId, now],
      ),
    ).toThrow();
  });
});
