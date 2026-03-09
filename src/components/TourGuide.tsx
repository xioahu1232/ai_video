'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Sparkles, HelpCircle } from 'lucide-react';

type TourPosition = 'center' | 'top' | 'right' | 'bottom' | 'left';

// 引导步骤定义
const TOUR_STEPS: Array<{
  id: string;
  title: string;
  content: string;
  target: string | null;
  position: TourPosition;
}> = [
  {
    id: 'welcome',
    title: '欢迎使用长风跨境Prompt智能体',
    content: '这是一个AI视频提示词生成器，帮助您快速生成高质量的视频制作提示词。让我们开始了解如何使用它吧！',
    target: null,
    position: 'center',
  },
  {
    id: 'selling-point',
    title: '填写核心卖点',
    content: '在这里输入您产品的核心卖点，例如：30天见效、无副作用、天然成分等。AI会根据这些卖点生成针对性的视频脚本。',
    target: '[data-tour="selling-point"]',
    position: 'right',
  },
  {
    id: 'product-image',
    title: '上传产品图片',
    content: '上传您的产品图片，AI会自动分析产品特征并生成更精准的提示词。支持JPG、PNG格式，系统会自动压缩优化。',
    target: '[data-tour="product-image"]',
    position: 'right',
  },
  {
    id: 'duration',
    title: '设置视频时长',
    content: '选择预设时长或自定义设置。短视频适合快速展示，长视频适合详细讲解。口播时长是AI配音时长，视频时长是最终视频长度。',
    target: '[data-tour="duration"]',
    position: 'right',
  },
  {
    id: 'language',
    title: '选择目标语言',
    content: '支持20+种语言选择，覆盖全球主要市场。选择您的目标市场语言，AI会生成对应语言的视频提示词。',
    target: '[data-tour="language"]',
    position: 'right',
  },
  {
    id: 'submit',
    title: '开始生成',
    content: '填写完成后点击"开始生成"按钮，AI会自动分析产品并生成Sora和Seedance两种视频提示词。每次生成消耗1次额度。',
    target: '[data-tour="submit"]',
    position: 'right',
  },
  {
    id: 'history',
    title: '历史记录',
    content: '所有生成记录都会保存在这里。您可以查看、复制、收藏、导出提示词。未收藏的记录48小时后自动删除，收藏的记录永久保存。',
    target: '[data-tour="history"]',
    position: 'left',
  },
  {
    id: 'balance',
    title: '额度管理',
    content: '点击余额查看当前剩余次数，点击"兑换"可使用兑换码充值。新用户注册赠送5次免费体验额度。',
    target: '[data-tour="balance"]',
    position: 'bottom',
  },
];

interface TourGuideProps {
  onComplete?: () => void;
}

// 检测是否为移动端
const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
};

export function TourGuide({ onComplete }: TourGuideProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // 检测是否需要显示引导
  useEffect(() => {
    const hasCompletedTour = localStorage.getItem('tour_completed');
    if (!hasCompletedTour) {
      const timer = setTimeout(() => {
        setIsActive(true);
        setIsMobileDevice(isMobile());
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // 监听屏幕尺寸变化
  useEffect(() => {
    const handleResize = () => {
      setIsMobileDevice(isMobile());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 更新目标元素位置
  const updateTargetPosition = useCallback(() => {
    const step = TOUR_STEPS[currentStep];
    if (!step.target) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(step.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [currentStep]);

  useEffect(() => {
    if (isActive) {
      updateTargetPosition();
      window.addEventListener('resize', updateTargetPosition);
      window.addEventListener('scroll', updateTargetPosition, true);
      return () => {
        window.removeEventListener('resize', updateTargetPosition);
        window.removeEventListener('scroll', updateTargetPosition, true);
      };
    }
  }, [isActive, updateTargetPosition]);

  // 滚动到目标元素
  useEffect(() => {
    if (isActive && currentStep > 0) {
      const step = TOUR_STEPS[currentStep];
      if (step.target) {
        const element = document.querySelector(step.target);
        if (element) {
          // 移动端滚动时留出底部空间给提示框
          if (isMobileDevice) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    }
  }, [currentStep, isActive, isMobileDevice]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setIsActive(false);
    localStorage.setItem('tour_completed', 'true');
    onComplete?.();
  };

  const step = TOUR_STEPS[currentStep];

  // 计算提示框位置（桌面端）
  const getTooltipStyleDesktop = (): React.CSSProperties => {
    if (step.position === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    if (!targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const tooltipWidth = 360;
    const tooltipHeight = 200;
    const gap = 16;

    switch (step.position) {
      case 'right':
        return {
          top: Math.max(16, Math.min(targetRect.top + targetRect.height / 2 - tooltipHeight / 2, window.innerHeight - tooltipHeight - 16)),
          left: targetRect.right + gap,
        };
      case 'left':
        return {
          top: Math.max(16, Math.min(targetRect.top + targetRect.height / 2 - tooltipHeight / 2, window.innerHeight - tooltipHeight - 16)),
          left: Math.max(16, targetRect.left - tooltipWidth - gap),
        };
      case 'bottom':
        return {
          top: targetRect.bottom + gap,
          left: Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 16)),
        };
      case 'top':
        return {
          top: Math.max(16, targetRect.top - tooltipHeight - gap),
          left: Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 16)),
        };
      default:
        return {};
    }
  };

  // 计算提示框位置（移动端）
  const getTooltipStyleMobile = (): React.CSSProperties => {
    // 移动端固定在底部
    if (step.position === 'center') {
      return {
        bottom: '16px',
        left: '16px',
        right: '16px',
        width: 'auto',
      };
    }
    return {
      bottom: '16px',
      left: '16px',
      right: '16px',
      width: 'auto',
    };
  };

  // 计算提示框位置
  const getTooltipStyle = (): React.CSSProperties => {
    if (isMobileDevice) {
      return getTooltipStyleMobile();
    }
    return getTooltipStyleDesktop();
  };

  // 计算高亮区域
  const getHighlightStyle = (): React.CSSProperties | null => {
    if (!targetRect || step.position === 'center') return null;
    
    return {
      top: targetRect.top - 4,
      left: targetRect.left - 4,
      width: targetRect.width + 8,
      height: targetRect.height + 8,
    };
  };

  if (!isActive) return null;

  const highlightStyle = getHighlightStyle();

  return (
    <>
      {/* 遮罩层 */}
      <div className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm transition-opacity" />
      
      {/* 高亮区域 */}
      {highlightStyle && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={highlightStyle}
        >
          <div className="w-full h-full rounded-xl border-2 border-[#4fa3d1] shadow-[0_0_20px_rgba(79,163,209,0.5)] animate-pulse" />
        </div>
      )}
      
      {/* 提示框 */}
      <div
        className={`fixed z-[10000] ${isMobileDevice ? '' : 'w-[320px] sm:w-[360px]'}`}
        style={getTooltipStyle()}
      >
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
          {/* 头部 */}
          <div className="bg-gradient-to-r from-[#1a3a6b] to-[#4fa3d1] px-4 sm:px-5 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                <span className="text-white font-semibold text-xs sm:text-sm">
                  步骤 {currentStep + 1}/{TOUR_STEPS.length}
                </span>
              </div>
              <button
                onClick={handleSkip}
                className="text-white/80 hover:text-white transition-colors p-1"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
          
          {/* 内容 */}
          <div className="p-4 sm:p-5">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-1.5 sm:mb-2">{step.title}</h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{step.content}</p>
          </div>
          
          {/* 底部 */}
          <div className="px-4 sm:px-5 py-3 sm:py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center justify-between">
              {/* 进度指示器 - 移动端隐藏 */}
              <div className="hidden sm:flex gap-1.5">
                {TOUR_STEPS.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentStep
                        ? 'bg-[#4fa3d1] w-6'
                        : index < currentStep
                        ? 'bg-[#4fa3d1]/50'
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              
              {/* 移动端进度显示 */}
              <div className="sm:hidden text-xs text-gray-500">
                {currentStep + 1} / {TOUR_STEPS.length}
              </div>
              
              <div className="flex items-center gap-1.5 sm:gap-2">
                {currentStep > 0 && (
                  <button
                    onClick={handlePrev}
                    className="flex items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">上一步</span>
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="flex items-center gap-0.5 sm:gap-1 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-[#4fa3d1] hover:bg-[#3d8ab8] rounded-lg transition-colors"
                >
                  {currentStep === TOUR_STEPS.length - 1 ? '完成' : '下一步'}
                  {currentStep < TOUR_STEPS.length - 1 && <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// 帮助按钮组件
export function TourHelpButton() {
  const [showTour, setShowTour] = useState(false);

  const handleStartTour = () => {
    setShowTour(false);
    requestAnimationFrame(() => {
      setShowTour(true);
    });
    localStorage.removeItem('tour_completed');
  };

  return (
    <>
      <button
        onClick={handleStartTour}
        className="fixed bottom-20 sm:bottom-6 right-6 z-[9990] w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#4fa3d1] hover:bg-[#3d8ab8] text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center group"
        title="新手引导"
      >
        <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6" />
        <span className="absolute right-full mr-3 px-3 py-1.5 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden sm:block">
          新手引导
        </span>
      </button>
      
      {showTour && <TourGuide onComplete={() => setShowTour(false)} />}
    </>
  );
}

export default TourGuide;
