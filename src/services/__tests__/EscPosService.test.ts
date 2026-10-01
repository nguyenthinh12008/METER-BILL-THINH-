import { buildInvoiceReceipt, buildImportedInvoiceReceipt } from '../EscPosService';
import { formatDateTime } from '../../utils/date';
import type { Invoice } from '../../models/Invoice';
import type { Customer } from '../../models/Customer';
import type { AppSettings } from '../../models/AppSetting';
import type { User } from '../../models/User';
import type { ImportedInvoiceRecord } from '../../models/ImportedInvoiceRecord';

const INIT_BYTES = [0x1b, 0x40];
const CUT_BYTES = [0x1d, 0x56, 0x00];

/** Giải mã byte ESC/POS về danh sách dòng text thuần (bỏ qua lệnh điều khiển) để assert dễ đọc. */
function decodeLines(bytes: Uint8Array): string[] {
  const lines: string[] = [];
  let current = '';
  let i = 0;
  while (i < bytes.length) {
    const byte = bytes[i];
    if (byte === 0x1b) {
      // ESC @ (2 byte) | ESC a n / ESC E n (3 byte)
      const next = bytes[i + 1];
      i += next === 0x40 ? 2 : 3;
      continue;
    }
    if (byte === 0x1d) {
      // GS V n (3 byte)
      i += 3;
      continue;
    }
    if (byte === 0x0a) {
      lines.push(current);
      current = '';
      i += 1;
      continue;
    }
    current += String.fromCharCode(byte);
    i += 1;
  }
  if (current.length > 0) {
    lines.push(current);
  }
  return lines;
}

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 1,
    invoiceCode: 'HD000001',
    customerId: 1,
    period: '08/2026',
    periodFrom: '2026-08-01',
    periodTo: '2026-08-31',
    oldReading: 210,
    newReading: 260,
    consumption: 50,
    subtotal: 226940,
    tax: 0,
    serviceFee: 5000,
    total: 231940,
    createdAt: '2026-08-22T00:00:00.000Z',
    printedAt: null,
    printStatus: 'NOT_PRINTED',
    collectedByUserId: 1,
    ...overrides,
  };
}

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 1,
    customerCode: 'C0009',
    fullName: 'Ngô Văn Long',
    address: '17 Đường Lý Thường Kiệt, Phường 1',
    phone: '0900000009',
    meterCode: 'DC0009',
    serviceType: 'ELECTRIC',
    readingBookCode: null,
    createdAt: '2026-08-22T00:00:00.000Z',
    updatedAt: '2026-08-22T00:00:00.000Z',
    ...overrides,
  };
}

function makeSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    companyName: 'Điện lực Phú Tân',
    hotline: '19001006',
    collectorName: '',
    collectorPhone: '',
    bankAccountNumber: '7508205146960',
    bankName: 'Agribank',
    ...overrides,
  };
}

function makeCollector(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    username: 'thu1',
    fullName: 'Nguyễn Việt Khải',
    phone: '0855333313',
    isActive: true,
    createdAt: '2026-08-22T00:00:00.000Z',
    ...overrides,
  };
}

function makeImportedRecord(
  overrides: Partial<ImportedInvoiceRecord> = {},
): ImportedInvoiceRecord {
  return {
    id: 1,
    customerId: 1,
    externalInvoiceId: '1000000001',
    invoiceType: 'TD',
    amount: 234567,
    importedAt: '2026-08-24T00:00:00.000Z',
    ...overrides,
  };
}

const PRINTED_AT = '2026-08-12T15:07:00.000Z';

describe('buildInvoiceReceipt', () => {
  it('bắt đầu bằng ESC @ (init) và kết thúc bằng GS V 0 (cắt giấy)', () => {
    const bytes = buildInvoiceReceipt(
      makeInvoice(),
      makeCustomer(),
      makeSettings(),
      makeCollector(),
      PRINTED_AT,
    );
    expect(Array.from(bytes.slice(0, 2))).toEqual(INIT_BYTES);
    expect(Array.from(bytes.slice(-3))).toEqual(CUT_BYTES);
  });

  it('in đúng nội dung, đã bỏ dấu tiếng Việt, đủ trường theo mapping ARCHITECTURE.md', () => {
    const bytes = buildInvoiceReceipt(
      makeInvoice(),
      makeCustomer(),
      makeSettings(),
      makeCollector(),
      PRINTED_AT,
    );
    const lines = decodeLines(bytes);

    expect(lines.slice(0, 19)).toEqual([
      'Dien luc Phu Tan',
      'Nguyen Viet Khai, TK 7508205146960 Agribank',
      'thu tien dien ngay 2026-08-01 den 2026-08-31',
      'THONG BAO TIEN DIEN',
      '',
      'Ma KH: C0009',
      'Ten KH: Ngo Van Long',
      'DT: 0900000009',
      'Dia chi: 17 Duong Ly Thuong Kiet, Phuong 1',
      '',
      'So tien: 226.940 d',
      'Phi dich vu: 5.000 d',
      `Thoi gian: ${formatDateTime(PRINTED_AT)}`,
      'Lien he: 19001006',
      '',
      'Cam on quy khach!',
      '------------------------------',
      'Nguoi thu: Nguyen Viet Khai thu them 5.000 d phi di thu',
      'So DT/Zalo: 0855333313',
    ]);
  });

  it('không in dòng "Nguoi thu..." khi serviceFee = 0, vẫn in dòng Phi dich vu', () => {
    const bytes = buildInvoiceReceipt(
      makeInvoice({ serviceFee: 0 }),
      makeCustomer(),
      makeSettings(),
      makeCollector(),
      PRINTED_AT,
    );
    const lines = decodeLines(bytes);

    expect(lines).toContain('Phi dich vu: 0 d');
    expect(lines.some(line => line.startsWith('Nguoi thu:'))).toBe(false);
  });

  it('dùng nhãn "TIEN NUOC" cho khách hàng dịch vụ nước', () => {
    const bytes = buildInvoiceReceipt(
      makeInvoice(),
      makeCustomer({ serviceType: 'WATER' }),
      makeSettings(),
      makeCollector(),
      PRINTED_AT,
    );
    const lines = decodeLines(bytes);

    expect(lines).toContain('THONG BAO TIEN NUOC');
    expect(lines.some(line => line.startsWith('thu tien nuoc ngay'))).toBe(true);
  });

  it('bỏ qua các dòng tuỳ chọn khi field tương ứng rỗng', () => {
    const bytes = buildInvoiceReceipt(
      makeInvoice(),
      makeCustomer({ phone: '', address: '' }),
      makeSettings({ companyName: '', hotline: '' }),
      makeCollector(),
      PRINTED_AT,
    );
    const lines = decodeLines(bytes);

    expect(lines.some(line => line.startsWith('DT:'))).toBe(false);
    expect(lines.some(line => line.startsWith('Dia chi:'))).toBe(false);
    expect(lines.some(line => line.startsWith('Lien he:'))).toBe(false);
    expect(lines).toContain('Ma KH: C0009');
  });

  it('collector = null (hóa đơn cũ trước khi có đăng nhập) → bỏ dòng người thu, không lỗi', () => {
    const bytes = buildInvoiceReceipt(
      makeInvoice(),
      makeCustomer(),
      makeSettings(),
      null,
      PRINTED_AT,
    );
    const lines = decodeLines(bytes);

    expect(lines.some(line => line.startsWith('Nguoi thu:'))).toBe(false);
    expect(lines.some(line => line.startsWith('So DT/Zalo:'))).toBe(false);
    expect(lines).toContain('Ma KH: C0009');
  });
});

describe('buildImportedInvoiceReceipt', () => {
  it('bắt đầu bằng ESC @ (init) và kết thúc bằng GS V 0 (cắt giấy)', () => {
    const bytes = buildImportedInvoiceReceipt(
      makeImportedRecord(),
      makeCustomer(),
      makeSettings(),
      makeCollector(),
      PRINTED_AT,
    );
    expect(Array.from(bytes.slice(0, 2))).toEqual(INIT_BYTES);
    expect(Array.from(bytes.slice(-3))).toEqual(CUT_BYTES);
  });

  it('in đúng nội dung — dùng Mã hóa đơn/Loại/Số tiền ngoại nhập, không có dòng chỉ số/kỳ thu', () => {
    const bytes = buildImportedInvoiceReceipt(
      makeImportedRecord(),
      makeCustomer(),
      makeSettings(),
      makeCollector(),
      PRINTED_AT,
    );
    const lines = decodeLines(bytes);

    expect(lines.slice(0, 16)).toEqual([
      'Dien luc Phu Tan',
      'Nguyen Viet Khai, TK 7508205146960 Agribank',
      'THONG BAO TIEN DIEN',
      '',
      'Ma KH: C0009',
      'Ten KH: Ngo Van Long',
      'DT: 0900000009',
      'Dia chi: 17 Duong Ly Thuong Kiet, Phuong 1',
      '',
      'Ma hoa don: 1000000001',
      'Loai: TD',
      'So tien: 234.567 d',
      `Thoi gian: ${formatDateTime(PRINTED_AT)}`,
      'Lien he: 19001006',
      '',
      'Cam on quy khach!',
    ]);
    expect(lines).toContain('Nguoi thu: Nguyen Viet Khai');
    expect(lines).toContain('So DT/Zalo: 0855333313');
    expect(lines.some(line => line.startsWith('thu tien'))).toBe(false);
  });

  it('bỏ dòng "Loai" khi invoiceType null', () => {
    const bytes = buildImportedInvoiceReceipt(
      makeImportedRecord({ invoiceType: null }),
      makeCustomer(),
      makeSettings(),
      makeCollector(),
      PRINTED_AT,
    );
    const lines = decodeLines(bytes);

    expect(lines.some(line => line.startsWith('Loai:'))).toBe(false);
    expect(lines).toContain('Ma hoa don: 1000000001');
  });

  it('collector = null → bỏ dòng người thu, không lỗi', () => {
    const bytes = buildImportedInvoiceReceipt(
      makeImportedRecord(),
      makeCustomer(),
      makeSettings(),
      null,
      PRINTED_AT,
    );
    const lines = decodeLines(bytes);

    expect(lines.some(line => line.startsWith('Nguoi thu:'))).toBe(false);
    expect(lines.some(line => line.startsWith('So DT/Zalo:'))).toBe(false);
    expect(lines).toContain('So tien: 234.567 d');
  });

  it('bỏ qua DT/Địa chỉ khi khách hàng không có dữ liệu', () => {
    const bytes = buildImportedInvoiceReceipt(
      makeImportedRecord(),
      makeCustomer({ phone: '', address: '' }),
      makeSettings(),
      makeCollector(),
      PRINTED_AT,
    );
    const lines = decodeLines(bytes);

    expect(lines.some(line => line.startsWith('DT:'))).toBe(false);
    expect(lines.some(line => line.startsWith('Dia chi:'))).toBe(false);
  });
});
