'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role?: string; // 用户角色：user, admin
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean; // 是否是管理员
  isNewUser: boolean; // 是否是新注册用户（首次登录）
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name?: string, inviteCode?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  clearNewUserFlag: () => void; // 清除新用户标记
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // 从 localStorage 恢复登录状态
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');

    if (savedToken && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(userData);
        setIsAdmin(userData.role === 'admin');

        // 验证 token 是否有效
        fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${savedToken}` },
        })
          .then((res) => res.json())
          .then((data) => {
            if (!data.success) {
              // token 无效，清除登录状态
              localStorage.removeItem('auth_token');
              localStorage.removeItem('auth_user');
              setToken(null);
              setUser(null);
              setIsAdmin(false);
            } else if (data.user?.role) {
              // 更新角色信息
              setUser(prev => prev ? { ...prev, role: data.user.role } : null);
              setIsAdmin(data.user.role === 'admin');
            }
          })
          .catch(() => {
            // 网络错误，保持当前状态
          })
          .finally(() => {
            setIsLoading(false);
          });
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setIsLoading(false);
        setIsAdmin(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!data.success) {
        return { success: false, error: data.error || '登录失败' };
      }

      // 保存登录状态
      localStorage.setItem('auth_token', data.session.access_token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      setToken(data.session.access_token);
      setUser(data.user);
      setIsAdmin(data.user?.role === 'admin');

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: '登录失败，请稍后重试' };
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string, inviteCode?: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, inviteCode }),
      });

      const data = await res.json();

      if (!data.success) {
        return { success: false, error: data.error || '注册失败' };
      }

      // 注册成功后自动登录，并标记为新用户
      setIsNewUser(true);
      return login(email, password);
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: '注册失败，请稀后重试' };
    }
  }, [login]);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
    setIsAdmin(false);
    setIsNewUser(false);
  }, []);

  const clearNewUserFlag = useCallback(() => {
    setIsNewUser(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isAdmin, isNewUser, login, register, logout, clearNewUserFlag }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
