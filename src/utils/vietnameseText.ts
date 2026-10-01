// Bảng ánh xạ tường minh từng ký tự tiếng Việt có dấu → ASCII. Không dùng
// String.prototype.normalize() — rủi ro thiếu dữ liệu Unicode decomposition
// trên Hermes (cùng lý do đã tránh Intl.NumberFormat ở utils/currency.ts).
const DIACRITIC_MAP: Record<string, string> = {};

function addGroup(base: string, accented: string[]): void {
  for (const ch of accented) {
    DIACRITIC_MAP[ch] = base;
  }
}

addGroup('a', ['à', 'á', 'ạ', 'ả', 'ã', 'â', 'ầ', 'ấ', 'ậ', 'ẩ', 'ẫ', 'ă', 'ằ', 'ắ', 'ặ', 'ẳ', 'ẵ']);
addGroup('e', ['è', 'é', 'ẹ', 'ẻ', 'ẽ', 'ê', 'ề', 'ế', 'ệ', 'ể', 'ễ']);
addGroup('i', ['ì', 'í', 'ị', 'ỉ', 'ĩ']);
addGroup('o', ['ò', 'ó', 'ọ', 'ỏ', 'õ', 'ô', 'ồ', 'ố', 'ộ', 'ổ', 'ỗ', 'ơ', 'ờ', 'ớ', 'ợ', 'ở', 'ỡ']);
addGroup('u', ['ù', 'ú', 'ụ', 'ủ', 'ũ', 'ư', 'ừ', 'ứ', 'ự', 'ử', 'ữ']);
addGroup('y', ['ỳ', 'ý', 'ỵ', 'ỷ', 'ỹ']);
addGroup('d', ['đ']);

addGroup('A', ['À', 'Á', 'Ạ', 'Ả', 'Ã', 'Â', 'Ầ', 'Ấ', 'Ậ', 'Ẩ', 'Ẫ', 'Ă', 'Ằ', 'Ắ', 'Ặ', 'Ẳ', 'Ẵ']);
addGroup('E', ['È', 'É', 'Ẹ', 'Ẻ', 'Ẽ', 'Ê', 'Ề', 'Ế', 'Ệ', 'Ể', 'Ễ']);
addGroup('I', ['Ì', 'Í', 'Ị', 'Ỉ', 'Ĩ']);
addGroup('O', ['Ò', 'Ó', 'Ọ', 'Ỏ', 'Õ', 'Ô', 'Ồ', 'Ố', 'Ộ', 'Ổ', 'Ỗ', 'Ơ', 'Ờ', 'Ớ', 'Ợ', 'Ở', 'Ỡ']);
addGroup('U', ['Ù', 'Ú', 'Ụ', 'Ủ', 'Ũ', 'Ư', 'Ừ', 'Ứ', 'Ự', 'Ử', 'Ữ']);
addGroup('Y', ['Ỳ', 'Ý', 'Ỵ', 'Ỷ', 'Ỹ']);
addGroup('D', ['Đ']);

/** Bỏ dấu tiếng Việt về ASCII — dùng trước khi in ESC/POS (xem EscPosService.ts). */
export function stripDiacritics(text: string): string {
  let result = '';
  for (const ch of text) {
    result += DIACRITIC_MAP[ch] ?? ch;
  }
  return result;
}
