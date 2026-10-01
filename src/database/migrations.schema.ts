export interface Migration {
  version: number;
  name: string;
  statements: string[];
}

// Chỉ chứa SQL thuần, không import thư viện SQLite nào — để test được bằng
// Jest/Node (qua better-sqlite3 trong devDependency) mà không cần native module.
export const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    statements: [
      `CREATE TABLE customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customerCode TEXT NOT NULL UNIQUE,
        fullName TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        meterCode TEXT,
        serviceType TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )`,
      `CREATE INDEX idx_customers_customerCode ON customers(customerCode)`,
      `CREATE INDEX idx_customers_fullName ON customers(fullName)`,
      `CREATE INDEX idx_customers_meterCode ON customers(meterCode)`,

      `CREATE TABLE meter_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customerId INTEGER NOT NULL REFERENCES customers(id),
        period TEXT NOT NULL,
        oldReading REAL NOT NULL,
        newReading REAL NOT NULL,
        consumption REAL NOT NULL,
        createdAt TEXT NOT NULL,
        UNIQUE(customerId, period)
      )`,
      `CREATE INDEX idx_meter_readings_period ON meter_readings(period)`,

      `CREATE TABLE invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoiceCode TEXT NOT NULL UNIQUE,
        customerId INTEGER NOT NULL REFERENCES customers(id),
        period TEXT NOT NULL,
        periodFrom TEXT,
        periodTo TEXT,
        oldReading REAL NOT NULL,
        newReading REAL NOT NULL,
        consumption REAL NOT NULL,
        subtotal REAL NOT NULL,
        tax REAL NOT NULL DEFAULT 0,
        serviceFee REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL,
        createdAt TEXT NOT NULL,
        printedAt TEXT,
        printStatus TEXT NOT NULL DEFAULT 'NOT_PRINTED'
      )`,
      `CREATE INDEX idx_invoices_invoiceCode ON invoices(invoiceCode)`,
      `CREATE INDEX idx_invoices_period ON invoices(period)`,

      `CREATE TABLE tariffs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        serviceType TEXT NOT NULL,
        fromValue REAL NOT NULL,
        toValue REAL,
        price REAL NOT NULL
      )`,

      // Cấu hình đơn vị điện lực / nhân viên thu tiền in trên mọi hóa đơn
      // (companyName, hotline, collectorName, collectorPhone, bankAccountNumber,
      // bankName) — key-value, chỉnh qua SettingsRepository. Xem mapping in hóa
      // đơn trong ARCHITECTURE.md.
      `CREATE TABLE app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL DEFAULT ''
      )`,
    ],
  },
  {
    // Đăng nhập nhiều tài khoản — gắn mỗi hóa đơn với nhân viên đã thu tiền
    // (thay vì 1 tên cố định trong app_settings). collectedByUserId nullable
    // vì hóa đơn tạo trước migration này không có giá trị.
    version: 2,
    name: 'users_and_invoice_collector',
    statements: [
      `CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        fullName TEXT NOT NULL,
        phone TEXT,
        passwordHash TEXT NOT NULL,
        passwordSalt TEXT NOT NULL,
        isActive INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL
      )`,
      `CREATE INDEX idx_users_username ON users(username)`,
      `ALTER TABLE invoices ADD COLUMN collectedByUserId INTEGER REFERENCES users(id)`,
    ],
  },
  {
    // Tương thích với file dữ liệu khách hàng thực tế của điện lực (Mã Sổ
    // GCS / Mã Khang / Tên Khang / ID Hóa đơn / Loại Hóa đơn / Số tiền).
    // readingBookCode = "Mã Sổ GCS" (sổ ghi chỉ số/tuyến thu). Bảng
    // imported_invoice_records lưu lịch sử hóa đơn ngoại nhập — tách khỏi
    // bảng invoices vì invoices bắt buộc oldReading/newReading/consumption
    // (tính từ luồng Nhập chỉ số của app), còn dữ liệu ngoại nhập chỉ có
    // tổng tiền + mã hóa đơn gốc, không có chỉ số công tơ.
    version: 3,
    name: 'reading_book_code_and_imported_invoices',
    statements: [
      `ALTER TABLE customers ADD COLUMN readingBookCode TEXT`,
      `CREATE TABLE imported_invoice_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customerId INTEGER NOT NULL REFERENCES customers(id),
        externalInvoiceId TEXT NOT NULL,
        invoiceType TEXT,
        amount REAL NOT NULL,
        importedAt TEXT NOT NULL
      )`,
      `CREATE INDEX idx_imported_invoice_records_customerId ON imported_invoice_records(customerId)`,
      `CREATE INDEX idx_imported_invoice_records_externalInvoiceId ON imported_invoice_records(externalInvoiceId)`,
    ],
  },
];
