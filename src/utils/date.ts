function formatISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** period dạng "MM/YYYY" (quy ước của meter_readings.period) → khoảng ngày ISO của tháng đó. */
export function getMonthRange(period: string): { from: string; to: string } {
  const [monthStr, yearStr] = period.split('/');
  const month = Number(monthStr);
  const year = Number(yearStr);
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0);
  return { from: formatISODate(from), to: formatISODate(to) };
}

/** Kỳ hiện tại dạng "MM/YYYY" — nhận `date` tuỳ chọn để test không phụ thuộc đồng hồ hệ thống. */
export function getCurrentPeriod(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${month}/${date.getFullYear()}`;
}

/** ISO datetime → "DD/MM/YYYY HH:mm", dùng cho dòng "Thời gian" khi in hóa đơn. */
export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
