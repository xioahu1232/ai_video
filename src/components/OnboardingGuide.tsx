'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Lightbulb, Image, Settings, Sparkles, MousePointer, HelpCircle } from 'lucide-react';

// 引导步骤配置
const GUIDE_STEPS = [
  {
    id: 'welcome',
    title: '欢迎使用AI视频提示词生成器',
    description: '只需3步，即可生成专业的视频提示词，让您的产品视频更具吸引力。',
    icon: Sparkles,
    highlight: null,
  },
  {
    id: 'input',
    title: '输入产品卖点',
    description: '在这里输入您的产品核心卖点，描述越详细，生成的提示词越精准。',
    icon: Lightbulb,
    highlight: 'input',
  },
  {
    id: 'image',
    title: '上传产品图片',
    description: '点击或拖拽上传产品图片，支持JPG、PNG格式，系统会自动压缩优化。',
    icon: Image,
    highlight: 'image',
  },
  {
    id: 'settings',
    title: '选择时长和语言',
    description: '根据需要选择视频时长预设和输出语言，支持20+种语言。',
    icon: Settings,
    highlight: 'settings',
  },
  {
    id: 'generate',
    title: '开始生成',
    description: '点击生成按钮，AI将为您生成Sora和Seedance两种格式的提示词。',
    icon: MousePointer,
    highlight: 'generate',
  },
];

interface GuideStepProps {
  step: typeof GUIDE_STEPS[0];
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  position?: { top?: string; bottom?: string; left?: string; right?: string };
}

// 单个引导步骤组件
function GuideStep({ step, currentStep, totalSteps, onNext, onPrev, onSkip, position }: GuideStepProps) {
  const Icon = step.icon;
  const isLast = currentStep === totalSteps - 1;
  const isFirst = currentStep === 0;

  return (
    <div 
      className="fixed z-[9999] animate-in fade-in-0 zoom-in-95 duration-300"
      style={position || { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-[90vw] overflow-hidden">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-[#1a3a6b] to-[#4fa3d1] p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Icon className="w-6 h-6" />
            </div>
            <button
              onClick={onSkip}
              className="text-white/70 hover:text-white transition-colors text-sm"
            >
              跳过引导
            </button>
          </div>
          <h3 className="text-xl font-bold">{step.title}</h3>
        </div>

        {/* 内容 */}
        <div className="p-6">
          <p className="text-gray-600 leading-relaxed">{step.description}</p>

          {/* 进度指示器 */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentStep 
                    ? 'w-8 bg-[#4fa3d1]' 
                    : i < currentStep 
                      ? 'w-2 bg-[#1a3a6b]' 
                      : 'w-2 bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* 步骤数字 */}
          <div className="text-center mt-3 text-sm text-gray-400">
            第 {currentStep + 1} 步，共 {totalSteps} 步
          </div>

          {/* 按钮 */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={onPrev}
              disabled={isFirst}
              className={`flex items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                isFirst 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              上一步
            </button>

            {isLast ? (
              <button
                onClick={onSkip}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#1a3a6b] to-[#4fa3d1] text-white rounded-lg hover:shadow-lg transition-all"
              >
                开始使用
                <Sparkles className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onNext}
                className="flex items-center gap-1 px-6 py-2 bg-[#4fa3d1] text-white rounded-lg hover:bg-[#1a3a6b] transition-all"
              >
                下一步
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 遮罩层组件
function Overlay({ highlightElement }: { highlightElement: string | null }) {
  return (
    <div className="fixed inset-0 z-[9998] pointer-events-none">
      {/* 半透明遮罩 */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* 高亮区域（如果有） */}
      {highlightElement && (
        <div 
          data-highlight={highlightElement}
          className="absolute bg-transparent ring-4 ring-[#4fa3d1] rounded-xl"
        />
      )}
    </div>
  );
}

// 帮助按钮组件
export function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-[#4fa3d1] hover:bg-[#1a3a6b] text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
      title="使用帮助"
    >
      <HelpCircle className="w-6 h-6" />
    </button>
  );
}

// 重置引导状态（用于重新显示）
export function resetOnboardingGuide() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('onboarding_completed');
  }
}

// 主组件
export function OnboardingGuide() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenGuide, setHasSeenGuide] = useState(false);

  // 检查是否需要显示引导
  useEffect(() => {
    const seen = localStorage.getItem('onboarding_completed');
    if (!seen) {
      // 延迟显示，让页面先加载完成
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
    setHasSeenGuide(true);
  }, []);

  // 标记引导完成
  const completeGuide = useCallback(() => {
    localStorage.setItem('onboarding_completed', 'true');
    setIsVisible(false);
    setHasSeenGuide(true);
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < GUIDE_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  if (!isVisible) {
    return null;
  }

  const step = GUIDE_STEPS[currentStep];

  return (
    <>
      <Overlay highlightElement={step.highlight} />
      <GuideStep
        step={step}
        currentStep={currentStep}
        totalSteps={GUIDE_STEPS.length}
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={completeGuide}
      />
    </>
  );
}
