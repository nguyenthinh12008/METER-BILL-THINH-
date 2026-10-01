import type { Invoice } from '../models/Invoice';
import type { Customer } from '../models/Customer';
import type { AppSettings } from '../models/AppSetting';
import type { User } from '../models/User';
import type { ImportedInvoiceRecord } from '../models/ImportedInvoiceRecord';
import { formatCurrency } from '../utils/currency';
import { formatDateTime } from '../utils/date';
import { stripDiacritics } from '../utils/vietnameseText';

const ESC = 0x1b;
const GS = 0x1d;

const CMD = {
  INIT: [ESC, 0x40],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  CUT: [GS, 0x56, 0x00],
} as const;

const QUESTION_MARK = 0x3f;

class ReceiptBuilder {
  private bytes: number[] = [];

  raw(command: readonly number[]): this {
    this.bytes.push(...command);
    return this;
  }

  /** Bỏ dấu tiếng Việt rồi encode ASCII — xem lý do ở utils/vietnameseText.ts. */
  text(value: string): this {
    const ascii = stripDiacritics(value);
    for (let i = 0; i < ascii.length; i += 1) {
      const code = ascii.charCodeAt(i);
      this.bytes.push(code >= 0x20 && code <= 0x7e ? code : QUESTION_MARK);
    }
    return this;
  }

  newline(count = 1): this {
    for (let i = 0; i < count; i += 1) {
      this.bytes.push(0x0a);
    }
    return this;
  }

  line(value = ''): this {
    return this.text(value).newline();
  }

  build(): Uint8Array {
    return Uint8Array.from(this.bytes);
  }
}

function serviceLabel(customer: Customer): { action: string; title: string; unit: string } {
  if (customer.serviceType === 'WATER') {
    return { action: 'nuoc', title: 'TIEN NUOC', unit: 'm3' };
  }
  return { action: 'dien', title: 'TIEN DIEN', unit: 'kWh' };
}

/**
 * Build byte ESC/POS cho 1 hóa đơn — thuần TypeScript, không phụ thuộc
 * Bluetooth/native module, test được đầy đủ bằng Jest. Nội dung/thứ tự dòng in
 * theo đúng mapping đã chốt ở ARCHITECTURE.md ("Nội dung in hóa đơn").
 *
 * `printedAt` được truyền vào (không đọc `invoice.printedAt`) vì tại thời điểm
 * build receipt, hóa đơn chưa in xong nên cột đó trong DB vẫn còn null.
 *
 * `collector`: nhân viên đã thu tiền (tra theo `invoice.collectedByUserId`,
 * xem AuthService/UserRepository) — thay cho `app_settings.collectorName`/
 * `collectorPhone` tĩnh trước khi có đăng nhập nhiều tài khoản. `null` với hóa
 * đơn tạo trước khi có tính năng này — bỏ các dòng liên quan, không lỗi.
 */
export function buildInvoiceReceipt(
  invoice: Invoice,
  customer: Customer,
  settings: AppSettings,
  collector: User | null,
  printedAt: string,
): Uint8Array {
  const { action, title } = serviceLabel(customer);
  const builder = new ReceiptBuilder();

  builder.raw(CMD.INIT).raw(CMD.ALIGN_CENTER);

  if (settings.companyName) {
    builder.raw(CMD.BOLD_ON).line(settings.companyName).raw(CMD.BOLD_OFF);
  }

  if (collector) {
    const bankPart = [settings.bankAccountNumber, settings.bankName]
      .filter(part => part.length > 0)
      .join(' ');
    const collectorLine = [collector.fullName, bankPart ? `TK ${bankPart}` : '']
      .filter(part => part.length > 0)
      .join(', ');
    builder.line(collectorLine);
  }

  builder.raw(CMD.ALIGN_LEFT);
  builder.line(`thu tien ${action} ngay ${invoice.periodFrom ?? ''} den ${invoice.periodTo ?? ''}`);

  builder.raw(CMD.ALIGN_CENTER).raw(CMD.BOLD_ON).line(`THONG BAO ${title}`).raw(CMD.BOLD_OFF);
  builder.raw(CMD.ALIGN_LEFT).newline();

  builder.line(`Ma KH: ${customer.customerCode}`);
  builder.line(`Ten KH: ${customer.fullName}`);
  if (customer.phone) {
    builder.line(`DT: ${customer.phone}`);
  }
  if (customer.address) {
    builder.line(`Dia chi: ${customer.address}`);
  }
  builder.newline();

  builder.line(`So tien: ${formatCurrency(invoice.subtotal + invoice.tax)}`);
  builder.line(`Phi dich vu: ${formatCurrency(invoice.serviceFee)}`);
  builder.line(`Thoi gian: ${formatDateTime(printedAt)}`);
  if (settings.hotline) {
    builder.line(`Lien he: ${settings.hotline}`);
  }
  builder.newline();

  builder.raw(CMD.ALIGN_CENTER).line('Cam on quy khach!').raw(CMD.ALIGN_LEFT);
  builder.line('------------------------------');

  if (invoice.serviceFee > 0 && collector) {
    builder.line(
      `Nguoi thu: ${collector.fullName} thu them ${formatCurrency(invoice.serviceFee)} phi di thu`,
    );
  }
  if (collector?.phone) {
    builder.line(`So DT/Zalo: ${collector.phone}`);
  }

  builder.newline(3).raw(CMD.CUT);

  return builder.build();
}

/**
 * Build byte ESC/POS cho 1 hóa đơn **ngoại nhập** (`ImportedInvoiceRecord` —
 * lịch sử hóa đơn từ file export điện lực, chỉ có tổng tiền có sẵn, không có
 * chỉ số công tơ/kỳ thu). Cố tình KHÔNG dùng chung `buildInvoiceReceipt()` vì
 * ép dữ liệu ngoại nhập vào khung `Invoice` sẽ phải bịa oldReading/newReading/
 * period — hóa đơn in ra sẽ sai/gây hiểu lầm. Dùng chung `ReceiptBuilder`/
 * `CMD`/`serviceLabel()` với `buildInvoiceReceipt()` để giữ đồng nhất khung
 * công ty/khách hàng/người thu.
 */
export function buildImportedInvoiceReceipt(
  record: ImportedInvoiceRecord,
  customer: Customer,
  settings: AppSettings,
  collector: User | null,
  printedAt: string,
): Uint8Array {
  const { title } = serviceLabel(customer);
  const builder = new ReceiptBuilder();

  builder.raw(CMD.INIT).raw(CMD.ALIGN_CENTER);

  if (settings.companyName) {
    builder.raw(CMD.BOLD_ON).line(settings.companyName).raw(CMD.BOLD_OFF);
  }

  if (collector) {
    const bankPart = [settings.bankAccountNumber, settings.bankName]
      .filter(part => part.length > 0)
      .join(' ');
    const collectorLine = [collector.fullName, bankPart ? `TK ${bankPart}` : '']
      .filter(part => part.length > 0)
      .join(', ');
    builder.line(collectorLine);
  }

  builder.raw(CMD.ALIGN_CENTER).raw(CMD.BOLD_ON).line(`THONG BAO ${title}`).raw(CMD.BOLD_OFF);
  builder.raw(CMD.ALIGN_LEFT).newline();

  builder.line(`Ma KH: ${customer.customerCode}`);
  builder.line(`Ten KH: ${customer.fullName}`);
  if (customer.phone) {
    builder.line(`DT: ${customer.phone}`);
  }
  if (customer.address) {
    builder.line(`Dia chi: ${customer.address}`);
  }
  builder.newline();

  builder.line(`Ma hoa don: ${record.externalInvoiceId}`);
  if (record.invoiceType) {
    builder.line(`Loai: ${record.invoiceType}`);
  }
  builder.line(`So tien: ${formatCurrency(record.amount)}`);
  builder.line(`Thoi gian: ${formatDateTime(printedAt)}`);
  if (settings.hotline) {
    builder.line(`Lien he: ${settings.hotline}`);
  }
  builder.newline();

  builder.raw(CMD.ALIGN_CENTER).line('Cam on quy khach!').raw(CMD.ALIGN_LEFT);
  builder.line('------------------------------');

  if (collector) {
    builder.line(`Nguoi thu: ${collector.fullName}`);
  }
  if (collector?.phone) {
    builder.line(`So DT/Zalo: ${collector.phone}`);
  }

  builder.newline(3).raw(CMD.CUT);

  return builder.build();
}
