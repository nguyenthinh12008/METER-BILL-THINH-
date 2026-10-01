# MeterBill

Ứng dụng Android quản lý khách hàng, nhập chỉ số điện/nước, tính tiền, tạo hóa đơn
và in hóa đơn qua máy in nhiệt Bluetooth (ESC/POS).

- Platform: Android
- Framework: React Native (CLI, bare workflow) + TypeScript
- Database: SQLite (local, offline-first)
- Printer: Bluetooth Thermal Printer, giao thức ESC/POS
- Backend: Chưa triển khai trong MVP (xem [ARCHITECTURE.md](ARCHITECTURE.md))

## Luồng nghiệp vụ chính

```
IMPORT EXCEL → CHỌN KHÁCH HÀNG → NHẬP CHỈ SỐ → TÍNH LƯỢNG SỬ DỤNG
  → TÍNH TIỀN → TẠO HÓA ĐƠN → LƯU SQLITE
  → KẾT NỐI BLUETOOTH → ESC/POS → IN HÓA ĐƠN
```

## Tài liệu dự án

| File | Nội dung |
|---|---|
| [TASKS.md](TASKS.md) | Danh sách task theo trạng thái TODO / IN PROGRESS / REVIEW / DONE / BLOCKED |
| [PROGRESS.md](PROGRESS.md) | Nhật ký tiến độ theo từng Phase |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Kiến trúc: Screen → Service → Repository → SQLite |
| [DATABASE.md](DATABASE.md) | Schema SQLite, migration, quan hệ bảng |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Git workflow, commit convention, quy trình phát triển |

## Yêu cầu môi trường

- Node.js >= 22.11
- JDK 17
- Android Studio + Android SDK (platform 34+), 1 AVD hoặc thiết bị Android thật
- `ANDROID_HOME` trỏ tới Android SDK (ví dụ trong `android/local.properties` qua `sdk.dir`, đã có sẵn cho máy dev hiện tại — không commit file này)

## Chạy dự án (development)

```sh
npm install

# Terminal 1: chạy Metro bundler
npm start

# Terminal 2: build & cài lên emulator/thiết bị Android
npm run android
```

## Kiểm tra chất lượng code

```sh
npx tsc --noEmit   # TypeScript check
npx eslint .       # Lint
npx jest           # Unit test
```

## Cấu trúc thư mục

Xem chi tiết trong [ARCHITECTURE.md](ARCHITECTURE.md). Tóm tắt:

```
src/
├── screens/       # Màn hình (UI only, gọi Service)
├── components/     # UI component dùng chung
├── services/       # Business logic (Billing, Excel import, Bluetooth, ESC/POS...)
├── repositories/    # Truy cập dữ liệu (SQLite, sau này có thể thêm API)
├── database/       # Kết nối SQLite, migration, seed
├── models/         # Kiểu dữ liệu domain (Customer, Invoice, MeterReading, Tariff)
├── navigation/      # React Navigation stack
├── utils/          # Hàm tiện ích (validate, format, date)
└── constants/       # Hằng số dùng chung
```

Nguyên tắc bắt buộc: **Screen không được gọi thẳng SQLite hoặc Bluetooth library.**
Luôn đi qua Service → Repository.

## Trạng thái hiện tại

Đã hoàn thành Phase 1–8 (toàn bộ luồng nghiệp vụ chính: khách hàng, import
Excel, nhập chỉ số, tính tiền, tạo hóa đơn, kết nối Bluetooth, in ESC/POS) +
Phase 10 (đóng gói APK release, ký bằng key phát hành thật). Việc in ra giấy
thật trên máy in nhiệt Bluetooth thật **chưa được xác nhận** — môi trường phát
triển không có phần cứng để test, cần tự xác nhận trên thiết bị + máy in thật.
Phase 9 (Integration Test) được **bỏ qua theo yêu cầu người dùng**, không phải
do sự cố. Xem [TASKS.md](TASKS.md) và [PROGRESS.md](PROGRESS.md) để biết
chi tiết.
