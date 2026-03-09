'use client';

import React, { useState } from 'react';
import { X, Gift, Loader2, AlertCircle, Sparkles, PartyPopper, QrCode, MessageCircle } from 'lucide-react';
import Image from 'next/image';

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
  const [redeemedAmount, setRedeemedAmount] = useState(0);

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
        setRedeemedAmount(data.amount);
        
        // 延迟关闭，让用户看到成功状态
        setTimeout(() => {
          onSuccess(data.amount);
          onClose();
          setCode('');
          setStatus('idle');
          setRedeemedAmount(0);
        }, 2000);
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
      <div className={`card w-full max-w-md overflow-hidden transition-all duration-500 ${
        status === 'success' ? 'ring-4 ring-emerald-400/50 scale-105' : 'animate-fadeInUp'
      }`}>
        {/* 成功状态的背景动效 */}
        {status === 'success' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-400/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
        )}

        {/* 头部 */}
        <div className={`relative flex items-center justify-between p-5 sm:p-6 border-b transition-colors duration-300 ${
          status === 'success' ? 'border-emerald-200 bg-emerald-50' : 'border-gray-100'
        }`}>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
              status === 'success' 
                ? 'bg-emerald-100 animate-bounce' 
                : 'bg-[#4fa3d1]/10'
            }`}>
              {status === 'success' ? (
                <PartyPopper className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
              ) : (
                <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-[#4fa3d1]" />
              )}
            </div>
            <div>
              <h3 className={`text-lg sm:text-xl font-semibold transition-colors duration-300 ${
                status === 'success' ? 'text-emerald-700' : 'text-gray-800'
              }`}>
                {status === 'success' ? '兑换成功！' : '兑换使用额度'}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                {status === 'success' ? '恭喜您获得更多使用次数' : '输入兑换码获得使用次数'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors ${
              status === 'success' ? 'text-emerald-500' : ''
            }`}
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="relative p-5 sm:p-6 space-y-4">
          {status !== 'success' ? (
            <>
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
                  disabled={isLoading}
                />
              </div>

              {status === 'error' && (
                <div className="flex items-center gap-2 p-3 sm:p-4 bg-red-50 rounded-lg sm:rounded-xl text-red-500 text-xs sm:text-sm animate-shake">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span>{message}</span>
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
                    兑换中...
                  </>
                ) : (
                  '立即兑换'
                )}
              </button>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-center text-xs text-gray-500 mb-3">
                  没有兑换码？联系管理员获取
                </p>
                <div className="flex items-center justify-center gap-3">
                  <div className="bg-gray-50 p-2 rounded-lg">
                    <Image
                      src="https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F50998985b708600651cbaa34e65c607c.jpg&nonce=20a2c68f-6399-4831-a186-860fb48e8928&project_id=7615252896803864582&sign=0fb25f951062fc9d0477443e0c985b30c922f4c1bc30cc3b89293be746b2aad3"
                      alt="微信二维码"
                      width={60}
                      height={60}
                      className="rounded"
                      unoptimized
                    />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <MessageCircle className="w-4 h-4 text-[#4fa3d1]" />
                      扫码添加微信
                    </p>
                    <p className="text-xs text-gray-500 mt-1">购买额度 · 吐槽建议</p>
                    <p className="text-xs text-[#4fa3d1]">优质反馈送免费额度</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6 sm:py-8">
              {/* 成功动画 */}
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-emerald-400/30 rounded-full blur-xl animate-ping" />
                <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
              </div>
              
              {/* 成功信息 */}
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-emerald-600">
                    +{redeemedAmount}
                  </span>
                  <span className="text-2xl sm:text-3xl text-emerald-600 font-medium">次</span>
                </div>
                <p className="text-emerald-600 font-medium">使用额度已到账</p>
              </div>

              {/* 装饰星星 */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(6)].map((_, i) => (
                  <Sparkles
                    key={i}
                    className="absolute w-4 h-4 text-yellow-400 animate-pulse"
                    style={{
                      top: `${20 + Math.random() * 60}%`,
                      left: `${10 + Math.random() * 80}%`,
                      animationDelay: `${Math.random() * 0.5}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
