# TASKS.md

Trạng thái: `TODO` / `IN PROGRESS` / `REVIEW` / `DONE` / `BLOCKED`

Không đánh dấu `DONE` nếu task chưa được test.

## Phase 1 — Project Setup

| Task | Trạng thái |
|---|---|
| Kiểm tra môi trường (Node, JDK, Android SDK, emulator) | DONE |
| Khởi tạo React Native + TypeScript (bare workflow, RN CLI) | DONE |
| Cài đặt React Navigation (native-stack) | DONE |
| Tạo cấu trúc thư mục `src/` (screens, navigation) | DONE |
| Tạo 7 màn hình placeholder theo spec, wiring vào navigator | DONE |
| Git init + tạo branch `main` / `develop` | DONE |
| Tạo README.md, TASKS.md, PROGRESS.md, ARCHITECTURE.md, DATABASE.md, CONTRIBUTING.md | DONE |
| TypeScript check (`tsc --noEmit`) | DONE |
| ESLint (`eslint .`) | DONE |
| Jest (`jest`) | DONE |
| Build & chạy app trên Android emulator thật, xác nhận không crash | DONE |

## Phase 2 — Database

| Task | Trạng thái |
|---|---|
| Cài `@op-engineering/op-sqlite` (đánh giá compatibility với New Architecture trước khi cài — xem PROGRESS.md) | DONE |
| `src/database/database.ts` — kết nối SQLite | DONE |
| `src/database/migrations.ts` — cơ chế migration có version | DONE |
| Tạo bảng: customers, meter_readings, invoices, tariffs, app_settings (xem DATABASE.md — invoices có thêm periodFrom/periodTo/serviceFee/printedAt, app_settings mới, để đủ dữ liệu in hóa đơn) | DONE |
| `src/repositories/CustomerRepository.ts` | DONE |
| `src/repositories/MeterRepository.ts` | DONE |
| `src/repositories/InvoiceRepository.ts` | DONE |
| `src/repositories/TariffRepository.ts` | DONE |
| `src/repositories/SettingsRepository.ts` (mới — cấu hình công ty/nhân viên thu tiền in trên hóa đơn) | DONE |
| `src/database/seed.ts` — 10 khách hàng hư cấu, một số meter reading, tariff mẫu, 6 app_settings rỗng | DONE |
| Test CRUD cơ bản trên từng repository (Jest + better-sqlite3 devDependency, không cần emulator) | DONE |

## Phase 3 — Customer + Excel Import

| Task | Trạng thái |
|---|---|
| Cài `@react-native-documents/picker` (file picker) + `xlsx` (SheetJS, bản vá lỗi bảo mật từ CDN chính chủ, không dùng bản npm registry cũ) | DONE |
| `src/services/CustomerService.ts` — validate, create/update/remove/getById/list (phân trang) | DONE |
| `src/services/ExcelImportService.ts` — mapping header tiếng Việt, `classifyRows`, `importValidRows` | DONE |
| `src/services/excelFile.ts` — wrapper chọn file + đọc `.xlsx` (RN-only, không unit test) | DONE |
| `CustomerRepository.createMany()` — bulk insert, bỏ qua trùng mã, lỗi từng dòng không phá batch | DONE |
| `CustomerListScreen` — tìm kiếm debounce, phân trang qua `FlatList`, điều hướng | DONE |
| `ImportCustomerScreen` — chọn file → preview lỗi/hợp lệ → xác nhận → kết quả | DONE |
| `CustomerDetailScreen` — thêm/sửa/xoá khách hàng | DONE |
| Test Jest cho ExcelImportService/CustomerService/CustomerRepository.createMany | DONE |
| Test thủ công trên emulator: CRUD khách hàng + import Excel file thật (hợp lệ, lỗi, trùng) | DONE |

## Phase 4 — Meter Reading

| Task | Trạng thái |
|---|---|
| `src/services/MeterService.ts` — gợi ý chỉ số cũ, validate, bắt lỗi trùng kỳ | DONE |
| `RootStackParamList.MeterReading` nhận `{ customerId }`, nút "Nhập chỉ số" ở `CustomerDetailScreen` | DONE |
| `MeterReadingScreen` — nhập kỳ/chỉ số cũ/chỉ số mới, lưu qua `MeterService` | DONE |
| Test Jest cho `MeterService` (gợi ý chỉ số, validate, trùng kỳ) | DONE |
| Test thủ công trên emulator: nhập chỉ số, báo lỗi trùng kỳ, lưu thành công | DONE |

## Phase 5 — Billing

| Task | Trạng thái |
|---|---|
| `src/services/BillingCalculator.ts` — tính tiền luỹ tiến theo bậc thang (pure function) | DONE |
| `src/services/BillingService.ts` — load tariff qua `TariffRepository` + tính tiền | DONE |
| `src/utils/currency.ts` — format tiền VND | DONE |
| Hiển thị ước tính tiền ngay trong `MeterReadingScreen` (chưa lưu vào bảng `invoices` — việc đó thuộc Phase 6) | DONE |
| Test Jest cho `BillingCalculator`/`formatCurrency` (nhiều mức tiêu thụ cắt qua nhiều bậc) | DONE |
| Không cộng VAT vào tiền tính (xác nhận với người dùng — khớp mẫu hóa đơn thực tế đã xem trước đó) | DONE |

## Phase 6 — Invoice

| Task | Trạng thái |
|---|---|
| `src/utils/date.ts` — `getMonthRange()` tính khoảng ngày từ period "MM/YYYY" | DONE |
| `InvoiceRepository.count()` — dùng sinh invoiceCode tuần tự | DONE |
| `src/services/InvoiceService.ts` — `buildPreview()`, `create()` (tự sinh invoiceCode HD000001...), `getById()` | DONE |
| `RootStackParamList.InvoicePreview`/`InvoiceDetail` nhận `{ meterReadingId }`/`{ invoiceId }` | DONE |
| `MeterReadingScreen` sau khi lưu chỉ số → điều hướng sang Xem trước hóa đơn | DONE |
| `InvoicePreviewScreen` — xem/chỉnh kỳ + phí dịch vụ → Tạo hóa đơn | DONE |
| `InvoiceDetailScreen` — hiển thị đầy đủ hóa đơn, nút In hóa đơn (placeholder, chưa in thật) | DONE |
| Test Jest cho `getMonthRange`/`InvoiceService` | DONE |
| Test thủ công trên emulator: luồng đầy đủ Nhập chỉ số → Preview → Tạo hóa đơn → Chi tiết, kiểm tra dữ liệu lưu đúng trong SQLite | DONE |

## Phase 7 — Bluetooth

| Task | Trạng thái |
|---|---|
| Cài `react-native-bluetooth-classic` (module cầu nối kiểu cũ, không có TurboModule thật trong mảng Bluetooth Classic — xem PROGRESS.md) | DONE |
| Vá lỗi build `BuildConfig` của thư viện qua `patch-package` (AGP 9 tắt mặc định buildConfig) | DONE |
| `src/services/BluetoothPrinterService.ts` — quyền, danh sách đã ghép đôi, kết nối/ngắt, gửi byte | DONE |
| `PrinterScreen` — UI quét/kết nối máy in Bluetooth, mở Cài đặt hệ thống để ghép đôi | DONE |
| Test thủ công trên emulator: quyền, danh sách rỗng hợp lệ, mở Cài đặt Bluetooth thành công | DONE |
| Test in thật trên máy in Bluetooth thật | CẦN NGƯỜI DÙNG TỰ XÁC NHẬN — không có phần cứng trong môi trường build |

## Phase 8 — ESC/POS

| Task | Trạng thái |
|---|---|
| `src/utils/vietnameseText.ts` — bỏ dấu tiếng Việt (ASCII fallback, không dùng `.normalize()`) | DONE |
| `src/services/EscPosService.ts` — build byte ESC/POS theo đúng mapping ARCHITECTURE.md | DONE |
| `InvoiceService.markPrinted()`/`markPrintFailed()` | DONE |
| `SettingsService.ts` + UI cấu hình 6 field `app_settings` trong `PrinterScreen` (chưa có UI trước đây) | DONE |
| `InvoiceDetailScreen` nút "In hóa đơn" điều hướng sang `PrinterScreen` thay vì placeholder | DONE |
| Test Jest cho `EscPosService`/`vietnameseText` (so khớp nội dung dòng in, đủ trường hợp thiếu field/serviceFee=0/WATER) | DONE |
| Test thủ công: cấu hình lưu/đọc đúng qua SQLite, nút in disabled khi chưa kết nối | DONE |
| Test in giấy thật (đúng nội dung, đúng khổ giấy, cắt giấy) | CẦN NGƯỜI DÙNG TỰ XÁC NHẬN trên thiết bị + máy in thật |

## Ngoài phase gốc — Đăng nhập nhiều tài khoản, phân biệt "ai thu tiền"

| Task | Trạng thái |
|---|---|
| Migration version 2: bảng `users` + `invoices.collectedByUserId` | DONE |
| `src/utils/passwordHash.ts` (băm SHA-256 lặp, pure JS — `js-sha256`, tránh lỗi bundling `crypto` của bcryptjs/crypto-js) | DONE |
| `UserRepository`, `AuthService` — register/login/deactivate/listActiveUsers | DONE |
| `AuthContext` + `AuthProvider`, tách `AppNavigator` thành Auth stack (Bootstrap/Login) và Main stack | DONE |
| `BootstrapScreen`, `LoginScreen`, `AddAccountScreen`, `AccountsScreen`, `RegisterForm` dùng chung | DONE |
| Gắn `collectedByUserId` vào `InvoiceService.create()`, `InvoicePreviewScreen` | DONE |
| `EscPosService`/`PrinterScreen`/`InvoiceDetailScreen`/`HomeScreen` dùng `User` thay `app_settings.collectorName/collectorPhone` | DONE |
| Test Jest cho passwordHash/UserRepository/AuthService/InvoiceService/EscPosService (mode collector = null) | DONE |
| Test thủ công trên emulator dùng DB cũ có sẵn: bootstrap, thêm tài khoản, đăng xuất/đăng nhập, tạo hóa đơn gắn đúng người thu, hóa đơn cũ không lỗi | DONE |

## Ngoài phase gốc — Import Excel: chế độ "Cập nhật nếu đã tồn tại"

| Task | Trạng thái |
|---|---|
| `CustomerRepository.createMany()` nhận `onDuplicate: 'skip' \| 'update'`, merge field rỗng = giữ giá trị cũ | DONE |
| `ExcelImportService.importValidRows()` truyền `onDuplicate`, `ImportSummary` thêm `updatedCount` | DONE |
| `ExcelImportService.previewDuplicates()` — báo trước số tạo mới/trùng ở bước preview | DONE |
| `ImportCustomerScreen` — toggle Bỏ qua/Cập nhật, preview + kết quả hiển thị đúng theo mode | DONE |
| Test Jest cho `createMany`/`importValidRows`/`previewDuplicates` ở cả 2 mode | DONE |
| Test thủ công trên emulator: file có dòng trùng mã (field trống + field mới), pull DB xác nhận merge đúng | DONE |

## Ngoài phase gốc — Trang chủ (HomeScreen)

Không nằm trong 10 phase gốc — người dùng yêu cầu thêm sau khi Phase 8 xong.

| Task | Trạng thái |
|---|---|
| `HomeScreen` — dashboard tổng quan + truy cập nhanh, làm `initialRouteName` mới | DONE |
| `CustomerService.count()`, `InvoiceService.listByPeriod()`/`listRecent()`, `InvoiceRepository.listRecent()` | DONE |
| `utils/date.ts` — `getCurrentPeriod()` (thay hàm cục bộ trùng lặp trong `MeterReadingScreen`) | DONE |
| Test Jest cho các hàm/method mới | DONE |
| Test thủ công trên emulator: số liệu đúng, điều hướng đúng từ mọi thẻ/nút/dòng hóa đơn gần đây | DONE |

## Ngoài phase gốc — Tương thích với file dữ liệu khách hàng thực tế (điện lực)

Người dùng gửi file dữ liệu khách hàng thật (Mã Sổ GCS/Mã Khang/Tên Khang/ID
Hóa đơn/Loại Hóa đơn/Số tiền) và yêu cầu app tương thích với đúng cấu trúc đó.

| Task | Trạng thái |
|---|---|
| Migration version 3: `customers.readingBookCode` + bảng `imported_invoice_records` | DONE |
| `ImportedInvoiceRecordRepository`, `ImportedInvoiceService` | DONE |
| `ExcelImportService`: alias header Mã Khang/Tên Khang/Mã Sổ GCS/ID Hóa đơn/Loại Hóa đơn/Số tiền, fallback meterCode=customerCode, mặc định serviceType=ELECTRIC, `parseVndAmount()` | DONE |
| Cho phép 1 khách lặp nhiều dòng hóa đơn trong file (TD+VC) — không báo trùng sai khi có tín hiệu định dạng điện lực | DONE |
| `importValidRows()` ghi thêm lịch sử hóa đơn ngoại nhập, chống trùng theo `externalInvoiceId` khi import lại | DONE |
| `CustomerDetailScreen` — field "Mã sổ/tuyến (GCS)" + mục "Lịch sử hóa đơn nhập" | DONE |
| Test Jest cho parseVndAmount/classifyRows (định dạng mới, lặp dòng)/importValidRows (ghi lịch sử, chống trùng)/ImportedInvoiceRecordRepository/migration | DONE |
| Test thủ công trên emulator bằng file `.xlsx` hư cấu đúng layout mới: import đúng số khách/số hóa đơn lịch sử, pull DB xác nhận dữ liệu, `CustomerDetailScreen` hiển thị đúng lịch sử hóa đơn | DONE |

## Ngoài phase gốc — In hóa đơn thẳng từ Số tiền đã import

Người dùng phát hiện: Số tiền import từ file điện lực (bảng
`imported_invoice_records`) chưa in được vì không đi qua được luồng Nhập chỉ
số → Tính tiền bình thường (không có chỉ số công tơ).

| Task | Trạng thái |
|---|---|
| `EscPosService.buildImportedInvoiceReceipt()` — in riêng cho hóa đơn ngoại nhập, không bịa chỉ số/kỳ thu | DONE |
| `ImportedInvoiceRecordRepository.findById()`, `ImportedInvoiceService.getById()` | DONE |
| `Printer` route nhận thêm `importedInvoiceRecordId`, `PrinterScreen` rẽ nhánh in theo đúng loại | DONE |
| Nút "In" ở mỗi dòng "Lịch sử hóa đơn nhập" trong `CustomerDetailScreen` | DONE |
| Test Jest cho `buildImportedInvoiceReceipt` (đủ field/thiếu invoiceType/collector null/thiếu phone-address) và `findById()` | DONE |
| Test thủ công trên emulator: bấm "In" từ lịch sử hóa đơn nhập → đúng `PrinterScreen` với đúng mã hóa đơn, nút disable khi chưa kết nối máy in, không crash | DONE |

## Ngoài phase gốc — Đưa "In hóa đơn từ dữ liệu đã import" lên chính diện

Người dùng phản hồi: nút "In" trong lịch sử hóa đơn nhập (thêm ở mục trên)
đúng nhưng quá khuất, trong khi đây là chức năng chính họ dùng hàng ngày.

| Task | Trạng thái |
|---|---|
| `ImportedInvoiceRecordRepository.search()`/`count()` — join tên/mã khách hàng, tìm theo tiền tố, phân trang | DONE |
| `ImportedInvoiceService.list()` | DONE |
| Màn `ImportedInvoiceListScreen` — danh sách phẳng toàn bộ hóa đơn cần in, bấm 1 dòng là vào thẳng máy in, không cần qua khách hàng | DONE |
| Route `ImportedInvoiceList` trong `AppNavigator` | DONE |
| Nút "Hóa đơn cần in" lên đầu "Truy cập nhanh" ở `HomeScreen` | DONE |
| Test Jest cho `search()`/`count()` (join đúng, tìm theo tên/mã, phân trang) | DONE |
| Test thủ công trên emulator (1015 hóa đơn thật): từ Trang chủ → "Hóa đơn cần in" → tìm → bấm 1 dòng → vào thẳng đúng hóa đơn ở Máy in, không crash | DONE |

## Phase 9 — Integration Test

BỎ QUA — theo yêu cầu người dùng ("bỏ qua phase 9 làm phase 10 giúp tôi"),
không phải do sự cố kỹ thuật.

## Phase 10 — APK Release

| Task | Trạng thái |
|---|---|
| Tạo keystore phát hành thật (`android/app/meterbill-release.keystore`, PKCS12, RSA 2048, hạn ~27 năm) | DONE |
| `android/keystore.properties` (gitignored, chứa mật khẩu thật) + `keystore.properties.example` (commit, giá trị giả) | DONE |
| `android/app/build.gradle` — `signingConfigs.release` đọc từ `keystore.properties`, `assembleRelease` báo lỗi rõ ràng nếu thiếu file (không âm thầm rơi về ký bằng debug key) | DONE |
| Đồng bộ `package.json` version → `1.0.0` (bản phát hành đầu tiên) | DONE |
| Build `./gradlew assembleRelease` thành công | DONE |
| `apksigner verify` xác nhận APK ký đúng bằng key phát hành mới (không phải debug key) | DONE |
| Test thủ công trên emulator: gỡ bản debug cũ, cài APK release, xác nhận `debuggable=false` (run-as bị chặn), luồng Bootstrap → tạo tài khoản → thêm khách hàng → màn Máy in đều hoạt động, không crash | DONE |
| Test in giấy thật, cài lên máy nhân viên thật ngoài hiện trường | CẦN NGƯỜI DÙNG TỰ XÁC NHẬN — không có phần cứng/thiết bị thật trong môi trường build |
