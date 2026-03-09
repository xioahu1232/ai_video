'use client';

import React, { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, Loader2, Gift } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onRegister: (email: string, password: string, name?: string, inviteCode?: string) => Promise<{ success: boolean; error?: string }>;
}

export function AuthModal({ isOpen, onClose, onLogin, onRegister }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      let result;
      if (mode === 'login') {
        result = await onLogin(email, password);
      } else {
        result = await onRegister(email, password, name || undefined, inviteCode || undefined);
      }

      if (result.success) {
        onClose();
        setEmail('');
        setPassword('');
        setName('');
        setInviteCode('');
      } else {
        setError(result.error || '操作失败');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md overflow-hidden animate-fadeInUp">
        {/* 头部 */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-gray-100">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 icon-container primary">
              {mode === 'login' ? (
                <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-[#4fa3d1]" />
              ) : (
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-[#4fa3d1]" />
              )}
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800">
                {mode === 'login' ? '登录账号' : '注册账号'}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                {mode === 'login' ? '登录后可同步历史记录' : '创建账号保存您的数据'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {mode === 'register' && (
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-semibold text-gray-700">用户名</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入用户名"
                  className="w-full h-11 sm:h-12 pl-11 sm:pl-12 pr-4 input-field text-gray-800 text-sm sm:text-base"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-gray-700">
              邮箱 <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入邮箱"
                required
                className="w-full h-11 sm:h-12 pl-11 sm:pl-12 pr-4 input-field text-gray-800 text-sm sm:text-base"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-gray-700">
              密码 <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                required
                minLength={6}
                className="w-full h-11 sm:h-12 pl-11 sm:pl-12 pr-11 sm:pr-12 input-field text-gray-800 text-sm sm:text-base"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-semibold text-gray-700">
                邀请码 <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Gift className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="请输入邀请码（格式：REG-XXXX-XXXX-XXXX）"
                  required
                  className="w-full h-11 sm:h-12 pl-11 sm:pl-12 pr-4 input-field text-gray-800 text-sm sm:text-base uppercase"
                />
              </div>
              <p className="text-xs text-gray-500">
                新用户注册需要有效邀请码，注册成功后可获得1次免费体验额度
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 sm:p-4 bg-red-50 rounded-lg sm:rounded-xl text-red-500 text-xs sm:text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 sm:h-12 btn-primary text-sm sm:text-base flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                处理中...
              </>
            ) : (
              mode === 'login' ? '登录' : '注册'
            )}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={switchMode}
              className="text-xs sm:text-sm text-[#4fa3d1] hover:underline"
            >
              {mode === 'login' ? '没有账号？立即注册' : '已有账号？立即登录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
