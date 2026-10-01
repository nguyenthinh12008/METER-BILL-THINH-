import React, { createContext, useContext, useMemo, useState } from 'react';

import { AuthService } from '../services/AuthService';
import type { NewUserInput, User } from '../models/User';

interface AuthContextValue {
  currentUser: User | null;
  hasAnyAccount: boolean;
  /** Throw nếu sai thông tin đăng nhập — Screen tự bắt để hiển thị lỗi. */
  login: (username: string, password: string) => void;
  /**
   * Throw nếu dữ liệu không hợp lệ. Nếu trước đó chưa đăng nhập (bootstrap lần
   * đầu), tự đăng nhập luôn vào tài khoản vừa tạo; nếu đã đăng nhập (thêm tài
   * khoản đồng nghiệp) thì giữ nguyên phiên đăng nhập hiện tại.
   */
  register: (input: NewUserInput) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const authService = new AuthService();

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasAnyAccount, setHasAnyAccount] = useState(() => authService.hasAnyAccount());

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      hasAnyAccount,
      login: (username: string, password: string) => {
        const user = authService.login(username, password);
        setCurrentUser(user);
      },
      register: (input: NewUserInput) => {
        const user = authService.register(input);
        setHasAnyAccount(true);
        setCurrentUser(previous => previous ?? user);
      },
      logout: () => setCurrentUser(null),
    }),
    [currentUser, hasAnyAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth() phải được gọi bên trong AuthProvider');
  }
  return context;
}
