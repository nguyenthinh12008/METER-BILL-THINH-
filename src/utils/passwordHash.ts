import sha256 from 'js-sha256';

// Băm mật khẩu = lặp SHA-256 nhiều vòng (tự làm "key stretching" thủ công)
// thay vì dùng bcrypt/Argon2 thật — vì bcryptjs/crypto-js đều có
// require('crypto') tĩnh mà Metro không resolve được trong RN (đã kiểm chứng
// khi lên kế hoạch tính năng này). Chấp nhận được vì app offline 1 thiết bị,
// không có endpoint đăng nhập qua mạng để bị brute-force từ xa — KHÔNG mạnh
// bằng bcrypt/Argon2 thật, chỉ phù hợp với mức độ rủi ro của app này.
const STRETCH_ROUNDS = 10000;

function stretch(value: string, rounds: number): string {
  let result = value;
  for (let i = 0; i < rounds; i += 1) {
    result = sha256(result);
  }
  return result;
}

function randomSalt(): string {
  // Salt không cần bí mật/CSPRNG — chỉ cần khác nhau giữa các user để chống
  // rainbow table, nên Math.random() là đủ dùng ở đây.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function hashNewPassword(password: string): { hash: string; salt: string } {
  const salt = randomSalt();
  return { hash: stretch(`${salt}:${password}`, STRETCH_ROUNDS), salt };
}

export function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string,
): boolean {
  return stretch(`${salt}:${password}`, STRETCH_ROUNDS) === expectedHash;
}
