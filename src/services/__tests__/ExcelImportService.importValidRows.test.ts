import { createMigratedTestDb } from '../../test-utils/sqliteTestDb';
import { CustomerRepository } from '../../repositories/CustomerRepository';
import { ImportedInvoiceRecordRepository } from '../../repositories/ImportedInvoiceRecordRepository';
import {
  importValidRows,
  previewDuplicates,
  type ValidImportRow,
} from '../ExcelImportService';
import type { NewCustomer } from '../../models/Customer';

function makeCustomer(overrides: Partial<NewCustomer> = {}): NewCustomer {
  return {
    customerCode: 'C0001',
    fullName: 'Nguyễn Văn A',
    address: '',
    phone: '',
    meterCode: '',
    serviceType: 'ELECTRIC',
    readingBookCode: null,
    ...overrides,
  };
}

function makeRow(overrides: Partial<NewCustomer> = {}): ValidImportRow {
  return {
    rowNumber: 2,
    customer: makeCustomer(overrides),
  };
}

describe('importValidRows', () => {
  it('trả về createdCount đúng và insert được vào DB', () => {
    const repo = new CustomerRepository(createMigratedTestDb());
    const summary = importValidRows(
      [makeRow({ customerCode: 'C0001' }), makeRow({ customerCode: 'C0002' })],
      { repo },
    );

    expect(summary.createdCount).toBe(2);
    expect(summary.updatedCount).toBe(0);
    expect(summary.skippedDuplicateCount).toBe(0);
    expect(summary.errorCount).toBe(0);
    expect(summary.importedInvoiceCount).toBe(0);
    expect(repo.findByCode('C0001')).not.toBeNull();
    expect(repo.findByCode('C0002')).not.toBeNull();
  });

  it('mặc định (onDuplicate không truyền) bỏ qua customerCode đã tồn tại trong DB, không ghi đè', () => {
    const repo = new CustomerRepository(createMigratedTestDb());
    repo.create(makeCustomer({ customerCode: 'C0001', fullName: 'Đã có' }));

    const summary = importValidRows(
      [makeRow({ customerCode: 'C0001', fullName: 'Từ file import' })],
      { repo },
    );

    expect(summary.createdCount).toBe(0);
    expect(summary.updatedCount).toBe(0);
    expect(summary.skippedDuplicateCount).toBe(1);
    expect(summary.skippedDuplicateCodes).toEqual(['C0001']);
    expect(repo.findByCode('C0001')?.fullName).toBe('Đã có');
  });

  it('onDuplicate: "update" cập nhật customerCode đã tồn tại, giữ field rỗng của bản ghi cũ', () => {
    const repo = new CustomerRepository(createMigratedTestDb());
    repo.create(
      makeCustomer({
        customerCode: 'C0001',
        fullName: 'Đã có',
        phone: '0900000000',
        address: '1 Đường Cũ',
      }),
    );

    const summary = importValidRows(
      [
        makeRow({
          customerCode: 'C0001',
          fullName: 'Tên mới từ file',
          phone: '',
          address: '2 Đường Mới',
        }),
      ],
      { onDuplicate: 'update', repo },
    );

    expect(summary.createdCount).toBe(0);
    expect(summary.updatedCount).toBe(1);
    expect(summary.skippedDuplicateCount).toBe(0);

    const updated = repo.findByCode('C0001');
    expect(updated?.fullName).toBe('Tên mới từ file');
    expect(updated?.address).toBe('2 Đường Mới');
    expect(updated?.phone).toBe('0900000000'); // field rỗng trong file -> giữ giá trị cũ
  });

  it('dòng có externalInvoice tạo thêm bản ghi lịch sử hóa đơn gắn đúng customerId', () => {
    const db = createMigratedTestDb();
    const repo = new CustomerRepository(db);
    const importedInvoiceRepo = new ImportedInvoiceRecordRepository(db);

    const row: ValidImportRow = {
      ...makeRow({ customerCode: 'C0001' }),
      externalInvoice: {
        externalInvoiceId: '1676732964',
        invoiceType: 'TD',
        amount: 348926,
      },
    };

    const summary = importValidRows([row], { repo, importedInvoiceRepo });

    expect(summary.importedInvoiceCount).toBe(1);
    const customer = repo.findByCode('C0001');
    const records = importedInvoiceRepo.listByCustomerId(customer!.id);
    expect(records).toHaveLength(1);
    expect(records[0].externalInvoiceId).toBe('1676732964');
    expect(records[0].invoiceType).toBe('TD');
    expect(records[0].amount).toBe(348926);
  });

  it('import lại cùng externalInvoiceId không tạo trùng bản ghi lịch sử', () => {
    const db = createMigratedTestDb();
    const repo = new CustomerRepository(db);
    const importedInvoiceRepo = new ImportedInvoiceRecordRepository(db);

    const row: ValidImportRow = {
      ...makeRow({ customerCode: 'C0001' }),
      externalInvoice: {
        externalInvoiceId: '1676732964',
        invoiceType: 'TD',
        amount: 348926,
      },
    };

    importValidRows([row], { repo, importedInvoiceRepo });
    const secondSummary = importValidRows([row], {
      onDuplicate: 'update',
      repo,
      importedInvoiceRepo,
    });

    expect(secondSummary.importedInvoiceCount).toBe(0);
    expect(secondSummary.importedInvoiceSkippedCount).toBe(1);
    const customer = repo.findByCode('C0001');
    expect(importedInvoiceRepo.listByCustomerId(customer!.id)).toHaveLength(1);
  });
});

describe('previewDuplicates', () => {
  it('đếm đúng số dòng sẽ tạo mới / đã trùng, không phụ thuộc onDuplicate', () => {
    const repo = new CustomerRepository(createMigratedTestDb());
    repo.create(makeCustomer({ customerCode: 'C0001' }));

    const preview = previewDuplicates(
      [
        makeCustomer({ customerCode: 'C0001' }),
        makeCustomer({ customerCode: 'C0002' }),
        makeCustomer({ customerCode: 'C0003' }),
      ],
      repo,
    );

    expect(preview.toCreateCount).toBe(2);
    expect(preview.toUpdateCount).toBe(1);
    expect(preview.existingCodes).toEqual(['C0001']);
  });
});
