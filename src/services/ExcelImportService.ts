import {
  CustomerRepository,
  type ImportDuplicateMode,
} from '../repositories/CustomerRepository';
import { ImportedInvoiceRecordRepository } from '../repositories/ImportedInvoiceRecordRepository';
import type { NewCustomer, ServiceType } from '../models/Customer';

type CustomerField = keyof NewCustomer;
type ExternalInvoiceField = 'externalInvoiceId' | 'invoiceType' | 'amount';

/** Header tiếng Việt cố định — so khớp case/khoảng trắng-insensitive, không fuzzy match. */
const HEADER_MAP: Record<string, CustomerField> = {
  'mã khách hàng': 'customerCode',
  'mã khang': 'customerCode',
  'mã kh': 'customerCode',
  'họ tên': 'fullName',
  'tên khách hàng': 'fullName',
  'tên khang': 'fullName',
  'tên kh': 'fullName',
  'địa chỉ': 'address',
  'số điện thoại': 'phone',
  'mã đồng hồ': 'meterCode',
  'loại dịch vụ': 'serviceType',
  /** "Mã Sổ GCS" — mã sổ ghi chỉ số/tuyến thu, thấy ở file export điện lực. */
  'mã sổ gcs': 'readingBookCode',
  /**
   * File export điện lực thật (đã kiểm tra trực tiếp) có 2 cột cuối
   * (Số tiền/SĐT) KHÔNG có tiêu đề — SheetJS tự đặt tên key
   * '__EMPTY'/'__EMPTY_1' theo đúng thứ tự cột trái sang phải cho các cột
   * thiếu header. Nếu không map riêng, 2 cột này bị bỏ qua hoàn toàn (đã xảy
   * ra thật — import 1021 khách hàng nhưng không có Số tiền).
   */
  '__empty_1': 'phone',
};

/** Cột lịch sử hóa đơn ngoại nhập — không thuộc NewCustomer, xử lý riêng. */
const EXTERNAL_INVOICE_HEADER_MAP: Record<string, ExternalInvoiceField> = {
  'id hóa đơn': 'externalInvoiceId',
  'loại hóa đơn': 'invoiceType',
  'số tiền': 'amount',
  'thành tiền': 'amount',
  '__empty': 'amount',
};

const SERVICE_TYPE_ALIASES: Record<string, ServiceType> = {
  electric: 'ELECTRIC',
  'điện': 'ELECTRIC',
  dien: 'ELECTRIC',
  water: 'WATER',
  'nước': 'WATER',
  nuoc: 'WATER',
};

export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ');
}

function toText(value: unknown): string {
  if (value == null) {
    return '';
  }
  return String(value).trim();
}

function resolveServiceType(value: unknown): ServiceType | null {
  const key = toText(value).toLowerCase();
  return SERVICE_TYPE_ALIASES[key] ?? null;
}

/**
 * Chấp nhận cả ô Excel numeric (SheetJS trả về number thật) lẫn chuỗi định
 * dạng Việt Nam kiểu "1.234.567" (dấu chấm phân cách nghìn). Trả về null nếu
 * không parse được — không throw, để dòng lỗi được báo qua `reasons` như các
 * lỗi khác.
 */
export function parseVndAmount(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const cleaned = value.trim().replace(/\./g, '').replace(/,/g, '.');
    if (cleaned.length === 0) {
      return null;
    }
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export interface ExternalInvoiceInput {
  externalInvoiceId: string;
  invoiceType: string | null;
  amount: number;
}

export interface ValidImportRow {
  rowNumber: number;
  customer: NewCustomer;
  /** Chỉ set khi dòng có đủ ID Hóa đơn + Số tiền hợp lệ (file dạng lịch sử hóa đơn). */
  externalInvoice?: ExternalInvoiceInput;
}

export interface InvalidImportRow {
  rowNumber: number;
  reasons: string[];
}

export interface ClassifyResult {
  valid: ValidImportRow[];
  invalid: InvalidImportRow[];
}

/**
 * rows: kết quả thô từ `XLSX.utils.sheet_to_json` (object theo header gốc trong
 * file, dòng dữ liệu đầu tiên coi là rowNumber = 2 vì dòng 1 là header).
 */
export function classifyRows(rows: Record<string, unknown>[]): ClassifyResult {
  const valid: ValidImportRow[] = [];
  const invalid: InvalidImportRow[] = [];
  const seenCodes = new Set<string>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const fields: Partial<Record<CustomerField, string>> = {};
    let serviceTypeRaw: unknown;
    const externalRaw: {
      externalInvoiceId?: string;
      invoiceType?: string;
      amount?: unknown;
    } = {};

    for (const [rawHeader, rawValue] of Object.entries(row)) {
      const normalizedHeader = normalizeHeader(rawHeader);
      const field = HEADER_MAP[normalizedHeader];
      if (field) {
        if (field === 'serviceType') {
          serviceTypeRaw = rawValue;
        } else {
          fields[field] = toText(rawValue);
        }
        continue;
      }
      const externalField = EXTERNAL_INVOICE_HEADER_MAP[normalizedHeader];
      if (externalField === 'amount') {
        externalRaw.amount = rawValue;
      } else if (externalField === 'externalInvoiceId') {
        externalRaw.externalInvoiceId = toText(rawValue);
      } else if (externalField === 'invoiceType') {
        externalRaw.invoiceType = toText(rawValue);
      }
    }

    const isUtilityExportFormat =
      fields.readingBookCode !== undefined ||
      externalRaw.externalInvoiceId !== undefined ||
      externalRaw.invoiceType !== undefined ||
      externalRaw.amount !== undefined;

    const reasons: string[] = [];
    const customerCode = fields.customerCode ?? '';
    const fullName = fields.fullName ?? '';

    if (customerCode.length === 0) {
      reasons.push('Thiếu Mã khách hàng');
    }
    if (fullName.length === 0) {
      reasons.push('Thiếu Họ tên');
    }
    let serviceType = resolveServiceType(serviceTypeRaw);
    if (!serviceType) {
      if (isUtilityExportFormat) {
        // File dạng export điện lực không có cột "Loại dịch vụ" — toàn bộ
        // file luôn là điện.
        serviceType = 'ELECTRIC';
      } else {
        reasons.push('Loại dịch vụ không hợp lệ');
      }
    }
    // File dạng export điện lực: 1 khách có thể lặp lại nhiều dòng (nhiều kỳ
    // hóa đơn, hoặc 2 loại TD+VC cùng lúc) — đây là hợp lệ, không phải lỗi
    // trùng dữ liệu. Chỉ báo trùng với template khách hàng thuần (mỗi dòng
    // phải là 1 khách khác nhau).
    if (
      !isUtilityExportFormat &&
      customerCode.length > 0 &&
      seenCodes.has(customerCode)
    ) {
      reasons.push('Mã khách hàng bị trùng trong file');
    }

    if (reasons.length > 0) {
      invalid.push({ rowNumber, reasons });
      return;
    }

    seenCodes.add(customerCode);
    const readingBookCode = fields.readingBookCode?.trim();
    // File dạng export điện lực chỉ có 1 mã cho mỗi khách — dùng luôn làm
    // Mã đồng hồ khi không có cột "Mã đồng hồ" riêng.
    const meterCode =
      fields.meterCode && fields.meterCode.length > 0
        ? fields.meterCode
        : customerCode;

    const validRow: ValidImportRow = {
      rowNumber,
      customer: {
        customerCode,
        fullName,
        address: fields.address ?? '',
        phone: fields.phone ?? '',
        meterCode,
        serviceType: serviceType as ServiceType,
        readingBookCode: readingBookCode ? readingBookCode : null,
      },
    };

    const amount = parseVndAmount(externalRaw.amount);
    const externalInvoiceId = externalRaw.externalInvoiceId ?? '';
    if (externalInvoiceId.length > 0 && amount != null) {
      validRow.externalInvoice = {
        externalInvoiceId,
        invoiceType: externalRaw.invoiceType?.trim() || null,
        amount,
      };
    }

    valid.push(validRow);
  });

  return { valid, invalid };
}

export interface ImportSummary {
  createdCount: number;
  updatedCount: number;
  skippedDuplicateCount: number;
  skippedDuplicateCodes: string[];
  errorCount: number;
  errors: { customerCode: string; reason: string }[];
  /** Số dòng lịch sử hóa đơn ngoại nhập đã ghi thêm (ID Hóa đơn/Loại/Số tiền). */
  importedInvoiceCount: number;
  /** Bỏ qua vì ID Hóa đơn đã tồn tại — an toàn khi lỡ import lại cùng file. */
  importedInvoiceSkippedCount: number;
}

export function importValidRows(
  validRows: ValidImportRow[],
  options: {
    onDuplicate?: ImportDuplicateMode;
    repo?: CustomerRepository;
    importedInvoiceRepo?: ImportedInvoiceRecordRepository;
  } = {},
): ImportSummary {
  const {
    onDuplicate = 'skip',
    repo = new CustomerRepository(),
    importedInvoiceRepo = new ImportedInvoiceRecordRepository(),
  } = options;

  const { created, updated, skippedDuplicateCodes, errors } = repo.createMany(
    validRows.map(row => row.customer),
    { onDuplicate },
  );

  const customerIdByCode = new Map<string, number>();
  for (const customer of [...created, ...updated]) {
    customerIdByCode.set(customer.customerCode, customer.id);
  }
  for (const code of skippedDuplicateCodes) {
    const existing = repo.findByCode(code);
    if (existing) {
      customerIdByCode.set(code, existing.id);
    }
  }

  let importedInvoiceCount = 0;
  let importedInvoiceSkippedCount = 0;
  for (const row of validRows) {
    if (!row.externalInvoice) {
      continue;
    }
    const customerId = customerIdByCode.get(row.customer.customerCode);
    if (customerId == null) {
      continue;
    }
    if (
      importedInvoiceRepo.existsByExternalInvoiceId(
        row.externalInvoice.externalInvoiceId,
      )
    ) {
      importedInvoiceSkippedCount += 1;
      continue;
    }
    importedInvoiceRepo.create({
      customerId,
      externalInvoiceId: row.externalInvoice.externalInvoiceId,
      invoiceType: row.externalInvoice.invoiceType,
      amount: row.externalInvoice.amount,
    });
    importedInvoiceCount += 1;
  }

  return {
    createdCount: created.length,
    updatedCount: updated.length,
    skippedDuplicateCount: skippedDuplicateCodes.length,
    skippedDuplicateCodes,
    errorCount: errors.length,
    errors,
    importedInvoiceCount,
    importedInvoiceSkippedCount,
  };
}

/**
 * Báo trước (không ghi DB) dòng nào trong file đã trùng customerCode với DB —
 * không phụ thuộc `onDuplicate`, chỉ để màn hình xem trước hiển thị số liệu
 * trước khi người dùng bấm xác nhận.
 */
export function previewDuplicates(
  validRows: NewCustomer[],
  repo: CustomerRepository = new CustomerRepository(),
): { toCreateCount: number; toUpdateCount: number; existingCodes: string[] } {
  const existingCodes = validRows
    .map(row => row.customerCode)
    .filter(customerCode => repo.existsByCode(customerCode));
  return {
    toCreateCount: validRows.length - existingCodes.length,
    toUpdateCount: existingCodes.length,
    existingCodes,
  };
}
