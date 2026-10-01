export type PrintStatus = 'NOT_PRINTED' | 'PRINTED' | 'PRINT_FAILED';

export interface Invoice {
  id: number;
  invoiceCode: string;
  customerId: number;
  period: string;
  /** ISO date — ngày bắt đầu kỳ thu, in trên hóa đơn ("thu tiền điện ngày ... đến ..."). */
  periodFrom: string | null;
  /** ISO date — ngày kết thúc kỳ thu, in trên hóa đơn. */
  periodTo: string | null;
  oldReading: number;
  newReading: number;
  consumption: number;
  subtotal: number;
  tax: number;
  /** Phí dịch vụ/phí đi thu — in tách riêng khỏi tiền điện trên hóa đơn. */
  serviceFee: number;
  /** = subtotal + tax + serviceFee */
  total: number;
  createdAt: string;
  /** Set khi in thành công — dùng làm dòng "Thời gian" trên hóa đơn. */
  printedAt: string | null;
  printStatus: PrintStatus;
  /** Nhân viên đã thu tiền — null với hóa đơn tạo trước khi có đăng nhập. */
  collectedByUserId: number | null;
}

export type NewInvoice = Omit<
  Invoice,
  'id' | 'createdAt' | 'printedAt' | 'printStatus'
>;
