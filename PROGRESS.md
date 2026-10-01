# PROGRESS.md

## Ngoài phase gốc — Đưa "In hóa đơn từ dữ liệu đã import" lên chính diện

**Ngày:** 2026-08-25

**Bối cảnh:** Sau khi có nút "In" trong "Lịch sử hóa đơn nhập" (mục ngay
dưới), người dùng phản hồi: đây mới là chức năng chính họ cần dùng hàng ngày
(in biên nhận từ dữ liệu đã import, không phải luồng Nhập chỉ số → Tính tiền
điện — luồng đó để sau), nhưng nút lại quá khuất (phải mở từng khách hàng,
cuộn xuống cuối mới thấy). Yêu cầu: đưa chức năng này lên **chính diện, dễ
thấy hơn hẳn**.

**Đã làm:**
- `ImportedInvoiceRecordRepository.search()`/`count()` — join
  `imported_invoice_records` với `customers` để hiển thị tên/mã khách hàng,
  tìm theo tiền tố (giữ index, đúng nguyên tắc dự án như
  `CustomerRepository.search()`), phân trang.
- `ImportedInvoiceService.list()` — cùng chữ ký với `CustomerService.list()`.
- Màn mới `ImportedInvoiceListScreen.tsx` — sao chép cấu trúc
  `CustomerListScreen.tsx` (search debounce, `FlatList` phân trang 30/trang):
  danh sách phẳng TOÀN BỘ hóa đơn cần in, mỗi dòng hiện tên KH + mã KH + mã
  hóa đơn/loại + số tiền; **bấm cả dòng là vào thẳng `PrinterScreen`**, không
  cần mở khách hàng rồi tìm nút in nữa.
- Route `ImportedInvoiceList` (`AppNavigator`), nút "Hóa đơn cần in" đặt **lên
  đầu** "Truy cập nhanh" ở `HomeScreen` (trước cả "Khách hàng").
- Giữ nguyên toàn bộ luồng Nhập chỉ số → Tính tiền điện → Tạo hóa đơn — không
  xoá, chỉ không còn là lối vào nổi bật nhất trên trang chủ.

**Test:**
- `npx tsc --noEmit`, `npx eslint .` → không lỗi.
- `npx jest` → 148/148 test pass (22 test suite) — thêm test cho
  `search()`/`count()` (join đúng tên/mã, tìm theo tiền tố tên/mã khách hàng,
  phân trang qua limit/offset).
- Test thủ công trên emulator, dùng đúng dữ liệu thật đã import (1015 hóa đơn
  ngoại nhập): Trang chủ hiện "Hóa đơn cần in" ở vị trí đầu tiên → bấm vào →
  danh sách "1015 hóa đơn cần in" hiện đúng tên/mã/số tiền → gõ tìm 1 khách
  (`PB99900000002`) → đúng 2 dòng → bấm 1 dòng → vào thẳng `PrinterScreen`
  đúng "In hóa đơn 9000000003", không qua bước nào khác, không crash xuyên
  suốt.

**Kết quả:** Chức năng in từ dữ liệu đã import giờ là lối vào nổi bật nhất
trên trang chủ, đúng vai trò chức năng chính; luồng nhập chỉ số/tính tiền cũ
vẫn còn nguyên, chỉ lùi lại vị trí phụ.

## Ngoài phase gốc — In hóa đơn thẳng từ Số tiền đã import

**Ngày:** 2026-08-25

**Bối cảnh:** Sau khi có tính năng import dữ liệu điện lực (mục ngay dưới),
người dùng nhận ra Số tiền import chưa in được — vì `imported_invoice_records`
không có chỉ số công tơ/kỳ thu nên không đi qua được luồng Nhập chỉ số → Tính
tiền → Tạo hóa đơn (`invoices`) như bình thường.

**Quyết định kỹ thuật:** Không ép dữ liệu ngoại nhập vào `Invoice`/
`buildInvoiceReceipt()` hiện có (sẽ phải bịa oldReading/newReading/period →
hóa đơn in sai/gây hiểu lầm). Thêm hàm in riêng
`EscPosService.buildImportedInvoiceReceipt()` — dùng chung khung công ty/
khách hàng/người thu với `buildInvoiceReceipt()` nhưng thay 3 dòng chỉ số/kỳ
thu bằng Mã hóa đơn/Loại/Số tiền lấy trực tiếp từ `ImportedInvoiceRecord`.
Người thu lấy từ tài khoản đang đăng nhập tại thời điểm in (không lưu
`collectedByUserId` trên bản ghi ngoại nhập — cố tình giữ phạm vi gọn, chưa
có UI nào cần trạng thái "đã in" cho loại hóa đơn này).

**Đã làm:**
- `EscPosService.buildImportedInvoiceReceipt()`.
- `ImportedInvoiceRecordRepository.findById()`, `ImportedInvoiceService.getById()`.
- `Printer` route (`AppNavigator`) nhận thêm `importedInvoiceRecordId`;
  `PrinterScreen` rẽ nhánh load/in theo đúng loại (`invoice` hoặc
  `importedRecord`), người thu lấy qua `useAuth().currentUser`.
- Nút "In" ở mỗi dòng "Lịch sử hóa đơn nhập" (`CustomerDetailScreen`) →
  `navigation.navigate('Printer', { importedInvoiceRecordId })`.

**Test:**
- `npx tsc --noEmit`, `npx eslint .` → không lỗi.
- `npx jest` → 143/143 test pass (22 test suite) — thêm test cho
  `buildImportedInvoiceReceipt` (đủ field, thiếu invoiceType, collector null,
  khách hàng thiếu phone/address) và `ImportedInvoiceRecordRepository.findById()`.
- **Sự cố hạ tầng khi test thủ công**: sau khi sửa code, nút "In" không hiện
  trên emulator dù `tsc`/bundle Metro đều xác nhận code đã đúng (`curl` bundle
  Metro thấy rõ code mới). Nguyên nhân: tiến trình Metro đã chạy liên tục từ
  hôm trước (từ "Fri03PM"), rất có thể cache Watchman/Haste bị desync sau sự
  kiện thư mục project "biến mất" tạm thời (khả năng do đồng bộ iCloud Desktop)
  giữa phiên làm việc. **Cách xử lý**: kill hẳn tiến trình Metro cũ +
  `watchman watch-del-all` + khởi động lại `react-native start --reset-cache`,
  sau đó force-stop app trên emulator và mở lại (không chỉ reload JS) để lấy
  bundle mới hoàn toàn. **Ghi chú cho lần sau**: nếu sửa code mà hành vi trên
  app không đổi dù `tsc`/test đều xác nhận đúng, nghi ngờ Metro cache trước,
  đặc biệt nếu Metro đã chạy rất lâu hoặc project vừa trải qua sự kiện
  file-system bất thường.
- Test thủ công trên emulator (dữ liệu hư cấu `PB99900000002` từ lần import
  trước, có 2 dòng lịch sử hóa đơn): bấm "In" ở dòng `9000000003 · VC` → đúng
  vào `PrinterScreen` hiện "In hóa đơn 9000000003", nút xám (chưa kết nối
  Bluetooth) đúng thiết kế, không crash. `adb logcat` sạch xuyên suốt.

**Kết quả:** Có thể in hóa đơn thẳng từ Số tiền đã import, không cần nhập chỉ
số công tơ giả.

**Vấn đề còn lại:**
- Chưa có UI hiển thị trạng thái "đã in" cho hóa đơn ngoại nhập (không lưu
  `printedAt`/`printStatus` như `invoices`) — nếu sau này cần, phải thêm cột
  + migration mới.
- Chưa test in giấy thật (cần thiết bị + máy in thật, giống hạn chế đã ghi ở
  Phase 8/10).

## Ngoài phase gốc — Tương thích với file dữ liệu khách hàng thực tế (điện lực)

**Ngày:** 2026-08-24

**Bối cảnh:** Người dùng gửi 1 file PDF export dữ liệu khách hàng thật từ hệ
thống điện lực (hàng nghìn khách hàng) và yêu cầu app tương thích với đúng
cấu trúc cột đó, không bắt định dạng lại theo app. File dùng cột khác hẳn
form Import Excel hiện tại: `Mã Sổ GCS | Mã Khang | Tên Khang | ID Hóa đơn |
Loại Hóa đơn | Số tiền | Số điện thoại` (Mã Khang/Tên Khang gần như chắc chắn
là "Mã/Tên khách hàng" bị cắt chữ khi xuất PDF).

**Ràng buộc tự đặt ra:** file gốc chứa PII thật (tên, SĐT, số tiền) của hàng
nghìn khách hàng thật — toàn bộ code/test/tài liệu chỉ dùng dữ liệu **hư cấu**
mô phỏng đúng cấu trúc cột, không đưa bất kỳ tên/SĐT/mã thật nào từ file vào
repo.

**Quyết định kỹ thuật quan trọng:**

- **Không ép dữ liệu ngoại nhập vào bảng `invoices` hiện có.** Bảng đó bắt
  buộc `oldReading`/`newReading`/`consumption`/`period` NOT NULL — luôn được
  tính từ luồng Nhập chỉ số → Tính tiền của app. Dữ liệu ngoại nhập chỉ có
  tổng tiền + mã hóa đơn gốc từ hệ thống cũ, không có chỉ số công tơ. Tạo bảng
  mới `imported_invoice_records` (migration version 3) — hồ sơ lịch sử thuần,
  không đụng gì tới luồng hóa đơn/in ấn/thu tiền hiện có.
- `Mã Khang` được map vừa làm `customerCode` vừa làm `meterCode` (dữ liệu gốc
  không có 2 mã tách biệt — mỗi khách chỉ có 1 mã). Không có cột "Loại dịch
  vụ" trong file → mặc định `ELECTRIC` khi nhận diện đúng định dạng file điện
  lực (có ít nhất 1 trong các cột Mã Sổ GCS/ID Hóa đơn/Loại Hóa đơn).
- **Phát hiện + sửa 1 lỗi thiết kế qua test thủ công trên emulator**: dữ liệu
  thật có 1 khách lặp lại nhiều dòng (nhiều kỳ hóa đơn, hoặc TD+VC cùng lúc —
  ví dụ 1 khách xuất hiện 2 dòng khác `ID Hóa đơn`/`Loại Hóa đơn`/`Số tiền`).
  Logic "báo trùng Mã khách hàng trong file" (viết ban đầu cho template khách
  hàng thuần, nơi 1 dòng = 1 khách) đã sai khi áp cho định dạng mới — dòng thứ
  2 của cùng 1 khách bị đánh dấu lỗi và **mất luôn dữ liệu hóa đơn của dòng
  đó**. Sửa: chỉ báo trùng trong file khi KHÔNG phải định dạng điện lực; với
  định dạng điện lực, mỗi dòng lặp vẫn hợp lệ và được ghi hóa đơn lịch sử
  riêng (việc gộp/khớp `customerCode` để không tạo trùng khách hàng vẫn xử lý
  đúng ở tầng `CustomerRepository.createMany()`).

**Đã làm:**

- Migration version 3: `customers.readingBookCode` (nullable, "Mã Sổ GCS") +
  bảng `imported_invoice_records` (customerId FK, externalInvoiceId, invoiceType,
  amount, importedAt).
- `src/repositories/ImportedInvoiceRecordRepository.ts`,
  `src/services/ImportedInvoiceService.ts`.
- `ExcelImportService.ts`: mở rộng `HEADER_MAP` (Mã Khang/Mã KH → customerCode,
  Tên Khang/Tên KH → fullName, Mã Sổ GCS → readingBookCode), map riêng
  `EXTERNAL_INVOICE_HEADER_MAP` (ID Hóa đơn/Loại Hóa đơn/Số tiền), fallback
  `meterCode = customerCode` khi thiếu cột riêng, `parseVndAmount()` (chấp
  nhận cả number Excel thật lẫn chuỗi `"1.234.567"`), `importValidRows()` ghi
  thêm `imported_invoice_records` sau khi tạo/cập nhật khách hàng, chống
  trùng theo `externalInvoiceId` khi lỡ import lại cùng file.
- `CustomerDetailScreen`: field "Mã sổ/tuyến (GCS)", mục "Lịch sử hóa đơn
  nhập" (read-only, ẩn khi rỗng) qua `ImportedInvoiceService`.
- `ImportCustomerScreen`: hint mô tả thêm bộ cột mới (tuỳ chọn), hiển thị số
  hóa đơn lịch sử đã ghi ở màn kết quả.

**Test:**

- `npx tsc --noEmit`, `npx eslint .` → không lỗi.
- `npx jest` → 137/137 test pass (22 test suite) — `parseVndAmount` (number,
  chuỗi Việt Nam, chuỗi rác), `classifyRows` (định dạng mới, fallback
  meterCode/serviceType, 1 khách lặp nhiều dòng không báo trùng),
  `importValidRows` (ghi lịch sử hóa đơn đúng customerId, chống trùng
  externalInvoiceId khi import lại), `ImportedInvoiceRecordRepository`
  (create/listByCustomerId/existsByExternalInvoiceId), `CustomerRepository`
  (readingBookCode qua create/update/createMany, giữ nguyên khi input rỗng),
  migration (bảng mới + cột mới).
- Test thủ công trên emulator (build lại debug — máy đang cài bản release ký
  khác key từ Phase 10, phải `adb uninstall` trước): tạo file `.xlsx` hư cấu
  3 dòng (2 khách, 1 khách lặp 2 dòng TD+VC — mô phỏng đúng cấu trúc dữ liệu
  thật, tên/SĐT/mã hoàn toàn bịa) → import qua `ImportCustomerScreen` → đúng
  "3 dòng hợp lệ · 0 dòng lỗi" (sau khi sửa lỗi trùng dòng) → xác nhận import
  → "Đã tạo 2 khách hàng. Đã ghi 3 hóa đơn lịch sử. Bỏ qua 1 mã đã tồn tại"
  (đúng — khách lặp dòng không tạo trùng bản ghi khách, nhưng cả 2 dòng hóa
  đơn đều được ghi). Pull DB xác nhận trực tiếp: `readingBookCode` đúng,
  `imported_invoice_records` có đủ 3 dòng đúng `customerId`/`externalInvoiceId`/
  `invoiceType`/`amount` (số tiền parse đúng từ chuỗi `"1.234.567"` →
  `1234567`). Mở `CustomerDetailScreen` của khách có 2 hóa đơn — mục "Lịch sử
  hóa đơn nhập" hiển thị đúng cả 2 dòng, đúng `formatCurrency`. `adb logcat`
  sạch xuyên suốt.

**Kết quả:** App import đúng file dữ liệu khách hàng thật theo cấu trúc người
dùng cung cấp, không cần định dạng lại; giữ tương thích ngược hoàn toàn với
template Import Excel cũ (test cũ vẫn pass nguyên).

**Vấn đề còn lại:**

- Chưa test với file `.xlsx` thật (chỉ test bằng file hư cấu tự tạo đúng
  layout) — nếu file thật của người dùng có sai khác nhỏ về tên cột/định dạng
  số, cần thêm alias hoặc điều chỉnh `parseVndAmount()`.
- "Lịch sử hóa đơn nhập" hiện chỉ hiển thị read-only trên `CustomerDetailScreen`
  — chưa có báo cáo tổng hợp theo `readingBookCode` (tuyến thu) hay đối chiếu
  với hóa đơn app tự tạo.

## Phase 10 — APK Release

**Ngày:** 2026-08-24

**Bối cảnh:** Người dùng yêu cầu bỏ qua Phase 9 (Integration Test) và làm
Phase 10 luôn. App trước đó chưa từng build bằng key phát hành thật — build
type `release` trong `android/app/build.gradle` vẫn trỏ `signingConfig` về
`signingConfigs.debug` (key debug công khai chuẩn của Android, không dùng để
phát hành). Mục tiêu: tạo ra một APK ký bằng key phát hành thật, cài trực
tiếp lên máy nhân viên thu tiền (sideload, không qua Play Store).

**Quyết định kỹ thuật:**

- **Không hardcode mật khẩu keystore vào file có commit git.** Passwords nằm
  trong `android/keystore.properties` (thêm vào `.gitignore`), `build.gradle`
  đọc qua `Properties()`/`FileInputStream` lúc build. Kèm
  `android/keystore.properties.example` (commit, giá trị giả) làm template
  cho máy khác. Nếu thiếu `keystore.properties`, `assembleRelease` báo lỗi rõ
  ràng (`GradleException`) thay vì âm thầm rơi về ký bằng debug key — tránh
  nguy cơ tưởng nhầm đã phát hành thật trong khi vẫn ký debug.
- Keystore PKCS12 (`android/app/meterbill-release.keystore`, đã nằm trong
  `.gitignore` sẵn qua rule `*.keystore` có từ Phase 1), RSA 2048, hạn 10.000
  ngày (~27 năm). PKCS12 không hỗ trợ store password khác key password (thử
  `keytool` báo warning và tự dùng chung 1 mật khẩu) — không phải lỗi, là giới
  hạn định dạng.
- **Không bật ProGuard/R8** (`enableProguardInReleaseBuilds` giữ `false`).
  Lý do: `react-native-bluetooth-classic` là module cầu nối kiểu cũ (rủi ro đã
  ghi nhận từ Phase 7), minify/obfuscate có thể phá reflection nội bộ của thư
  viện native mà không có cách kiểm chứng đầy đủ trong phạm vi phase này; APK
  không lên Play Store nên không bị ép giới hạn dung lượng khắt khe. Đây là
  tối ưu để dành cho tương lai, không phải bỏ sót.
- Giữ nguyên `reactNativeArchitectures` (4 kiến trúc) → build 1 APK
  "universal" duy nhất thay vì APK theo từng kiến trúc CPU — dễ gửi cho nhân
  viên (chỉ 1 file), đổi lại dung lượng lớn hơn, chấp nhận được vì đây là file
  cài 1 lần, không qua kho ứng dụng.
- `versionCode`/`versionName` giữ `1`/`"1.0"` (bản phát hành đầu tiên). Đồng
  bộ `package.json` `"version"` từ `"0.0.1"` sang `"1.0.0"` cho nhất quán.

**Đã làm:**

- Tạo keystore phát hành bằng `keytool -genkeypair` (PKCS12, RSA 2048, alias
  `meterbill-release`, mật khẩu sinh ngẫu nhiên mạnh bằng `openssl rand`).
- `android/keystore.properties` (gitignored) + `.example` (commit).
- `android/app/build.gradle`: thêm `signingConfigs.release`, đổi
  `buildTypes.release.signingConfig` sang key mới, chặn build nếu thiếu
  `keystore.properties`.
- `./gradlew clean assembleRelease` → build thành công (~9 phút), ra
  `android/app/build/outputs/apk/release/app-release.apk`, **68MB**.

**Test:**

- `npx tsc --noEmit`, `npx eslint .`, `npx jest` → sạch, 121/121 test pass
  (không đổi code JS ở phase này nên không kỳ vọng gì thay đổi).
- `apksigner verify -v` → `Verifies` (exit code 0), ký bằng v2 scheme, chữ ký
  khớp đúng certificate của keystore phát hành mới (không phải debug key).
- Test thủ công trên emulator: `adb uninstall com.meterbill` (bắt buộc — 
  Android chặn cài đè APK ký khác key lên app cùng package name, xoá DB debug
  cũ chỉ chứa dữ liệu test/seed) → `adb install app-release.apk` → mở app,
  `adb logcat` xác nhận "ReactNativeJS: Running MeterBill", không có
  `FATAL`/`AndroidRuntime` exception xuyên suốt toàn bộ phiên test. Xác nhận
  đúng vào `BootstrapScreen` (DB rỗng đúng như một máy mới cài lần đầu) → tạo
  tài khoản thành công → vào `HomeScreen` đã đăng nhập, số liệu 0 đúng thực
  tế → `CustomerListScreen` → thêm 1 khách hàng qua `CustomerDetailScreen` →
  lưu thành công, quay lại danh sách hiện đúng bản ghi vừa tạo (xác nhận
  đường ghi SQLite qua `op-sqlite` JSI hoạt động đúng trong bản release, không
  chỉ bản debug) → `AccountsScreen` hiện đúng tài khoản hiện tại (đánh dấu
  "(bạn)") → `PrinterScreen` render đúng form 4 field, xin quyền Bluetooth
  đúng như thiết kế.
- **Không pull được DB qua `adb shell run-as`** ở bản release — báo
  `run-as: package not debuggable`. Đây là xác nhận đúng, không phải lỗi:
  bản release phải có `debuggable=false`; nếu `run-as` mà thành công thì mới
  là dấu hiệu cấu hình sai. Vì vậy bước xác nhận dữ liệu ở bản release dùng
  đường vòng qua UI (ghi rồi tải lại danh sách từ DB) thay vì pull file `.db`
  trực tiếp như các phase trước (chỉ áp dụng được cho bản debug).

**Kết quả:** Có APK ký bằng key phát hành thật, build/cài/chạy thành công,
không crash qua các luồng chính đã test. Sẵn sàng để cài thử trên thiết bị
thật.

**Vấn đề còn lại:**

- **Người dùng phải tự sao lưu file `android/app/meterbill-release.keystore`
  + mật khẩu trong `android/keystore.properties` ra ngoài máy này** (password
  manager, USB, ổ đĩa riêng...) — đây là danh tính ký vĩnh viễn của app, mất
  file này hoặc quên mật khẩu thì không thể phát hành bản cập nhật nào ký
  cùng danh tính cũ nữa (máy đã cài bản cũ sẽ phải gỡ cài đặt rồi cài lại từ
  đầu). Không có nơi nào trong repo/hệ thống này giữ hộ được lâu dài.
- ProGuard/R8 chưa bật — APK 68MB, có thể giảm dung lượng + tăng bảo mật
  (obfuscate code) sau này nếu cần, với điều kiện test kỹ lại tương tác với
  `react-native-bluetooth-classic`.
- Build 1 APK universal (4 kiến trúc gộp chung) — nếu cần giảm dung lượng
  từng máy, có thể tách `splits.abi` để sinh 4 APK riêng theo kiến trúc CPU
  sau này (đánh đổi: phức tạp hơn khi phân phối cho nhân viên không rành kỹ
  thuật).
- Test in giấy thật + cài lên máy nhân viên ngoài hiện trường vẫn cần người
  dùng tự xác nhận (không có phần cứng/thiết bị thật trong môi trường build).
- Phase 9 (Integration Test) bị bỏ qua theo yêu cầu, chưa có bộ test tích hợp
  end-to-end tự động nào chạy toàn luồng — verification hiện tại vẫn dựa vào
  test thủ công trên emulator theo từng phase.

## Ngoài phase gốc — Đăng nhập nhiều tài khoản, phân biệt "ai thu tiền"

**Ngày:** 2026-08-23

**Bối cảnh:** App trước đó không có đăng nhập, mọi hóa đơn in tên người thu
tĩnh từ `app_settings.collectorName` (nhập tay 1 lần). Người dùng muốn nhiều
tài khoản để mỗi hóa đơn ghi đúng nhân viên đã thu. Đã chốt với người dùng:
đăng nhập bằng tên đăng nhập + mật khẩu; tài khoản đầu tiên tự tạo khi app
chưa có tài khoản nào (bootstrap), sau đó chỉ người đã đăng nhập mới tạo thêm
được tài khoản khác (không tự đăng ký công khai); field trống khi cập nhật
giữ nguyên giá trị cũ (áp dụng nhất quán với nguyên tắc đã chọn ở tính năng
update-on-match của Import Excel).

**Quyết định kỹ thuật quan trọng — băm mật khẩu:** đã thử `bcryptjs` và
`crypto-js` trước — cả 2 đều có `require('crypto')`/`import "crypto"` tĩnh
trong file chính (kể cả bản ESM), Metro báo lỗi "Unable to resolve module
crypto" vì RN không có module `crypto` của Node và không tự polyfill. Đổi
sang `js-sha256`: tải gói về kiểm tra trực tiếp file `build/sha256.cjs` (khai
báo qua field `"browser"` dạng chuỗi đơn giản mà Metro có hỗ trợ resolve) —
xác nhận không có bất kỳ `require()` nào, thuần tính toán. Băm mật khẩu = lặp
SHA-256 ~10.000 vòng (tự làm key-stretching) — **không mạnh bằng bcrypt/Argon2
thật**, chấp nhận được vì app offline 1 thiết bị, không có endpoint đăng nhập
qua mạng để bị brute-force từ xa. Đây là đánh đổi có chủ đích, không phải sơ
suất — nếu sau này app có backend/đồng bộ server thật, nên thay bằng thư viện
băm chuẩn (bcrypt/Argon2) chạy phía server.

**Đã làm:**

- Migration **version 2** (lần đầu tiên thực sự dùng cơ chế nhiều version của
  `migrations.schema.ts` kể từ khi xây ở Phase 2): bảng `users`
  (username/fullName/phone/passwordHash/passwordSalt/isActive/createdAt) +
  `invoices.collectedByUserId` (nullable, `REFERENCES users(id)`).
- `src/utils/passwordHash.ts`: `hashNewPassword()`/`verifyPassword()` — salt
  sinh bằng `Math.random()+Date.now()` (không cần CSPRNG thật vì salt không
  cần bí mật, chỉ cần khác nhau giữa các user).
- `src/repositories/UserRepository.ts`, `src/services/AuthService.ts`:
  register (validate username không trùng/không rỗng, mật khẩu ≥ 6 ký tự),
  login (thông báo lỗi CHUNG "Sai tên đăng nhập hoặc mật khẩu" cho cả sai
  username lẫn sai mật khẩu — không lộ username nào tồn tại), deactivate
  (soft-delete, giữ lịch sử gán trên hóa đơn cũ).
- `src/contexts/AuthContext.tsx` (`AuthProvider`/`useAuth()`) — session chỉ
  trong bộ nhớ (mất khi tắt hẳn app, không làm "remember me" persist ở lần
  này để giữ phạm vi gọn).
- `src/components/RegisterForm.tsx` dùng chung cho `BootstrapScreen` (tạo tài
  khoản đầu tiên, tự đăng nhập) và `AddAccountScreen` (thêm đồng nghiệp, giữ
  nguyên phiên đăng nhập hiện tại) — phân biệt qua prop `onSuccess`.
  `LoginScreen`, `AccountsScreen` (danh sách + vô hiệu hoá, không tự khoá
  chính mình).
- `AppNavigator` tách 2 stack — chưa đăng nhập: `Bootstrap` (nếu chưa có tài
  khoản nào) hoặc `Login`; đã đăng nhập: stack chính như cũ + thêm
  `Accounts`/`AddAccount`. `App.tsx` bọc `AuthProvider`.
- **Nối vào luồng hóa đơn có sẵn**: `InvoiceService.create()` nhận
  `collectedByUserId` bắt buộc; `InvoicePreviewScreen` lấy từ
  `useAuth().currentUser.id`. `EscPosService.buildInvoiceReceipt()` nhận thêm
  `collector: User | null` — 2 dòng in "tên nhân viên thu" và "SĐT/Zalo" đổi
  nguồn từ `app_settings.collectorName/collectorPhone` (tĩnh) sang
  `User.fullName/phone` (theo từng hóa đơn); `collector = null` với hóa đơn cũ
  → bỏ 2 dòng, không lỗi. `PrinterScreen` bỏ 2 field đó khỏi form cấu hình
  (còn 4 field: companyName/hotline/bankAccountNumber/bankName — 2 key cũ vẫn
  còn trong `app_settings` nhưng không dùng nữa, không cần migration xoá vì
  đây là key-value store). `InvoiceDetailScreen` thêm dòng "Người thu".
  `HomeScreen` thêm header "Xin chào, {tên}" + Đăng xuất, nút "Quản lý tài
  khoản", mỗi hóa đơn gần đây hiện thêm tên người thu.

**Test:**

- `npx tsc --noEmit`, `npx eslint .` → không lỗi.
- `npx jest` → 121/121 test pass (21 test suite) — `passwordHash` (roundtrip,
  salt khác nhau, deterministic), `UserRepository` (CRUD, unique username,
  deactivate không xoá bản ghi), `AuthService` (register trùng/mật khẩu
  ngắn/thiếu field, login đúng/sai đều 1 thông báo, tài khoản deactivate không
  login được), `InvoiceService.create()` lưu đúng `collectedByUserId`,
  `EscPosService.buildInvoiceReceipt()` dùng đúng tên/SĐT từ `collector`,
  bỏ dòng khi `collector = null`, migration tạo đủ 6 bảng + cột mới + FK
  unique username.
- **Build thật gặp lỗi hạ tầng**: `INSTALL_FAILED_INSUFFICIENT_STORAGE` khi
  cài APK — APK debug đã phình lên **171MB** (build cho cả 4 kiến trúc CPU:
  armeabi-v7a/arm64-v8a/x86/x86_64, cộng dồn qua nhiều native module đã thêm
  suốt dự án: op-sqlite, bluetooth-classic, document-picker...), trong khi
  emulator (dùng chung với các project Android khác của người dùng) chỉ còn
  ~600MB trống. `pm trim-caches` chỉ giải phóng được chút ít, không đủ. Xử lý:
  build lại với cờ `--active-arch-only` của RN CLI (build native lib chỉ cho
  kiến trúc CPU thật của thiết bị/emulator đang cắm) — APK nhỏ lại đủ để cài,
  không cần đổi cấu hình `reactNativeArchitectures` cố định trong
  `gradle.properties` (vẫn giữ đủ 4 kiến trúc cho build release thật). **Ghi
  chú cho các lần sau**: nếu gặp lại lỗi cài đặt tương tự trên emulator này,
  dùng `--active-arch-only` trước khi nghi ngờ code.
- Verify trên emulator, dùng đúng DB cũ có sẵn (12 khách hàng + 2 hóa đơn từ
  các lần test trước — kịch bản "nâng cấp app lên bản có đăng nhập" thật):
  mở app → đúng vào `BootstrapScreen` (chưa có tài khoản) → tạo tài khoản
  "khai1" → tự vào thẳng `HomeScreen` đã đăng nhập, dữ liệu cũ nguyên vẹn, 2
  hóa đơn cũ hiện đúng "Người thu: —" (null, đúng thiết kế) → "Quản lý tài
  khoản" → thêm tài khoản "thu2" (giữ nguyên phiên "khai1", không tự chuyển
  qua tài khoản mới) → Đăng xuất → đăng nhập "thu2" → nhập chỉ số khách hàng
  mới → tạo hóa đơn `HD000003` → Chi tiết hóa đơn hiện đúng "Người thu:
  TranThiThu" → `PrinterScreen` xác nhận form cấu hình chỉ còn 4 field. Pull
  DB xác nhận trực tiếp: `users` có đủ 2 tài khoản, `invoices.collectedByUserId`
  = NULL cho 2 hóa đơn cũ, = 2 (đúng id "thu2") cho hóa đơn mới,
  `PRAGMA user_version` = 2. `adb logcat` không crash xuyên suốt.

**Kết quả:** Tính năng đăng nhập nhiều tài khoản hoạt động đúng đầy đủ, tương
thích ngược hoàn toàn với dữ liệu đã tạo trước đó (không mất dữ liệu, không
crash khi nâng cấp).

**Vấn đề còn lại:**

- Băm mật khẩu bằng SHA-256 lặp, không phải bcrypt/Argon2 thật — chấp nhận
  được với threat model hiện tại (xem giải thích ở trên), nhưng cần đổi nếu
  sau này có backend/đồng bộ qua mạng.
- Session không "remember me" — mỗi lần mở lại app (sau khi bị hệ thống kill
  hẳn tiến trình) phải đăng nhập lại.
- Không có vai trò/phân quyền (admin vs nhân viên thường) — mọi tài khoản
  ngang hàng, ai cũng thêm/vô hiệu hoá được tài khoản khác.
- 2 key `collectorName`/`collectorPhone` trong `app_settings` giờ không còn
  dùng tới nhưng vẫn còn trong DB (không xoá, key-value store không cần
  migration để "dọn" key thừa).
- APK debug 171MB (build đủ 4 kiến trúc) — nên cân nhắc dùng
  `--active-arch-only` mặc định cho vòng lặp phát triển hàng ngày trên
  emulator này để tránh lặp lại lỗi thiếu dung lượng.

## Ngoài phase gốc — Import Excel: chế độ "Cập nhật nếu đã tồn tại"

**Ngày:** 2026-08-22

**Bối cảnh:** Người dùng hỏi liệu import Excel định kỳ (vd. mỗi tháng) có cập
nhật được khách hàng đã tồn tại không. Trả lời: KHÔNG — `CustomerRepository.createMany()`
(Phase 3) luôn bỏ qua hoàn toàn customerCode trùng, không phù hợp cho việc
đồng bộ dữ liệu định kỳ. Người dùng xác nhận thêm chế độ update-on-match, và
chốt cách xử lý field trống: **giữ giá trị cũ**, không ghi đè bằng chuỗi rỗng
(tránh 1 file thiếu cột xoá mất dữ liệu đã có).

**Đã làm:**

- `CustomerRepository.createMany()`: thêm tham số `options.onDuplicate: 'skip' | 'update'`
  (mặc định `'skip'`, giữ nguyên hành vi cũ — không phá code cũ gọi không truyền
  option). Chế độ `'update'`: merge field — field nào trong input rỗng thì giữ
  `existing.field`, `serviceType` luôn ghi đè (bắt buộc, không thể rỗng qua
  validate), trả thêm mảng `updated` bên cạnh `created`/`skippedDuplicateCodes`.
- `ExcelImportService.importValidRows()`: đổi chữ ký, gộp `repo` vào object
  `options` cùng `onDuplicate` (phải sửa 2 chỗ gọi test cũ theo). `ImportSummary`
  thêm `updatedCount`.
- `ExcelImportService.previewDuplicates()` (mới): kiểm tra `existsByCode()` cho
  từng dòng hợp lệ, không phụ thuộc `onDuplicate` — cho `ImportCustomerScreen`
  biết trước "sẽ tạo mới bao nhiêu / trùng bao nhiêu" ngay ở bước preview.
- `ImportCustomerScreen`: thêm toggle 2 nút "Bỏ qua"/"Cập nhật" (cùng kiểu
  segmented control đã dùng cho Loại dịch vụ ở `CustomerDetailScreen`), mặc
  định "Bỏ qua". Preview hiển thị "N tạo mới, M đã tồn tại (sẽ được cập
  nhật/bị bỏ qua)" theo đúng toggle hiện tại. Màn kết quả thêm dòng "Đã cập
  nhật N khách hàng."

**Test:**

- `npx tsc --noEmit`, `npx eslint .` → không lỗi.
- `npx jest` → 96/96 test pass (18 test suite) — `CustomerRepository.createMany`
  (update giữ field rỗng = giá trị cũ, vẫn insert bình thường nếu chưa tồn
  tại), `ExcelImportService.importValidRows` (mode update trả đúng
  `updatedCount`, giữ đúng field rỗng), `previewDuplicates` (đếm đúng, không
  phụ thuộc mode).
- Build thật + chạy Android emulator, `adb logcat` không crash. Test thủ công:
  tạo file Excel 2 dòng — 1 dòng trùng mã khách đã có (C0009, để trống SĐT +
  mã đồng hồ, đổi tên + địa chỉ mới), 1 dòng khách mới (C0201). Bật "Cập nhật"
  → preview hiện đúng "1 tạo mới, 1 đã tồn tại (sẽ được cập nhật)" → xác nhận →
  "Đã tạo 1 khách hàng." + "Đã cập nhật 1 khách hàng." → pull DB xác nhận
  chính xác: C0009 có tên/địa chỉ mới nhưng SĐT/mã đồng hồ cũ **được giữ
  nguyên** (không bị xoá dù file để trống); C0201 tạo mới đủ field.

**Kết quả:** Import Excel giờ hỗ trợ cả 2 luồng — "import 1 lần" (mặc định, an
toàn) và "đồng bộ định kỳ" (bật "Cập nhật") — đúng yêu cầu thực tế của người
dùng.

## Ngoài phase gốc — Trang chủ (HomeScreen)

**Ngày:** 2026-08-22

**Bối cảnh:** Sau khi xong Phase 8, app mở thẳng vào `CustomerListScreen`
(không có "trang chủ" thật). Người dùng yêu cầu thêm 1 trang chủ tổng hợp đủ
chức năng — dashboard tổng quan + lối vào nhanh tất cả luồng chính, không nằm
trong 10 phase gốc.

**Đã làm:**

- `src/utils/date.ts`: thêm `getCurrentPeriod(date = new Date())` (nhận `date`
  tuỳ chọn để test không phụ thuộc đồng hồ hệ thống), refactor
  `MeterReadingScreen` dùng hàm này thay vì hàm `currentPeriod()` cục bộ trùng lặp.
- `InvoiceRepository.listRecent(limit)` (mới) — `ORDER BY createdAt DESC, id DESC`
  (thêm `id DESC` làm tiebreaker vì nhiều hóa đơn tạo liên tiếp trong cùng 1
  test có thể trùng `createdAt` tới từng mili-giây).
- `InvoiceService.listByPeriod()`/`listRecent()`, `CustomerService.count()` —
  wrap các method Repository đã có/mới thêm.
- `HomeScreen` (mới, làm `initialRouteName`): 4 thẻ số liệu (tổng khách hàng,
  hóa đơn tháng này, doanh thu tháng này, chưa in — tính từ
  `InvoiceService.listByPeriod(getCurrentPeriod())`), 3 nút truy cập nhanh
  (Khách hàng/Import Excel/Máy in), danh sách 5 hóa đơn gần nhất (tap mở
  `InvoiceDetail`). Refresh số liệu qua sự kiện `focus` (cùng pattern
  `CustomerListScreen` đã dùng ở Phase 3).
- `AppNavigator`: thêm route `Home`, đổi `initialRouteName` từ `CustomerList`
  sang `Home`.

**Test:**

- `npx tsc --noEmit`, `npx eslint .` → không lỗi.
- `npx jest` → 92/92 test pass (18 test suite) — `getCurrentPeriod`,
  `CustomerService.count`, `InvoiceService.listByPeriod`/`listRecent`.
- Build thật + chạy Android emulator, `adb logcat` không crash. Verify số liệu
  đúng 1:1 với dữ liệu đã tạo qua các lần test trước (12 khách hàng, 2 hóa đơn
  tháng 08/2026 tổng 368.890đ = 136.950 + 231.940, đều "Chưa in"). Tap thẻ
  "Tổng khách hàng" → đúng `CustomerListScreen`; tap dòng hóa đơn gần đây
  (HD000002) → đúng `InvoiceDetailScreen` hiển thị đúng hóa đơn; back từ đó về
  đúng lại `HomeScreen` (xác nhận qua `uiautomator dump`, không chỉ nhìn UI).

**Kết quả:** Trang chủ hoạt động đúng, số liệu chính xác, điều hướng đầy đủ tới
mọi chức năng chính của app.

**Vấn đề còn lại:**

- Không có pull-to-refresh trên `HomeScreen` — số liệu chỉ refresh khi quay lại
  màn hình (sự kiện `focus`), chấp nhận được cho MVP.
- 5 hóa đơn gần đây tra tên khách hàng theo kiểu N+1 (`customerService.getById`
  cho từng hóa đơn) — chấp nhận được vì giới hạn cố định 5 dòng, không phải vấn
  đề hiệu năng ở quy mô này.

## Phase 7 + 8 — Bluetooth & ESC/POS (in hóa đơn)

**Ngày:** 2026-08-22

**Bối cảnh:** Tính năng phần cứng — không có máy in nhiệt Bluetooth thật lẫn
thiết bị Android thật trong môi trường build, và máy ảo Android không hỗ trợ
kết nối tới thiết bị Bluetooth Classic bên ngoài thật. Đã nói rõ giới hạn này
với người dùng trước khi làm: verify được build/luồng UI/không crash, **không
verify được việc in ra giấy thật** — phần đó người dùng cần tự xác nhận trên
thiết bị + máy in thật.

**Đã làm:**

- Đánh giá thư viện Bluetooth Classic (SPP) cho Android: `react-native-bluetooth-escpos-printer`
  (bỏ hoang 2022), `react-native-thermal-receipt-printer*` (nhắm USB/BLE/Net,
  không phải Classic SPP), `react-native-esc-pos-printer` (chỉ hỗ trợ máy in
  Epson) → chọn `react-native-bluetooth-classic` (bản `1.73.0-rc.17`, publish
  19/11/2025). Đã tự đọc mã nguồn/type defs xác nhận: đây là module cầu nối
  kiểu cũ (`ReactPackage`, không có `codegenConfig`/TurboModule) — **không có
  lựa chọn nào trong mảng này có TurboModule thật**, chạy được dưới
  `newArchEnabled=true` qua lớp tương thích ngược, là lựa chọn ít rủi ro nhất
  hiện có chứ không phải hoàn hảo.
- `src/services/BluetoothPrinterService.ts`: quyền Android 12+ (`BLUETOOTH_SCAN`+
  `BLUETOOTH_CONNECT`) và Android cũ hơn (`ACCESS_FINE_LOCATION`) qua
  `PermissionsAndroid`, `listBondedDevices()`, `connect()`/`disconnect()`,
  `openSystemBluetoothSettings()` (mở Cài đặt hệ thống để ghép đôi máy in mới —
  không tự làm UI quét thiết bị mới, xem "Vấn đề còn lại"), `printBytes()`.
- `src/utils/vietnameseText.ts`: `stripDiacritics()` — bảng ánh xạ tường minh
  từng ký tự tiếng Việt có dấu sang ASCII, KHÔNG dùng `String.prototype.normalize()`
  (rủi ro thiếu dữ liệu Unicode decomposition trên Hermes, cùng lý do đã tránh
  `Intl.NumberFormat` ở Phase 4/5).
- **Quyết định encoding tiếng Việt khi in**: bỏ dấu về ASCII thay vì chuyển
  codepage CP1258 (`ESC t n`) — vì không biết chắc firmware máy in giá rẻ thực
  tế của người dùng có hỗ trợ codepage đó hay không, và không thể kiểm tra khi
  không có máy thật. Bỏ dấu đảm bảo in đúng trên mọi máy in ESC/POS bất kể
  firmware, và là cách duy nhất test được đầy đủ bằng Jest.
- `src/services/EscPosService.ts`: `buildInvoiceReceipt(invoice, customer,
  settings, printedAt)` — build byte ESC/POS (init, căn giữa/trái, in đậm, cắt
  giấy) theo đúng mapping đã chốt ở ARCHITECTURE.md từ Phase 2. `printedAt`
  truyền vào từ bên ngoài (không đọc `invoice.printedAt`, vì tại thời điểm build
  hóa đơn chưa in xong nên cột đó còn null trong DB).
- `InvoiceService.markPrinted()`/`markPrintFailed()` (wrap `updatePrintStatus`
  có sẵn từ Phase 2).
- `SettingsService.ts` (wrap `SettingsRepository` có sẵn từ Phase 2) + UI cấu
  hình 6 field `app_settings` (companyName/hotline/collectorName/collectorPhone/
  bankAccountNumber/bankName) trong `PrinterScreen` — lần đầu tiên có UI chỉnh
  sửa các field này kể từ khi tạo ở Phase 2.
- `PrinterScreen` (thay placeholder): 3 phần — cấu hình in hóa đơn, kết nối máy
  in Bluetooth (danh sách đã ghép đôi + trạng thái + nút mở Cài đặt hệ thống),
  và (nếu vào từ 1 hóa đơn cụ thể) nút in hóa đơn đó (disabled khi chưa kết
  nối). `InvoiceDetailScreen` nút "In hóa đơn" đổi từ `Alert` placeholder sang
  điều hướng thật `navigation.navigate('Printer', { invoiceId })`.

**Test:**

- `npx tsc --noEmit`, `npx eslint .` → không lỗi.
- `npx jest` → 86/86 test pass (18 test suite) — `stripDiacritics` (tên seed
  thật, đủ 6 thanh điệu, đ/Đ), `EscPosService.buildInvoiceReceipt` (nội dung
  đúng theo mapping, bỏ dấu đúng, ẩn/hiện dòng tuỳ điều kiện serviceFee/field
  rỗng, nhãn ĐIỆN/NƯỚC), `formatDateTime` (test theo giờ địa phương tự tính,
  không hard-code giờ UTC cụ thể — tránh test phụ thuộc timezone máy chạy),
  `InvoiceService.markPrinted`/`markPrintFailed`.
- Build thật + chạy Android emulator. **Bug build thật gặp phải**: thư viện
  `react-native-bluetooth-classic` viết `build.gradle` cho AGP cũ, giả định
  `BuildConfig` được tự sinh — nhưng AGP 8+ tắt mặc định tính năng này, và
  project đang dùng AGP 9.x (`android.newDsl`/`android.builtInKotlin` đã có
  trong `gradle.properties` từ trước) nên lỗi `cannot find symbol BuildConfig`.
  Thử fix bằng flag global `android.defaults.buildfeatures.buildconfig=true`
  trước — KHÔNG hoạt động vì flag này đã bị **xoá hẳn** ở AGP 9.0 (không chỉ
  deprecated). Xử lý đúng: patch trực tiếp `android/build.gradle` của thư viện
  thêm `buildFeatures { buildConfig true }`, dùng `patch-package` để lưu lại
  patch (`patches/react-native-bluetooth-classic+1.73.0-rc.17.patch`) + thêm
  script `postinstall: patch-package` vào `package.json` — đảm bảo patch tự áp
  dụng lại sau mỗi `npm install`, không bị mất khi `node_modules` bị xoá/cài lại.
  Build lại thành công sau khi patch.
- Sau khi build thành công, verify trên emulator: chạy trọn luồng
  CustomerDetail → Nhập chỉ số → Preview → Tạo hóa đơn (HD000002) → Chi tiết →
  bấm "In hóa đơn" → điều hướng đúng sang `PrinterScreen`, dialog xin quyền
  Bluetooth của Android hiện đúng và cấp quyền thành công, không crash
  (`adb logcat` sạch). Danh sách "đã ghép đôi" hiện đúng thông báo rỗng (đúng
  vì emulator không có thiết bị Bluetooth nào ghép đôi). Nút "In hóa đơn
  HD000002" xác nhận `enabled="false"` qua `uiautomator dump` khi chưa kết nối
  — đúng thiết kế. Form cấu hình lưu/đọc đúng, verify bằng cách pull
  `meterbill.db` và query trực tiếp bảng `app_settings` (không chỉ tin UI, vì
  gặp lại đúng kiểu flaky tap của `adb shell input tap` đã thấy ở Phase 6 —
  bấm 1 lần không luôn ăn, xác nhận bằng cách bấm lại nhiều lần + kiểm tra DB
  trực tiếp thay vì chỉ nhìn UI). Nút "Mở Cài đặt Bluetooth" xác nhận qua
  `dumpsys window | grep mCurrentFocus` thật sự mở đúng
  `com.android.settings.Settings$ConnectedDeviceDashboardActivity` — bằng
  chứng module native hoạt động thật (không chỉ "không crash").

**Kết quả:** Acceptance Phase 7 ("Kết nối Bluetooth") và Phase 8 ("In hóa đơn
ESC/POS") đạt ở phần verify được trong môi trường này (build, quyền, UI, cấu
hình, mở Cài đặt Bluetooth). **Việc in ra giấy thật trên máy in thật chưa được
xác nhận — cần người dùng tự test trên thiết bị Android thật + máy in nhiệt
Bluetooth thật.**

**Vấn đề còn lại:**

- **Chưa xác nhận in ra giấy thật hoạt động đúng** (nội dung, khổ giấy, cắt
  giấy, tốc độ, độ ổn định kết nối) — cần test trên phần cứng thật.
- Không làm UI quét thiết bị Bluetooth mới (`startDiscovery`) — chỉ dùng danh
  sách đã ghép đôi + mở Cài đặt hệ thống để ghép đôi thủ công.
- Không lưu địa chỉ máy in đã kết nối lần trước — phải chọn lại mỗi phiên.
- `react-native-bluetooth-classic` không phải TurboModule thật — chạy qua lớp
  tương thích New Architecture. Rủi ro dài hạn: nếu RN loại bỏ lớp tương thích
  này ở phiên bản tương lai, cần tìm thư viện thay thế.
- Chưa test trên thiết bị Android thật (như các Phase trước) — với Phase này,
  việc test trên thiết bị thật đặc biệt quan trọng hơn hẳn vì đây là tính năng
  phần cứng.

## Phase 6 — Invoice

**Ngày:** 2026-08-22

**Đã làm:**

- `src/utils/date.ts`: `getMonthRange(period)` — parse "MM/YYYY" bằng `Date`
  object (tự xử lý số ngày/tháng nhuận đúng, không tính tay), trả về
  `{from, to}` dạng ISO `YYYY-MM-DD`.
- `InvoiceRepository.count()` (mới, giống `CustomerRepository.count()`) — dùng
  sinh `invoiceCode` tuần tự.
- `src/services/InvoiceService.ts`: `buildPreview(meterReadingId)` (load
  `MeterReading` + `Customer`, tính bill qua `BillingService.estimate` đã có từ
  Phase 5, mặc định `periodFrom`/`periodTo` qua `getMonthRange`); `create()`
  tự tính lại bill ở Service (không tin số liệu từ Screen gửi lên), sinh
  `invoiceCode` dạng `HD000001` từ `repo.count() + 1`, thử lại tối đa 5 lần nếu
  trùng mã (`DuplicateInvoiceCodeError`, gần như không thể xảy ra vì app
  single-user offline); `getById()`.
- Nối luồng: `MeterReadingScreen` lưu chỉ số xong → điều hướng sang
  `InvoicePreviewScreen` (thay vì Alert + quay lại `CustomerDetail` như Phase 4)
  → xem/chỉnh Từ ngày/Đến ngày/Phí dịch vụ, tổng cộng cập nhật realtime → "Tạo
  hóa đơn" → lưu `Invoice` → điều hướng sang `InvoiceDetailScreen`.
  `RootStackParamList.InvoicePreview`/`InvoiceDetail` đổi từ `undefined` thành
  `{ meterReadingId }`/`{ invoiceId }`.
- `InvoiceDetailScreen`: hiển thị đầy đủ theo đúng mapping đã ghi ở
  ARCHITECTURE.md (mã hóa đơn, mã/tên/ĐT/địa chỉ KH, kỳ, chỉ số, số tiền, phí
  dịch vụ, tổng cộng, trạng thái in tiếng Việt). Nút "In hóa đơn" chỉ hiện
  `Alert` "Chức năng in sẽ triển khai ở Phase 7-8" — không đổi `printStatus`
  vì chưa in thật (tránh set sai trạng thái).

**Test:**

- `npx tsc --noEmit`, `npx eslint .` → không lỗi.
- `npx jest` → 72/72 test pass (16 test suite) — `getMonthRange` (tháng
  thường/30 ngày/năm nhuận/không nhuận/tháng 12), `InvoiceService` (bill đúng
  theo tariff, `total = subtotal+tax+serviceFee`, invoiceCode tuần tự
  HD000001/HD000002, `getById`).
- Build thật + chạy Android emulator, `adb logcat` không crash (một dòng
  "Shutting down VM" xuất hiện trong log nhưng thuộc process khác của hệ
  thống, không phải `com.meterbill` — xác nhận qua `adb shell pidof
  com.meterbill` vẫn sống xuyên suốt test). Test thủ công đầy đủ trên khách
  hàng C0009 (chưa từng có chỉ số): Nhập chỉ số 0→120 kWh → tự chuyển sang Xem
  trước hóa đơn với đúng "226.940 đ" + Từ ngày/Đến ngày tự tính đúng
  (2026-08-01 → 2026-08-31) → nhập Phí dịch vụ 5.000 → Tổng cộng cập nhật đúng
  231.940 đ → Tạo hóa đơn → Chi tiết hóa đơn hiển thị đúng toàn bộ field, mã
  `HD000001`, trạng thái "Chưa in" → bấm In hóa đơn thấy đúng thông báo "chưa
  triển khai". Pull DB xác nhận dòng `invoices` lưu đúng tất cả giá trị.

**Kết quả:** Acceptance Phase 6 ("Tạo và xem hóa đơn") đạt — hoàn thành trọn
luồng nghiệp vụ chính từ README.md (trừ bước in, thuộc Phase 7/8): NHẬP CHỈ SỐ
→ TÍNH LƯỢNG SỬ DỤNG → TÍNH TIỀN → TẠO HÓA ĐƠN → LƯU SQLITE.

**Bug đã gặp và xử lý:**

- Trong lúc test thủ công, nhiều lần `adb shell input tap` ở đúng toạ độ tâm
  nút (xác nhận bằng `uiautomator dump`) không kích hoạt `onPress` — không
  phải lỗi code (không log lỗi, không crash), nhiều khả năng do timing/quán
  tính chạm của emulator. Xử lý: dump `uiautomator` để lấy đúng bounds
  clickable (không suy từ ảnh chụp màn hình), tap lại và tăng thời gian chờ
  trước khi kiểm tra — sau khi retry thì luồng chạy đúng như thiết kế toàn bộ.

**Vấn đề còn lại:**

- Không có màn hình danh sách hóa đơn của khách hàng — chỉ tạo được qua luồng
  Nhập chỉ số → Preview → Detail. `InvoiceRepository.listByCustomer` đã sẵn
  sàng nếu cần bổ sung sau.
- Không chặn tạo 2 hóa đơn cho cùng 1 `meterReadingId` nếu người dùng quay lại
  màn Preview và tạo lần nữa (schema `invoices` không có cột liên kết tới
  `meter_readings`) — chấp nhận được cho MVP vì luồng bình thường chỉ đi qua
  Preview một lần.
- Không sửa được hóa đơn sau khi tạo (không có `InvoiceRepository.update`) —
  đúng giả định nghiệp vụ hóa đơn không sửa sau khi phát hành.
- Nút "In hóa đơn" chưa làm gì thật — chờ `BluetoothPrinterService`/
  `EscPosService` ở Phase 7/8.

## Phase 4 + 5 — Meter Reading & Billing

**Ngày:** 2026-08-22

**Bối cảnh:** Gộp 2 phase vì Billing chưa có màn hình riêng (Invoice là Phase 6)
— kết quả tính tiền chỉ hiển thị "ước tính" ngay trong màn Nhập chỉ số, chưa lưu
vào bảng `invoices`. Hỏi người dùng về VAT trước khi implement: xác nhận
**không cộng VAT** vào tiền tính (khớp mẫu hóa đơn thực tế đã xem ở Phase 2/3 —
chỉ có "Số tiền" + "Phí dịch vụ", không có dòng VAT riêng).

**Đã làm:**

- `src/services/BillingCalculator.ts` (thuần TypeScript, pure function):
  `calculateBill(consumption, tiers, taxRate = 0)` — tính tiền luỹ tiến qua
  từng bậc thang (giả định tiers đã sort tăng dần theo `fromValue`, liên tục từ
  0, đúng thứ tự `TariffRepository.listByServiceType` trả về). `taxRate` vẫn là
  tham số tuỳ chọn (không khoá cứng 0%) nhưng không có UI nào bật lên trong MVP
  hiện tại.
- `src/services/BillingService.ts`: `estimate(serviceType, consumption, taxRate)`
  — load tariff qua `TariffRepository.listByServiceType` rồi gọi
  `calculateBill`. Trả `{0,0,0}` (không throw) khi chưa cấu hình tariff cho
  serviceType đó, để màn hình tự hiển thị cảnh báo riêng thay vì vỡ preview.
- `src/utils/currency.ts`: `formatCurrency()` tự viết bằng regex (không dùng
  `Intl.NumberFormat`, tránh rủi ro thiếu ICU data cho locale `vi-VN` trên
  Hermes) — format kiểu "226.940 đ".
- `src/services/MeterService.ts`: `getSuggestedOldReading()` (từ
  `findLatestByCustomer`, 0 nếu chưa có lịch sử), `create()` (validate
  `newReading >= oldReading`, bắt lỗi UNIQUE constraint từ Repository và ném
  lại thành "Đã nhập chỉ số cho kỳ {period} rồi" thay vì lỗi SQLite thô),
  `listByCustomer()`.
- `RootStackParamList.MeterReading` đổi từ `undefined` thành bắt buộc
  `{ customerId: number }`. Thêm nút "Nhập chỉ số" vào `CustomerDetailScreen`
  (chỉ hiện khi đang sửa khách hàng có sẵn).
- `MeterReadingScreen` (thay placeholder): header tên/mã KH/loại dịch vụ, prefill
  chỉ số cũ từ lịch sử, kỳ mặc định tháng hiện tại (MM/YYYY), tính lượng sử
  dụng + gọi `BillingService.estimate` để hiển thị ước tính tiền theo thời gian
  thực khi nhập chỉ số mới, lưu qua `MeterService.create()`.

**Test:**

- `npx tsc --noEmit`, `npx eslint .` → không lỗi.
- `npx jest` → 63/63 test pass (14 test suite) — `BillingCalculator` (nhiều
  mức consumption cắt qua nhiều bậc, không có tariff, có taxRate), `currency`,
  `MeterService` (gợi ý chỉ số cũ, validate, trùng kỳ, tiêu thụ = 0).
- Build thật + chạy trên Android emulator, `adb logcat` không crash. Test thủ
  công đầy đủ trên khách hàng C0001 (đã có sẵn 2 kỳ chỉ số từ seed Phase 2):
  mở "Nhập chỉ số" → prefill đúng chỉ số cũ = 210 (từ kỳ gần nhất) → nhập chỉ số
  mới 260 → hiển thị đúng "Lượng sử dụng: 50 kWh" + "Ước tính: 90.300 đ" (khớp
  tay tính theo tariff seed: 50×1806) → Lưu với kỳ trùng (08/2026, đã có sẵn) →
  báo đúng "Đã nhập chỉ số cho kỳ 08/2026 rồi" → đổi kỳ sang 09/2026 → Lưu →
  "Đã lưu chỉ số kỳ 09/2026." → quay lại đúng `CustomerDetailScreen`.

**Kết quả:** Acceptance Phase 4 ("Nhập chỉ số + tính lượng sử dụng") và Phase 5
("Tính tiền theo bậc thang") đạt.

**Vấn đề còn lại:**

- Billing mới dừng ở mức "ước tính" hiển thị trong `MeterReadingScreen` — chưa
  lưu thành `Invoice` (bảng `invoices`) vì đó là phạm vi Phase 6.
- `MeterReadingScreen` chưa hiển thị lịch sử các kỳ đã nhập của khách hàng (chỉ
  dùng kỳ gần nhất để gợi ý chỉ số cũ) — có thể bổ sung nếu cần khi làm Invoice.
- Chưa test trên thiết bị Android thật (như các Phase trước, mới test emulator).

## Phase 3 — Customer + Excel Import

**Ngày:** 2026-08-21

**Đã làm:**

- Đánh giá file picker: `@react-native-documents/picker` (KHÔNG dùng
  `react-native-document-picker` — đã deprecated, cùng nhóm tác giả rename/viết
  lại thành package này để hỗ trợ New Architecture qua Turbo Module codegen
  thật). Cài + verify: filter đúng loại file `.xlsx`/`.xls` khi mở picker trên
  emulator thật.
- Đánh giá thư viện Excel: chọn `xlsx` (SheetJS Community Edition, thuần JS,
  không rủi ro New Architecture). Phát hiện bản npm registry (0.18.5) dính 2 lỗ
  hổng mức "high" (Prototype Pollution, ReDoS — SheetJS ngừng publish bản vá lên
  npm, chỉ phát hành qua CDN riêng của họ) → cài từ
  `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` thay vì npm registry,
  `npm audit` xác nhận hết cảnh báo cho `xlsx`.
- Đọc file Excel đã chọn (`content://` URI) bằng `fetch` → `Blob` →
  `FileReader.readAsDataURL()` → base64 → `XLSX.read()`, không cần thêm
  `react-native-fs`.
- `src/services/ExcelImportService.ts` (thuần TypeScript): mapping 6 cột tiếng
  Việt cố định → field `Customer`, `classifyRows()` (validate required field,
  serviceType hợp lệ, trùng mã trong file — lý do lỗi tiếng Việt), 
  `importValidRows()`.
- `src/services/excelFile.ts`: wrapper RN-only cô lập phần không test được
  (native picker + fetch/blob), xử lý riêng trường hợp người dùng huỷ chọn file.
- `src/services/CustomerService.ts`: validate + CRUD + `list()` phân trang, bọc
  trên `CustomerRepository`.
- `CustomerRepository.createMany()` (mới): bulk insert trong 1 transaction, bỏ
  qua (không ghi đè) customerCode đã tồn tại, lỗi từng dòng không phá cả batch.
- 3 màn hình từ placeholder thành chức năng thật: `CustomerListScreen` (tìm
  kiếm debounce, `FlatList` phân trang limit/offset — không load hết ~10.000
  dòng vào state, refresh qua sự kiện `focus` khi quay lại từ màn khác),
  `ImportCustomerScreen` (state machine idle → preview lỗi/hợp lệ → xác nhận →
  kết quả), `CustomerDetailScreen` (thêm/sửa/xoá, prefill khi sửa).
  `RootStackParamList.CustomerDetail` đổi thành `{ customerId?: number } | undefined`.
- Cập nhật mock `__mocks__/@op-engineering/op-sqlite.js` từ "throw khi gọi
  thật" (Phase 2) thành "trả DB rỗng" — vì từ Phase 3, Screen tạo
  `CustomerService`/`CustomerRepository` ở module scope với `getDatabase()`
  thật mặc định, và `__tests__/App.test.tsx` render cả `CustomerListScreen`
  (initial route) qua react-test-renderer nên `open()` không được throw nữa.
  Test dữ liệu vẫn dùng `better-sqlite3` inject qua constructor như cũ, không
  bị ảnh hưởng (không đi qua default param nên không đụng mock).
  Thêm mock tương tự cho `@react-native-documents/picker` (vẫn throw — không
  màn hình nào gọi `pick()` ở module scope).
  Thêm `@react-native-documents` vào `transformIgnorePatterns` của
  `jest.config.js` (ship ESM, giống tình huống `@react-navigation` ở Phase 1).

**Test:**

- `npx tsc --noEmit`, `npx eslint .` → không lỗi.
- `npx jest` → 46/46 test pass (11 test suite).
- Build thật + chạy trên Android emulator (Pixel_9a), `adb logcat` không có
  crash. Test thủ công đầy đủ: danh sách 10 khách hàng seed hiển thị đúng, mở
  chi tiết 1 khách hàng prefill đúng field; tạo 1 file `.xlsx` mẫu (5 dòng: 2
  hợp lệ, 1 trùng mã với DB, 1 thiếu Mã khách hàng, 1 sai Loại dịch vụ) bằng
  `xlsx` qua Node, `adb push` vào `/sdcard/Download/`, chọn qua picker thật
  trên emulator → preview hiển thị đúng "3 dòng hợp lệ · 2 dòng lỗi" với đúng
  lý do từng dòng → xác nhận import → "Đã tạo 2 khách hàng. Bỏ qua 1 mã đã tồn
  tại: C0001" → quay lại danh sách thấy đúng 12 khách hàng, 2 khách mới xuất
  hiện, C0001 không bị ghi đè. Test tìm kiếm: prefix không khớp → "0 khách
  hàng"/"Không có khách hàng nào"; prefix khớp (`C010`) → đúng 2 kết quả.

**Kết quả:** Acceptance Phase 3 ("Customer CRUD + Excel Import") đạt.

**Bug đã gặp và xử lý:**

- `npx jest` lỗi `SyntaxError: Unexpected token 'export'` khi import
  `@react-native-documents/picker` — package ship ESM, chưa nằm trong
  `transformIgnorePatterns`. Xử lý giống bug tương tự của `@react-navigation`
  ở Phase 1: thêm `@react-native-documents` vào pattern loại trừ.
  Sau đó gặp tiếp `TurboModuleRegistry.getEnforcing(...): 'RNDocumentPicker'
  could not be found` (native module thật không tồn tại dưới Jest) — xử lý
  bằng manual mock `__mocks__/@react-native-documents/picker.js`.
  `__tests__/App.test.tsx` (render cả `CustomerListScreen` — initial route)
  cũng lộ ra vấn đề tương tự với `@op-engineering/op-sqlite`: mock cũ throw
  ngay khi `open()` được gọi thật, hợp lý ở Phase 2 (không Repository nào được
  gọi ở module scope khi đó) nhưng Phase 3 khiến `open()` bị gọi thật lúc
  render — sửa mock trả DB rỗng thay vì throw (chi tiết ở mục "Đã làm").
- `npm install xlsx` (registry) kéo theo 2 lỗ hổng "high" (Prototype
  Pollution, ReDoS) do SheetJS ngừng vá bản npm — phát hiện qua `npm audit`
  ngay sau khi cài, gỡ và cài lại từ CDN chính chủ của SheetJS thay vì bỏ qua
  cảnh báo.
- Metro/emulator giữ từ phiên làm việc Phase 2 trước đó bị mất kết nối
  ("Fast Refresh disconnected", "Cannot connect to Metro") sau một lúc — không
  ảnh hưởng bundle JS đã load (app vẫn chạy, thao tác test thủ công không bị
  gián đoạn), chỉ mất live-reload; không phải lỗi của code Phase 3.

**Vấn đề còn lại:**

- Chưa có validate định dạng số điện thoại/độ dài field ở `CustomerService`
  (chỉ check required + serviceType) — có thể bổ sung khi có yêu cầu cụ thể.
- `CustomerListScreen` chưa có pull-to-refresh hay nút xoá nhanh từ danh sách
  (phải vào `CustomerDetail` mới xoá được) — chấp nhận được cho MVP.
- Chưa test trên thiết bị Android thật (như các Phase trước, mới test emulator).
- File Excel mẫu dùng để test bị xoá sau khi test xong (không phải asset cố
  định trong repo) — nếu cần bộ test cố định cho Phase sau, phải tạo lại.

## Phase 2 — Database

**Ngày:** 2026-08-21

**Bối cảnh:** Người dùng gửi ảnh một biên nhận thu tiền điện thật (giấy in nhiệt)
và yêu cầu tiếp tục Phase 2 có tính đến các trường cần thiết để in đúng nội dung
như mẫu. Ảnh chỉ được dùng để suy ra cấu trúc trường dữ liệu — không đưa thông
tin cá nhân thật trong ảnh vào code/schema/seed.

**Đã làm:**

- Đánh giá 3 lựa chọn thư viện SQLite cho RN 0.87 (`newArchEnabled=true`):
  `react-native-sqlite-storage` (chỉ chạy qua lớp tương thích cũ với New
  Architecture), `react-native-nitro-sqlite` (mới, kéo thêm dependency framework
  Nitro Modules), `@op-engineering/op-sqlite` (TurboModule JSI thật, `executeSync`
  đồng bộ tiện cho Repository, maintain tích cực) → chọn `@op-engineering/op-sqlite`.
- Mở rộng schema `invoices` so với DATABASE.md ban đầu — thêm `periodFrom`,
  `periodTo`, `serviceFee`, `printedAt` — và thêm bảng mới `app_settings`
  (key-value: companyName/hotline/collectorName/collectorPhone/bankAccountNumber/
  bankName), để có đủ dữ liệu in hóa đơn đúng như mẫu thực tế. Ghi lại mapping
  "dòng in → nguồn dữ liệu" trong ARCHITECTURE.md (mục Printer) làm hợp đồng cho
  `EscPosService` ở Phase 8.
- Implement `src/database/database.ts` (kết nối op-sqlite, `PRAGMA foreign_keys =
  ON`, `PRAGMA journal_mode = WAL`), `src/database/migrations.schema.ts` (SQL
  thuần, tách khỏi native module để test được bằng Jest) +
  `src/database/migrations.ts` (`runMigrations()` qua `PRAGMA user_version`),
  `src/database/seed.ts` (10 khách hàng hư cấu, vài meter reading, tariff điện
  bậc thang minh họa, 6 app_settings rỗng — guard bằng `SELECT COUNT(*)`, chỉ
  chạy khi `__DEV__`).
- 5 model trong `src/models/` (Customer, MeterReading, Invoice, Tariff, AppSetting)
  và 5 Repository trong `src/repositories/` (Customer, Meter, Invoice, Tariff,
  Settings) — chỉ Repository chứa SQL, search dùng `LIKE 'tiền_tố%'` để giữ index.
  `InvoiceRepository.create()` chạy trong transaction, bắt lỗi UNIQUE của
  `invoiceCode` thành `DuplicateInvoiceCodeError`.
- Gọi `runMigrations()` + `seedDatabase()` (khi `__DEV__`) một lần ở `index.js`
  (trước `AppRegistry.registerComponent`) — không đặt trong `App.tsx` để tránh
  kéo native module SQLite vào cây render mà `__tests__/App.test.tsx` dựng qua Jest.
- Test: thêm `better-sqlite3` (+ `@types/better-sqlite3`) làm devDependency (không
  bundle vào APK) để chạy thật các câu SQL trong Jest, cộng với manual mock
  `__mocks__/@op-engineering/op-sqlite.js` (op-sqlite throw ngay khi import dưới
  Node vì cần native TurboModule thật). `src/test-utils/sqliteTestDb.ts` cung cấp
  `createTestDb()`/`createMigratedTestDb()` implement chung interface `SqlDb` với
  bản production. 27 test: migration (tạo đủ bảng, không lỗi cú pháp SQL, unique
  constraint, không chạy lại migration đã áp), CRUD cơ bản cho cả 5 repository, seed.

**Test:**

- `npx tsc --noEmit`, `npx eslint .` → không lỗi.
- `npx jest` → 27/27 test pass (8 test suite, bao gồm 1 test suite mới cho
  migrations, 1 cho seed, 5 cho repository).
- Build thật + chạy trên Android emulator (Pixel_9a): `npx react-native
  run-android` → `BUILD SUCCESSFUL`, cài và mở app. `adb logcat` không có
  `FATAL`/`AndroidRuntime` crash, `libop-sqlite.so` load thành công. Pull
  `meterbill.db` + `.db-wal` + `.db-shm` từ `/data/data/com.meterbill/databases/`
  qua `adb shell run-as`, mở bằng `sqlite3` cục bộ (áp WAL tự động) — xác nhận
  `PRAGMA user_version` = 1, đủ 5 bảng, 10 khách hàng seed hư cấu, 6 dòng
  `app_settings`, và `invoices` có đủ 4 cột mới (`periodFrom`/`periodTo`/
  `serviceFee`/`printedAt`).

**Kết quả:** Acceptance Phase 2 ("DB layer đầy đủ + CRUD test") đạt.

**Bug đã gặp và xử lý:**

- Pull `meterbill.db` lần đầu qua `adb shell run-as ... cat` cho thấy 0 bảng,
  `user_version = 0` dù app không crash — vì `PRAGMA journal_mode = WAL` khiến
  dữ liệu mới nằm ở `meterbill.db-wal`/`.db-shm`, chưa checkpoint vào file chính
  trong khi app đang chạy. Xử lý: pull cả 3 file (`.db`, `.db-wal`, `.db-shm`)
  cùng thư mục rồi mở bằng `sqlite3` — SQLite tự áp WAL khi mở.
- `@op-engineering/op-sqlite` throw ngay ở import time dưới Jest/Node (không có
  native `NativeModules.OPSQLite`) — bất kỳ file test nào import trực tiếp
  Repository (vốn import `database.ts` → `op-sqlite`) đều fail trước khi chạy
  test. Xử lý: thêm manual mock `__mocks__/@op-engineering/op-sqlite.js` (Jest tự
  áp dụng cho package trong `node_modules` không cần `jest.mock()` từng file),
  test inject `SqlDb` từ `better-sqlite3` qua constructor thay vì dùng
  `getDatabase()` thật.

**Vấn đề còn lại:**

- Chưa có màn hình Settings để nhập `companyName`/`hotline`/`collectorName`/
  `collectorPhone`/`bankAccountNumber`/`bankName` — 6 dòng này đang seed rỗng.
  Sẽ làm ở Phase 6 hoặc Phase 8 khi `EscPosService` cần dữ liệu thật để in.
  `SettingsRepository` đã sẵn sàng cho việc này.
- `EscPosService`/format hóa đơn thật chưa viết (thuộc Phase 8) — chỉ mới chuẩn
  bị schema + mapping trong ARCHITECTURE.md.
- Chưa test trên thiết bị Android thật (mới test trên emulator, như Phase 1).
- Cài `@op-engineering/op-sqlite` mới chỉ verify build/chạy Android; chưa
  `pod install` để build thử iOS scaffold (không phải ưu tiên MVP hiện tại).

## Phase 1 — Project Setup

**Ngày:** 2026-08-21

**Đã làm:**

- Kiểm tra môi trường: Node v24.10.0, npm 11.6.0, JDK 17 (Homebrew), Android SDK
  tại `~/Library/Android/sdk` (platform 34/35/36, build-tools, platform-tools,
  emulator có sẵn), Android Studio đã cài, AVD `Pixel_9a` có sẵn. `ANDROID_HOME`
  chưa được set trong shell profile của máy dev — xử lý bằng cách thêm
  `android/local.properties` (`sdk.dir=...`, không commit) thay vì sửa shell
  profile của người dùng.
- Khởi tạo project bằng `@react-native-community/cli init` (RN 0.87.0, React
  19.2.3, template TypeScript có sẵn). Bare workflow (RN CLI), không dùng Expo —
  vì MVP cần Bluetooth/ESC-POS native modules.
- Cài `@react-navigation/native`, `@react-navigation/native-stack`,
  `react-native-screens`.
- Tạo `src/navigation/AppNavigator.tsx` (native stack, `RootStackParamList`
  typed) và 7 màn hình placeholder trong `src/screens/` theo đúng tên trong
  spec: CustomerList, ImportCustomer, CustomerDetail, MeterReading,
  InvoicePreview, InvoiceDetail, Printer. Mỗi màn hình hiện chỉ hiển thị tiêu đề
  + "Sẽ được triển khai ở Phase X" — chưa có business logic (thuộc các Phase
  sau).
- Sửa `App.tsx` để wrap `NavigationContainer` qua `AppNavigator`.
- Sửa `jest.config.js`: thêm `transformIgnorePatterns` để Jest transform được
  package ESM của `@react-navigation`.
- Tạo `android/local.properties` (sdk.dir, không commit — đã có trong
  `.gitignore` mặc định của template).
- Git: `git init`, commit đầu tiên trên `main`, tạo branch `develop` từ `main`.
- Viết tài liệu: README.md, TASKS.md, PROGRESS.md (file này), ARCHITECTURE.md,
  DATABASE.md, CONTRIBUTING.md.

**Files thay đổi:** toàn bộ project mới — xem commit đầu tiên trên `main`.

**Test:**

- `npx tsc --noEmit` → không có lỗi.
- `npx eslint .` → không có lỗi/cảnh báo.
- `npx jest` → 1/1 test pass (`__tests__/App.test.tsx`).
- Build thật + chạy trên Android emulator (Pixel_9a, Android 16, API tương ứng):
  `npx react-native run-android` build thành công (Gradle, `BUILD SUCCESSFUL`),
  cài và mở app trên emulator. Xác nhận qua `adb logcat` không có `FATAL`/crash,
  process `com.meterbill` sống sau khi mở. Chụp screenshot xác nhận màn hình
  "Khách hàng" (CustomerListScreen placeholder) hiển thị đúng tiếng Việt qua
  header của React Navigation.

**Kết quả:** Acceptance Phase 1 ("App chạy được Android") đạt.

**Bug đã gặp và xử lý:**

- `npm install --save-exact @react-native-community/template` timeout lần đầu
  do mạng — retry thành công lần 2.
- Lệnh tương tác `init` bị chạy nhầm lần 2 trong lúc chờ prompt CocoaPods, tạo
  ra thư mục rác `N/` trong project — đã phát hiện và xoá, xác nhận không ảnh
  hưởng phần còn lại của project (kiểm tra mtime các file gốc).
- `react-native run-android` tự spawn Metro trong background nhưng tiến trình
  Metro bị kill khi shell command kết thúc → app hiện lỗi "Unable to load
  script" lần build đầu. Xử lý: chạy Metro riêng (`npx react-native start`)
  làm tiến trình nền độc lập, sau đó force-stop và mở lại app.
- Jest báo `SyntaxError: Unexpected token 'export'` khi import
  `@react-navigation/native` vì package này ship ESM và không nằm trong
  `transformIgnorePatterns` mặc định của `@react-native/jest-preset` → thêm
  pattern loại trừ `@react-navigation` khỏi ignore list.

**Vấn đề còn lại:**

- `npm audit` báo 9 lỗ hổng mức "high" — đến từ transitive dependencies của RN
  template mặc định (chưa điều tra chi tiết). Chưa chạy `npm audit fix --force`
  vì có thể đổi version React Native ngoài ý muốn. Sẽ xem lại khi bắt đầu Phase
  2 nếu cần.
- Chưa test trên thiết bị Android thật (mới test trên emulator) — theo spec,
  việc test thiết bị thật + máy in thật là yêu cầu ở Phase 7 trở đi và
  Integration Test (Phase 9), không phải Phase 1.
- `ANDROID_HOME` chưa được set cố định trong shell profile của máy dev này —
  hiện dựa vào `android/local.properties`. Nếu chạy `adb`/`emulator` từ dòng
  lệnh ngoài project cần export `ANDROID_HOME` thủ công.
