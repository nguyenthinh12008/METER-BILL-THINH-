const MIN_LENGTH = 8;
const MAX_LENGTH = 32;

// Dùng Set thay vì regex character class để khỏi phải escape thủ công các ký
// tự đặc biệt của chính regex (], \, -, ^...) nằm trong tập ký tự được phép.
const SPECIAL_CHARS = new Set('!@#$%^&*()_+-=[]{};:\'",.<>/?\\|`~'.split(''));

export const PASSWORD_POLICY_HINT =
  'Mật khẩu 8-32 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt, không chứa khoảng trắng';

/** Trả về thông báo lỗi của điều kiện đầu tiên không thỏa, hoặc null nếu hợp lệ. */
export function validatePassword(password: string): string | null {
  if (password.length < MIN_LENGTH || password.length > MAX_LENGTH) {
    return `Mật khẩu phải có từ ${MIN_LENGTH} đến ${MAX_LENGTH} ký tự`;
  }
  if (!/[A-Z]/.test(password)) {
    return 'Mật khẩu phải có ít nhất 1 chữ in hoa';
  }
  if (!/[a-z]/.test(password)) {
    return 'Mật khẩu phải có ít nhất 1 chữ thường';
  }
  if (!/[0-9]/.test(password)) {
    return 'Mật khẩu phải có ít nhất 1 chữ số';
  }
  if (![...password].some(ch => SPECIAL_CHARS.has(ch))) {
    return 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt';
  }
  if (/\s/.test(password)) {
    return 'Mật khẩu không được chứa khoảng trắng';
  }
  return null;
}
