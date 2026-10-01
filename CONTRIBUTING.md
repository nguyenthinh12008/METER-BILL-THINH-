# CONTRIBUTING.md

## Branch

- `main` — chỉ chứa code ổn định.
- `develop` — nhánh tích hợp, tất cả feature merge vào đây trước.
- `feature/<ten>` — mỗi Phase/hạng mục một nhánh, ví dụ:
  `feature/database`, `feature/customer`, `feature/excel-import`,
  `feature/meter-reading`, `feature/billing`, `feature/invoice`,
  `feature/bluetooth`, `feature/escpos`, `feature/integration-test`.

Không code trực tiếp trên `main`.

## Workflow

```
feature branch → code → test → commit → push → Pull Request → review → merge vào develop
```

`develop` merge vào `main` khi đã ổn định (ví dụ sau khi hoàn thành 1 Phase và
test đạt yêu cầu).

## Commit convention

```
feat:     tính năng mới
fix:      sửa lỗi
refactor: tái cấu trúc, không đổi hành vi
test:     thêm/sửa test
docs:     tài liệu
chore:    việc vặt (cấu hình, dependency...)
```

Ví dụ: `feat: add sqlite database`, `fix: validate meter reading`,
`test: add billing tests`, `docs: update architecture`.

## Trước khi code

1. Đọc README.md, TASKS.md, PROGRESS.md.
2. Kiểm tra đang ở branch nào.
3. Xác định Phase hiện tại.

## Sau khi code

1. `npx tsc --noEmit`
2. `npx eslint .`
3. `npx jest`
4. Build/chạy thử trên Android (emulator hoặc thiết bị thật khi liên quan đến
   Bluetooth/máy in).
5. Cập nhật TASKS.md và PROGRESS.md.
6. Commit.

Không đánh dấu task `DONE` trong TASKS.md nếu chưa test.

## Không được tự ý

- Thêm Backend, Firebase, cloud database.
- Thêm chức năng ngoài phạm vi MVP (xem README.md).
- Đổi kiến trúc (Screen → Service → Repository → Database) mà không giải thích.
- Cài package không cần thiết hoặc đã deprecated — kiểm tra compatibility với
  version React Native hiện tại trước khi cài.
- Bỏ qua lỗi TypeScript hoặc warning quan trọng.
- Commit `node_modules`, secrets, keystore thật.
