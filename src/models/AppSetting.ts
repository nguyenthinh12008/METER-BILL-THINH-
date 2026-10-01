// Cấu hình đơn vị điện lực / nhân viên thu tiền, in trên mọi hóa đơn (xem mapping
// nội dung in hóa đơn trong ARCHITECTURE.md). Chưa có màn hình chỉnh sửa —
// SettingsRepository là nơi duy nhất đọc/ghi các key này cho tới khi có UI Settings.
export type AppSettingKey =
  | 'companyName'
  | 'hotline'
  | 'collectorName'
  | 'collectorPhone'
  | 'bankAccountNumber'
  | 'bankName';

export type AppSettings = Record<AppSettingKey, string>;
