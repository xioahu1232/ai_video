'use client';

import { useState, useEffect } from 'react';
import { X, Gift, Sparkles } from 'lucide-react';
import Confetti from './Confetti';

/**
 * 首次登录欢迎弹窗
 * 
 * 新用户注册成功后首次登录时显示
 * 展示精美的欢迎动画和礼花效果
 */

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  freeCredits?: number;
}

export default function WelcomeModal({
  isOpen,
  onClose,
  userName = '新用户',
  freeCredits = 5,
}: WelcomeModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      // 延迟启动动画
      setTimeout(() => {
        setAnimateIn(true);
        setShowConfetti(true);
      }, 100);
    } else {
      setAnimateIn(false);
      setTimeout(() => {
        setVisible(false);
        setShowConfetti(false);
      }, 300);
    }
  }, [isOpen]);

  const handleClose = () => {
    setAnimateIn(false);
    setTimeout(() => {
      setShowConfetti(false);
      onClose();
    }, 300);
  };

  if (!visible) return null;

  return (
    <>
      {/* 礼花动效 */}
      <Confetti
        isActive={showConfetti}
        duration={5000}
        particleCount={200}
        onComplete={() => setShowConfetti(false)}
      />

      {/* 背景遮罩 */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[9990] transition-opacity duration-300 ${
          animateIn ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* 弹窗主体 */}
      <div
        className={`fixed inset-0 z-[9991] flex items-center justify-center p-4 transition-all duration-500 ${
          animateIn ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        <div
          className="relative w-full max-w-md bg-gradient-to-br from-[#1a3a6b] via-[#2a4a7b] to-[#1a3a6b] rounded-3xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 装饰性背景 */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#4fa3d1]/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#4fa3d1]/20 rounded-full blur-3xl" />
            {/* 闪烁的星星装饰 */}
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white/30 rounded-full animate-pulse"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random()}s`,
                }}
              />
            ))}
          </div>

          {/* 关闭按钮 */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors z-10"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>

          {/* 内容区域 */}
          <div className="relative p-8 pt-10 text-center">
            {/* 礼物图标 */}
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-[#4fa3d1]/30 rounded-full blur-xl animate-pulse" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-[#4fa3d1] to-[#1a3a6b] rounded-full flex items-center justify-center shadow-lg">
                <Gift className="w-12 h-12 text-white" />
              </div>
              {/* 闪烁光芒 */}
              <div className="absolute -inset-4">
                <Sparkles className="absolute top-0 left-1/2 w-5 h-5 text-yellow-300 animate-bounce" style={{ animationDelay: '0s' }} />
                <Sparkles className="absolute bottom-0 right-0 w-4 h-4 text-yellow-300 animate-bounce" style={{ animationDelay: '0.2s' }} />
                <Sparkles className="absolute top-1/2 left-0 w-4 h-4 text-yellow-300 animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>

            {/* 欢迎文字 */}
            <h2 className="text-2xl font-bold text-white mb-2">
              欢迎来到长风跨境
            </h2>
            <p className="text-white/70 mb-6">
              {userName}，感谢您的注册！
            </p>

            {/* 赠送额度卡片 */}
            <div className="relative bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl p-6 mb-6 border border-amber-500/30">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1 rounded-full text-xs font-bold text-white shadow-lg">
                新人福利
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">
                  {freeCredits}
                </span>
                <span className="text-2xl text-amber-300">次</span>
              </div>
              <p className="text-amber-200/80 text-sm">免费体验额度已到账</p>
            </div>

            {/* 提示信息 */}
            <p className="text-white/50 text-sm mb-6">
              使用 AI 视频 prompt 生成器，让您的产品展示更出彩
            </p>

            {/* 开始体验按钮 */}
            <button
              onClick={handleClose}
              className="w-full h-12 bg-gradient-to-r from-[#4fa3d1] to-[#1a3a6b] hover:from-[#5fb3e1] hover:to-[#2a4a8b] text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              立即开始体验
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
