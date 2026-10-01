/** Lịch sử hóa đơn ngoại nhập (không phải hóa đơn app tự tạo) — chỉ có tổng
 * tiền + mã hóa đơn gốc, không có chỉ số công tơ, tách khỏi bảng invoices. */
export interface ImportedInvoiceRecord {
  id: number;
  customerId: number;
  externalInvoiceId: string;
  invoiceType: string | null;
  amount: number;
  importedAt: string;
}

export type NewImportedInvoiceRecord = Omit<
  ImportedInvoiceRecord,
  'id' | 'importedAt'
>;

/** Kèm sẵn tên/mã khách hàng (join) — dùng cho màn "Hóa đơn cần in". */
export interface ImportedInvoiceRecordWithCustomer extends ImportedInvoiceRecord {
  customerCode: string;
  customerFullName: string;
}
