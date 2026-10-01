export interface User {
  id: number;
  username: string;
  fullName: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
}

/** Chứa cả field bảo mật — chỉ dùng nội bộ UserRepository/AuthService, không đưa ra UI. */
export interface UserWithCredentials extends User {
  passwordHash: string;
  passwordSalt: string;
}

export interface NewUserInput {
  username: string;
  fullName: string;
  phone: string;
  password: string;
}
