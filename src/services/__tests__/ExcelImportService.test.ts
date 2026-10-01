import { classifyRows, normalizeHeader, parseVndAmount } from '../ExcelImportService';

describe('normalizeHeader', () => {
  it('trim, gộp khoảng trắng, lowercase', () => {
    expect(normalizeHeader('  Mã   Khách Hàng ')).toBe('mã khách hàng');
  });
});

describe('classifyRows', () => {
  it('phân loại dòng hợp lệ đúng field, rowNumber tính từ 2 (dòng 1 là header)', () => {
    const { valid, invalid } = classifyRows([
      {
        'Mã khách hàng': 'C0001',
        'Họ tên': 'Nguyễn Văn A',
        'Địa chỉ': '1 Đường A',
        'Số điện thoại': '0900000000',
        'Mã đồng hồ': 'DC0001',
        'Loại dịch vụ': 'Điện',
      },
    ]);

    expect(invalid).toEqual([]);
    expect(valid).toEqual([
      {
        rowNumber: 2,
        customer: {
          customerCode: 'C0001',
          fullName: 'Nguyễn Văn A',
          address: '1 Đường A',
          phone: '0900000000',
          meterCode: 'DC0001',
          serviceType: 'ELECTRIC',
          readingBookCode: null,
        },
      },
    ]);
  });

  it('chấp nhận header không phân biệt hoa/thường và khoảng trắng thừa', () => {
    const { valid } = classifyRows([
      {
        '  mã khách hàng  ': 'C0001',
        'HỌ TÊN': 'Nguyễn Văn A',
        'loại dịch vụ': 'WATER',
      },
    ]);
    expect(valid[0].customer.serviceType).toBe('WATER');
  });

  it('báo thiếu Mã khách hàng và thiếu Họ tên', () => {
    const { invalid } = classifyRows([{ 'Loại dịch vụ': 'Điện' }]);
    expect(invalid).toEqual([
      {
        rowNumber: 2,
        reasons: ['Thiếu Mã khách hàng', 'Thiếu Họ tên'],
      },
    ]);
  });

  it('báo Loại dịch vụ không hợp lệ khi giá trị lạ hoặc thiếu', () => {
    const { invalid } = classifyRows([
      { 'Mã khách hàng': 'C0001', 'Họ tên': 'A', 'Loại dịch vụ': 'GAS' },
    ]);
    expect(invalid[0].reasons).toContain('Loại dịch vụ không hợp lệ');
  });

  it('báo trùng Mã khách hàng trong file — dòng đầu hợp lệ, dòng sau bị đánh dấu lỗi', () => {
    const rows = [
      { 'Mã khách hàng': 'C0001', 'Họ tên': 'A', 'Loại dịch vụ': 'Điện' },
      { 'Mã khách hàng': 'C0001', 'Họ tên': 'B', 'Loại dịch vụ': 'Điện' },
    ];
    const { valid, invalid } = classifyRows(rows);

    expect(valid.length).toBe(1);
    expect(valid[0].customer.fullName).toBe('A');
    expect(invalid).toEqual([
      { rowNumber: 3, reasons: ['Mã khách hàng bị trùng trong file'] },
    ]);
  });

  it('nhận diện file export điện lực (Mã Sổ GCS/Mã Khang/Tên Khang/ID Hóa đơn/Loại Hóa đơn/Số tiền) — dữ liệu hư cấu', () => {
    const { valid, invalid } = classifyRows([
      {
        'Mã Sổ GCS': 'I0000-000',
        'Mã Khang': 'PB00000000001',
        'Tên Khang': 'Nguyễn Văn Mẫu',
        'ID Hóa đơn': '1000000001',
        'Loại Hóa đơn': 'TD',
        'Số tiền': '1.234.567',
        'Số điện thoại': '0900000099',
      },
    ]);

    expect(invalid).toEqual([]);
    expect(valid).toHaveLength(1);
    const row = valid[0];
    // Không có cột "Mã khách hàng"/"Mã đồng hồ" riêng -> cùng dùng Mã Khang.
    expect(row.customer.customerCode).toBe('PB00000000001');
    expect(row.customer.meterCode).toBe('PB00000000001');
    expect(row.customer.fullName).toBe('Nguyễn Văn Mẫu');
    expect(row.customer.readingBookCode).toBe('I0000-000');
    // Không có cột "Loại dịch vụ" -> mặc định ELECTRIC vì đây là file điện lực.
    expect(row.customer.serviceType).toBe('ELECTRIC');
    expect(row.externalInvoice).toEqual({
      externalInvoiceId: '1000000001',
      invoiceType: 'TD',
      amount: 1234567,
    });
  });

  it('file thật không có tiêu đề cho cột Số tiền/SĐT — SheetJS đặt key __EMPTY/__EMPTY_1 theo đúng thứ tự cột, vẫn đọc được (dữ liệu hư cấu)', () => {
    const { valid, invalid } = classifyRows([
      {
        'Mã Sổ GCS': 'I0000-000',
        'Mã Khang': 'PB00000000001',
        'Tên Khang': 'Nguyễn Văn Mẫu',
        'ID Hóa đơn': '1000000001',
        'Loại Hóa đơn': 'TD',
        __EMPTY: 1234567,
        __EMPTY_1: '0900000099',
      },
    ]);

    expect(invalid).toEqual([]);
    expect(valid).toHaveLength(1);
    const row = valid[0];
    expect(row.customer.phone).toBe('0900000099');
    expect(row.externalInvoice).toEqual({
      externalInvoiceId: '1000000001',
      invoiceType: 'TD',
      amount: 1234567,
    });
  });

  it('file điện lực: 1 khách lặp lại nhiều dòng (TD+VC) đều hợp lệ, không báo trùng', () => {
    const rows = [
      {
        'Mã Sổ GCS': 'I0000-000',
        'Mã Khang': 'PB00000000001',
        'Tên Khang': 'Nguyễn Văn Mẫu',
        'ID Hóa đơn': '1000000001',
        'Loại Hóa đơn': 'TD',
        'Số tiền': '100000',
      },
      {
        'Mã Sổ GCS': 'I0000-000',
        'Mã Khang': 'PB00000000001',
        'Tên Khang': 'Nguyễn Văn Mẫu',
        'ID Hóa đơn': '1000000002',
        'Loại Hóa đơn': 'VC',
        'Số tiền': '50000',
      },
    ];
    const { valid, invalid } = classifyRows(rows);

    expect(invalid).toEqual([]);
    expect(valid).toHaveLength(2);
    expect(valid[0].externalInvoice?.externalInvoiceId).toBe('1000000001');
    expect(valid[1].externalInvoice?.externalInvoiceId).toBe('1000000002');
  });

  it('vẫn báo lỗi Loại dịch vụ khi file không có tín hiệu định dạng điện lực nào', () => {
    const { invalid } = classifyRows([
      { 'Mã khách hàng': 'C0001', 'Họ tên': 'A' },
    ]);
    expect(invalid[0].reasons).toContain('Loại dịch vụ không hợp lệ');
  });
});

describe('parseVndAmount', () => {
  it('chấp nhận number thật', () => {
    expect(parseVndAmount(348926)).toBe(348926);
  });

  it('chấp nhận chuỗi định dạng Việt Nam (dấu chấm phân cách nghìn)', () => {
    expect(parseVndAmount('1.234.567')).toBe(1234567);
  });

  it('trả về null với chuỗi không parse được', () => {
    expect(parseVndAmount('abc')).toBeNull();
    expect(parseVndAmount('')).toBeNull();
  });
});
