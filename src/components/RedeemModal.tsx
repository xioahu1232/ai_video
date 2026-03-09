'use client';

import React, { useState } from 'react';
import { X, Gift, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface RedeemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (amount: number) => void;
  token: string;
}

export function RedeemModal({ isOpen, onClose, onSuccess, token }: RedeemModalProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      setStatus('error');
      setMessage('请输入兑换码');
      return;
    }

    setIsLoading(true);
    setStatus('idle');

    try {
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message);
        setTimeout(() => {
          onSuccess(data.amount);
          onClose();
          setCode('');
          setStatus('idle');
        }, 1500);
      } else {
        setStatus('error');
        setMessage(data.error || '兑换失败');
      }
    } catch (error) {
      console.error('Redeem error:', error);
      setStatus('error');
      setMessage('兑换失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md overflow-hidden animate-fadeInUp">
        {/* 头部 */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-gray-100">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 icon-container primary">
              <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-[#4fa3d1]" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800">
                兑换使用额度
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                输入兑换码获得使用次数
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
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-gray-700">
              兑换码 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="请输入兑换码，如：CF-XXXX-XXXX-XXXX"
              className="w-full h-11 sm:h-12 px-4 input-field text-gray-800 text-sm sm:text-base uppercase tracking-wider font-mono"
              disabled={isLoading || status === 'success'}
            />
          </div>

          {status === 'success' && (
            <div className="flex items-center gap-2 p-3 sm:p-4 bg-emerald-50 rounded-lg sm:rounded-xl text-emerald-600 text-xs sm:text-sm">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-2 p-3 sm:p-4 bg-red-50 rounded-lg sm:rounded-xl text-red-500 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || status === 'success'}
            className="w-full h-11 sm:h-12 btn-primary text-sm sm:text-base flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                兑换中...
              </>
            ) : (
              '立即兑换'
            )}
          </button>

          <div className="text-center text-xs text-gray-400">
            兑换码由管理员发放，可联系客服购买
          </div>
        </form>
      </div>
    </div>
  );
}
