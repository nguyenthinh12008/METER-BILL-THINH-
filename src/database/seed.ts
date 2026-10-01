import type { SqlDb } from './types';

// Toàn bộ dữ liệu bên dưới là hư cấu, chỉ dùng để test thủ công trên emulator —
// không dựa trên khách hàng/nhân viên thật nào.
const FICTIONAL_CUSTOMERS = [
  {
    customerCode: 'C0001',
    fullName: 'Nguyễn Văn An',
    address: '12 Đường Hoa Mai, Phường 1',
    phone: '0900000001',
    meterCode: 'DC0001',
    serviceType: 'ELECTRIC',
  },
  {
    customerCode: 'C0002',
    fullName: 'Trần Thị Bình',
    address: '45 Đường Lê Lợi, Phường 2',
    phone: '0900000002',
    meterCode: 'DC0002',
    serviceType: 'ELECTRIC',
  },
  {
    customerCode: 'C0003',
    fullName: 'Lê Văn Cường',
    address: '78 Đường Trần Hưng Đạo, Phường 3',
    phone: '0900000003',
    meterCode: 'DC0003',
    serviceType: 'ELECTRIC',
  },
  {
    customerCode: 'C0004',
    fullName: 'Phạm Thị Dung',
    address: '9 Đường Nguyễn Huệ, Phường 1',
    phone: '0900000004',
    meterCode: 'DC0004',
    serviceType: 'WATER',
  },
  {
    customerCode: 'C0005',
    fullName: 'Hoàng Văn Em',
    address: '33 Đường Phan Đình Phùng, Phường 4',
    phone: '0900000005',
    meterCode: 'DC0005',
    serviceType: 'ELECTRIC',
  },
  {
    customerCode: 'C0006',
    fullName: 'Vũ Thị Giang',
    address: '21 Đường Cách Mạng Tháng 8, Phường 2',
    phone: '0900000006',
    meterCode: 'DC0006',
    serviceType: 'ELECTRIC',
  },
  {
    customerCode: 'C0007',
    fullName: 'Đặng Văn Hùng',
    address: '5 Đường Nguyễn Trãi, Phường 5',
    phone: '0900000007',
    meterCode: 'DC0007',
    serviceType: 'WATER',
  },
  {
    customerCode: 'C0008',
    fullName: 'Bùi Thị Kim',
    address: '60 Đường Điện Biên Phủ, Phường 3',
    phone: '0900000008',
    meterCode: 'DC0008',
    serviceType: 'ELECTRIC',
  },
  {
    customerCode: 'C0009',
    fullName: 'Ngô Văn Long',
    address: '17 Đường Lý Thường Kiệt, Phường 1',
    phone: '0900000009',
    meterCode: 'DC0009',
    serviceType: 'ELECTRIC',
  },
  {
    customerCode: 'C0010',
    fullName: 'Đỗ Thị Minh',
    address: '88 Đường Hùng Vương, Phường 4',
    phone: '0900000010',
    meterCode: 'DC0010',
    serviceType: 'ELECTRIC',
  },
] as const;

const FICTIONAL_METER_READINGS = [
  { customerCode: 'C0001', period: '07/2026', oldReading: 100, newReading: 150 },
  { customerCode: 'C0001', period: '08/2026', oldReading: 150, newReading: 210 },
  { customerCode: 'C0002', period: '08/2026', oldReading: 80, newReading: 120 },
] as const;

// Bậc thang giá minh họa để test tính toán/in thử — KHÔNG phải biểu giá điện
// chính thức của bất kỳ đơn vị nào.
const SAMPLE_ELECTRIC_TARIFF = [
  { fromValue: 0, toValue: 50, price: 1806 },
  { fromValue: 50, toValue: 100, price: 1866 },
  { fromValue: 100, toValue: 200, price: 2167 },
  { fromValue: 200, toValue: 300, price: 2729 },
  { fromValue: 300, toValue: 400, price: 3050 },
  { fromValue: 400, toValue: null, price: 3151 },
] as const;

const DEFAULT_APP_SETTINGS: Record<string, string> = {
  companyName: '',
  hotline: '',
  collectorName: '',
  collectorPhone: '',
  bankAccountNumber: '',
  bankName: '',
};

/** Chỉ chạy khi bảng customers rỗng — an toàn để gọi nhiều lần. */
export function seedDatabase(db: SqlDb): void {
  const countResult = db.execute<{ total: number }>(
    'SELECT COUNT(*) as total FROM customers',
  );
  if ((countResult.rows[0]?.total ?? 0) > 0) {
    return;
  }

  db.transaction(tx => {
    const now = new Date().toISOString();

    for (const customer of FICTIONAL_CUSTOMERS) {
      tx.execute(
        `INSERT INTO customers
           (customerCode, fullName, address, phone, meterCode, serviceType, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customer.customerCode,
          customer.fullName,
          customer.address,
          customer.phone,
          customer.meterCode,
          customer.serviceType,
          now,
          now,
        ],
      );
    }

    for (const reading of FICTIONAL_METER_READINGS) {
      const customerRow = tx.execute<{ id: number }>(
        'SELECT id FROM customers WHERE customerCode = ?',
        [reading.customerCode],
      );
      const customerId = customerRow.rows[0]?.id;
      if (customerId == null) {
        continue;
      }
      tx.execute(
        `INSERT INTO meter_readings
           (customerId, period, oldReading, newReading, consumption, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          customerId,
          reading.period,
          reading.oldReading,
          reading.newReading,
          reading.newReading - reading.oldReading,
          now,
        ],
      );
    }

    for (const tier of SAMPLE_ELECTRIC_TARIFF) {
      tx.execute(
        `INSERT INTO tariffs (serviceType, fromValue, toValue, price) VALUES (?, ?, ?, ?)`,
        ['ELECTRIC', tier.fromValue, tier.toValue, tier.price],
      );
    }

    for (const [key, value] of Object.entries(DEFAULT_APP_SETTINGS)) {
      tx.execute(`INSERT INTO app_settings (key, value) VALUES (?, ?)`, [
        key,
        value,
      ]);
    }
  });
}
