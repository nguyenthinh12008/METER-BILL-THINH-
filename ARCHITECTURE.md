# ARCHITECTURE.md

## Nguyên tắc

Không cho phép:

```
Screen → SQLite
Screen → Bluetooth Library
```

Bắt buộc:

```
Screen → Service → Repository → Database (SQLite hiện tại, API sau này)
```

Ví dụ cụ thể theo từng nghiệp vụ:

```
CustomerScreen   → CustomerService   → CustomerRepository → SQLite
InvoiceScreen    → BillingService    → BillingCalculator
InvoiceScreen    → BluetoothPrinterService → EscPosService → Bluetooth Printer
```

Screen chỉ chịu trách nhiệm hiển thị UI và gọi Service. Không chứa business logic,
không chứa câu SQL, không gọi trực tiếp thư viện native (Bluetooth, file system...).

## Vì sao tách theo lớp này

MVP hiện tại chưa có Backend, nhưng Repository là điểm duy nhất biết dữ liệu đến
từ đâu (SQLite hôm nay, có thể là REST API sau này). Nếu Screen hoặc Service gọi
thẳng SQLite, việc thêm Backend sau này sẽ phải viết lại UI. Vì Repository đứng
giữa, Service và Screen không cần biết gì thay đổi.

```
Hiện tại:  Screen → Service → Repository → SQLite
Sau này:   Screen → Service → Repository → SQLite / REST API
```

## Cấu trúc thư mục

```
src/
├── screens/        Màn hình, chỉ UI + gọi Service qua props/hooks
├── components/      Component dùng chung, không chứa business logic
├── services/        Business logic thuần TypeScript, không import React Native UI
│   ├── CustomerService.ts
│   ├── ExcelImportService.ts
│   ├── MeterService.ts
│   ├── BillingService.ts
│   ├── InvoiceService.ts
│   ├── BluetoothPrinterService.ts
│   └── EscPosService.ts
├── repositories/     Duy nhất nơi chứa câu SQL / query
│   ├── CustomerRepository.ts
│   ├── MeterRepository.ts
│   └── InvoiceRepository.ts
├── database/        Kết nối SQLite, migration, seed data
├── models/          Kiểu dữ liệu domain (không phải kiểu DB row)
├── navigation/       React Navigation stack, param list
├── types/           Kiểu dùng chung không thuộc 1 domain cụ thể
├── utils/           Hàm thuần (validate, formatter, date) — không side effect
└── constants/        Hằng số, không hard-code trong Screen/Service
```

## Billing

```
InvoiceScreen → BillingService → BillingCalculator (+ TariffRepository)
```

`BillingCalculator` là hàm thuần (pure function): nhận `consumption` + bậc giá,
trả về `{ subtotal, tax, total }`. Không đọc SQLite trực tiếp — nhận tariff đã
được `BillingService` load sẵn qua Repository. Nhờ vậy có thể unit test
`BillingCalculator` với input cố định mà không cần database thật.

## Printer

```
InvoiceScreen → BluetoothPrinterService → EscPosService → Bluetooth Printer
```

- `BluetoothPrinterService`: quản lý scan/connect/disconnect/status, không biết
  gì về định dạng hóa đơn.
- `EscPosService`: nhận `Invoice` object, chuyển thành ESC/POS byte sequence.
  Không biết gì về Bluetooth — chỉ tạo bytes.

Tách hai service này để sau này đổi loại kết nối (USB, Wi-Fi printer) chỉ cần
thay `BluetoothPrinterService`, không đụng vào `EscPosService`.

### Nội dung in hóa đơn (mapping)

Dựa trên mẫu biên nhận thu tiền điện thực tế (giấy in nhiệt), thứ tự các dòng cần
in và nguồn dữ liệu tương ứng — dùng làm hợp đồng khi implement `EscPosService` ở
Phase 8 (schema đã chuẩn bị sẵn từ Phase 2, xem DATABASE.md):

| Dòng in | Nguồn dữ liệu |
|---|---|
| Tên đơn vị điện lực (theo khu vực) | `app_settings.companyName` |
| Tên nhân viên thu tiền + số TK ngân hàng + tên ngân hàng | `User.fullName` (qua `invoices.collectedByUserId`) + `app_settings.bankAccountNumber` / `bankName` |
| "thu tiền điện ngày {từ} đến {đến}" | `invoices.periodFrom` / `periodTo` |
| "THÔNG BÁO TIỀN ĐIỆN" (hoặc TIỀN NƯỚC) | nhãn tĩnh theo `customer.serviceType` |
| Mã KH / Tên KH / ĐT / Địa chỉ | `customers.customerCode` / `fullName` / `phone` / `address` |
| Số tiền (tiền điện) | `invoices.subtotal + invoices.tax` |
| Phí dịch vụ | `invoices.serviceFee` |
| Thời gian | `invoices.printedAt` |
| Liên hệ (hotline) | `app_settings.hotline` |
| "Người thu: {tên} thu thêm {phí}đ phí đi thu" (chỉ hiện khi serviceFee > 0) | ghép `User.fullName` + `invoices.serviceFee` |
| Số ĐT/Zalo nhân viên thu | `User.phone` |

**Cập nhật (đăng nhập nhiều tài khoản):** 2 dòng "tên nhân viên thu" và "SĐT/Zalo"
đổi nguồn từ `app_settings.collectorName`/`collectorPhone` (1 giá trị tĩnh cho cả
app) sang `User` — tra theo `invoices.collectedByUserId` (người đã đăng nhập lúc
tạo hóa đơn đó), xem `AuthService`/`UserRepository`. Hóa đơn tạo trước khi có tính
năng này có `collectedByUserId = null` → `EscPosService.buildInvoiceReceipt()` bỏ
2 dòng đó, không lỗi. `app_settings` giờ chỉ còn dùng 4 key
(companyName/hotline/bankAccountNumber/bankName), chỉnh qua form trong
`PrinterScreen`.

**Hóa đơn ngoại nhập (`ImportedInvoiceRecord`)**: file export điện lực chỉ có
tổng tiền có sẵn, không có chỉ số công tơ/kỳ thu → không dùng
`buildInvoiceReceipt()`. `EscPosService.buildImportedInvoiceReceipt()` in
cùng khung công ty/khách hàng/người thu nhưng thay 3 dòng liên quan chỉ
số/kỳ thu bằng "Mã hóa đơn" (`ImportedInvoiceRecord.externalInvoiceId`),
"Loại" (`invoiceType`, bỏ nếu null), "Số tiền" (`amount`). Người thu lấy từ
`currentUser` đang đăng nhập tại thời điểm in (không lưu `collectedByUserId`
trên bản ghi ngoại nhập — không có UI hiển thị trạng thái đã in cho loại
này). Vào từ nút "In" trong mục "Lịch sử hóa đơn nhập" ở `CustomerDetailScreen`
→ `PrinterScreen` nhận `importedInvoiceRecordId` (thay vì `invoiceId`).

## Offline-first & chuẩn bị cho sync sau này

MVP hoạt động hoàn toàn không cần Internet — SQLite là nguồn dữ liệu chính.
Các bảng có sẵn `createdAt`, `updatedAt` để dễ mở rộng, và có thể thêm cột
`syncStatus` (`PENDING` / `SYNCED` / `FAILED`) khi cần đồng bộ server thật.
**Không** implement API hay fake server trong MVP — chỉ chuẩn bị chỗ trống.

```
Sau này (chưa làm):
SQLite ↕ SyncService ↕ REST API ↕ Server
```

## Trạng thái triển khai

| Lớp | Trạng thái |
|---|---|
| `navigation/` | 2 stack song song (chọn theo `useAuth()`): Auth stack (`Bootstrap`/`Login`, chưa đăng nhập) và Main stack (`Home` + 7 màn hình gốc + `Accounts`/`AddAccount`, đã đăng nhập). Param đã typed đầy đủ theo từng route cần dữ liệu |
| `contexts/` | `AuthContext` (`AuthProvider`/`useAuth()`) — session đăng nhập chỉ trong bộ nhớ, bọc quanh `AppNavigator` ở `App.tsx` |
| `database/`, `models/`, `repositories/` | Kết nối SQLite (`@op-engineering/op-sqlite`), migration có version (hiện tại version 3), 7 model, 7 repository (Customer/Meter/Invoice/Tariff/Settings/User/ImportedInvoiceRecord). `CustomerRepository.createMany()` (Phase 3), `InvoiceRepository.listRecent()` (trang chủ), `UserRepository` (đăng nhập nhiều tài khoản), `ImportedInvoiceRecordRepository` (tương thích dữ liệu điện lực) |
| `services/` | `CustomerService`, `ExcelImportService`, `excelFile.ts` (Phase 3); `MeterService`, `BillingCalculator`, `BillingService` (Phase 4/5); `InvoiceService` (Phase 6); `BluetoothPrinterService`, `EscPosService`, `SettingsService` (Phase 7/8); `AuthService` (đăng nhập nhiều tài khoản); `ImportedInvoiceService` (tương thích dữ liệu điện lực) |
| `utils/` | `currency.ts` (Phase 4/5), `date.ts` (Phase 6, thêm `formatDateTime` ở Phase 8, `getCurrentPeriod` ở trang chủ), `vietnameseText.ts` (`stripDiacritics`, Phase 8), `passwordHash.ts` (đăng nhập nhiều tài khoản) |
| `screens/` | 7 màn hình gốc đã có logic thật: Customer* (Phase 3), `MeterReadingScreen` (Phase 4/5), Invoice* (Phase 6), `PrinterScreen` (Phase 7/8). `HomeScreen` (ngoài phạm vi gốc) — dashboard tổng quan, là `initialRouteName` khi đã đăng nhập. `BootstrapScreen`/`LoginScreen`/`AddAccountScreen`/`AccountsScreen` (đăng nhập nhiều tài khoản) |
| `components/` | Mới — `RegisterForm.tsx`, form tạo tài khoản dùng chung cho `BootstrapScreen` và `AddAccountScreen` (đăng nhập nhiều tài khoản) |
