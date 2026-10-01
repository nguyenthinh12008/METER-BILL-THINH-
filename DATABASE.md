# DATABASE.md

Database: SQLite (local, offline-first), qua thư viện `@op-engineering/op-sqlite`
(TurboModule JSI, tương thích New Architecture — xem lý do chọn trong PROGRESS.md
Phase 2). Đã implement từ Phase 2: `src/database/database.ts` (kết nối),
`src/database/migrations.ts` + `migrations.schema.ts` (migration có version, chạy
qua `PRAGMA user_version`), 5 Repository trong `src/repositories/`.

## Bảng: customers

| Field | Kiểu | Ghi chú |
|---|---|---|
| id | INTEGER PK | autoincrement |
| customerCode | TEXT | unique, index |
| fullName | TEXT | index |
| address | TEXT | |
| phone | TEXT | |
| meterCode | TEXT | index |
| serviceType | TEXT | ví dụ: ELECTRIC, WATER |
| readingBookCode | TEXT, nullable | "Mã Sổ GCS" — mã sổ ghi chỉ số/tuyến thu, chỉ có với khách import từ file export điện lực (thêm ở migration version 3) |
| createdAt | TEXT | ISO datetime |
| updatedAt | TEXT | ISO datetime |

## Bảng: meter_readings

| Field | Kiểu | Ghi chú |
|---|---|---|
| id | INTEGER PK | autoincrement |
| customerId | INTEGER | FK → customers.id |
| period | TEXT | ví dụ "08/2026", index |
| oldReading | REAL | |
| newReading | REAL | |
| consumption | REAL | = newReading - oldReading |
| createdAt | TEXT | ISO datetime |

Ràng buộc nghiệp vụ: `(customerId, period)` unique — không cho phép nhập trùng kỳ.

## Bảng: invoices

| Field | Kiểu | Ghi chú |
|---|---|---|
| id | INTEGER PK | autoincrement |
| invoiceCode | TEXT | unique, index — ví dụ HD000001 |
| customerId | INTEGER | FK → customers.id |
| period | TEXT | index — nhãn kỳ, ví dụ "08/2026" |
| periodFrom | TEXT | ISO date — ngày bắt đầu kỳ thu, in trên hóa đơn |
| periodTo | TEXT | ISO date — ngày kết thúc kỳ thu, in trên hóa đơn |
| oldReading | REAL | |
| newReading | REAL | |
| consumption | REAL | |
| subtotal | REAL | tiền điện trước thuế |
| tax | REAL | |
| serviceFee | REAL, default 0 | phí dịch vụ/phí đi thu — in tách riêng trên hóa đơn |
| total | REAL | = subtotal + tax + serviceFee |
| createdAt | TEXT | ISO datetime |
| printedAt | TEXT, nullable | set khi in thành công — dòng "Thời gian" trên hóa đơn |
| printStatus | TEXT | NOT_PRINTED / PRINTED / PRINT_FAILED |
| collectedByUserId | INTEGER, nullable | FK → users.id — nhân viên đã thu tiền. NULL với hóa đơn tạo trước khi có đăng nhập (thêm ở migration version 2) |

Unique constraint của `invoiceCode` phải ở database, không chỉ kiểm tra ở UI.
`periodFrom`/`periodTo`/`serviceFee`/`printedAt` được thêm ở Phase 2 để có đủ dữ
liệu in hóa đơn đúng như mẫu thực tế (xem mapping trong ARCHITECTURE.md).

## Bảng: tariffs

| Field | Kiểu | Ghi chú |
|---|---|---|
| id | INTEGER PK | autoincrement |
| serviceType | TEXT | ELECTRIC / WATER... |
| fromValue | REAL | bậc thang, cận dưới |
| toValue | REAL | bậc thang, cận trên (null = không giới hạn) |
| price | REAL | đơn giá cho bậc này |

## Bảng: app_settings

Key-value, cấu hình đơn vị điện lực / nhân viên thu tiền — in trên mọi hóa đơn
(xem mapping trong ARCHITECTURE.md). Không phải dữ liệu khách hàng hay hóa đơn,
là cấu hình singleton của app.

| Field | Kiểu | Ghi chú |
|---|---|---|
| key | TEXT PK | companyName / hotline / collectorName / collectorPhone / bankAccountNumber / bankName |
| value | TEXT | mặc định rỗng, seed sẵn 6 dòng ở Phase 2 |

`collectorName`/`collectorPhone` không còn được đọc khi in kể từ khi có đăng
nhập nhiều tài khoản (2 dòng đó lấy trực tiếp từ `users` qua
`invoices.collectedByUserId`) — 2 key vẫn còn tồn tại trong bảng (key-value
store, không cần migration để xoá key thừa) nhưng không có UI chỉnh sửa nữa.

## Bảng: users

Nhiều tài khoản đăng nhập, dùng gắn `collectedByUserId` lên hóa đơn để biết
nhân viên nào đã thu tiền. Thêm ở migration version 2.

| Field | Kiểu | Ghi chú |
|---|---|---|
| id | INTEGER PK | autoincrement |
| username | TEXT | unique, index |
| fullName | TEXT | |
| phone | TEXT | |
| passwordHash | TEXT | băm SHA-256 lặp ~10.000 vòng (không phải bcrypt/Argon2 — xem lý do trong PROGRESS.md) |
| passwordSalt | TEXT | sinh bằng `Math.random()+Date.now()`, không cần bí mật/CSPRNG |
| isActive | INTEGER (0/1) | soft-delete — tài khoản bị "xoá" chỉ set về 0, không xoá hẳn để giữ lịch sử gán trên hóa đơn cũ |
| createdAt | TEXT | ISO datetime |

## Bảng: imported_invoice_records

Lịch sử hóa đơn ngoại nhập từ file export điện lực dạng Mã Sổ GCS/Mã Khang/Tên
Khang/ID Hóa đơn/Loại Hóa đơn/Số tiền. **Tách khỏi bảng `invoices`** — bảng đó
bắt buộc `oldReading`/`newReading`/`consumption`/`period` NOT NULL (luôn được
tính ra từ luồng Nhập chỉ số → Tính tiền của app), trong khi dữ liệu ngoại
nhập chỉ có tổng tiền + mã hóa đơn gốc từ hệ thống cũ, không có chỉ số công
tơ — ép vào `invoices` sẽ phải fake giá trị, sai bản chất dữ liệu. Thêm ở
migration version 3.

| Field | Kiểu | Ghi chú |
|---|---|---|
| id | INTEGER PK | autoincrement |
| customerId | INTEGER | FK → customers.id |
| externalInvoiceId | TEXT | "ID Hóa đơn" từ file gốc, index (không unique — không chắc hệ thống nguồn đảm bảo unique toàn cục) |
| invoiceType | TEXT, nullable | "Loại Hóa đơn" từ file gốc (ví dụ TD/VC), lưu nguyên chuỗi, không ép enum |
| amount | REAL | "Số tiền" — đã parse từ định dạng Việt Nam (`"1.234.567"`) qua `parseVndAmount()` |
| importedAt | TEXT | ISO datetime lúc import |

Import lại cùng file không tạo trùng — `ExcelImportService.importValidRows()`
bỏ qua dòng nếu `externalInvoiceId` đã tồn tại trong bảng.

## Quan hệ

```
meter_readings.customerId              → customers.id
invoices.customerId                    → customers.id
invoices.collectedByUserId             → users.id (nullable)
imported_invoice_records.customerId    → customers.id
```

Dùng `FOREIGN KEY` thật trong SQLite (`PRAGMA foreign_keys = ON`).

## Index bắt buộc

- `customers.customerCode`
- `customers.fullName`
- `customers.meterCode`
- `invoices.invoiceCode`
- `invoices.period`, `meter_readings.period`

Lý do: ứng dụng phải hỗ trợ ~10.000 khách hàng — mọi tìm kiếm/tra cứu phải qua
index, không được load toàn bộ bảng vào React state rồi lọc phía client.
`CustomerRepository.search()` dùng `LIKE 'tiền_tố%'` (prefix) để giữ được index,
không dùng `%chuỗi%` (infix — sẽ quét toàn bảng).

## Migration

Không tạo schema kiểu hard-code một lần. Mỗi thay đổi schema (thêm bảng/cột) là
một migration mới, có version, chạy tuần tự và không phá dữ liệu cũ.
`src/database/migrations.schema.ts` chứa SQL thuần theo version (version 1 =
customers/meter_readings/invoices/tariffs/app_settings từ Phase 2; version 2 =
bảng `users` + cột `invoices.collectedByUserId`; version 3 = cột
`customers.readingBookCode` + bảng `imported_invoice_records`, xem
PROGRESS.md); `src/database/migrations.ts` (`runMigrations()`) đọc
`PRAGMA user_version`, áp các migration còn thiếu trong transaction, rồi cập nhật
`user_version`. Chạy một lần ở `index.js` lúc app khởi động, trước khi
`AppRegistry.registerComponent`.

## Chuẩn bị cho sync (chưa implement)

Các bảng có thể mở rộng thêm cột `syncStatus` (`PENDING` / `SYNCED` / `FAILED`)
khi có Backend thật. Không tạo cột này trước khi cần — tránh field chết không
ai dùng trong MVP.
