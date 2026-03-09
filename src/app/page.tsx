'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Upload, Loader2, CheckCircle2, XCircle, 
  Copy, Check, ChevronDown, ChevronUp, Trash2, 
  ImageIcon, Wand2, Star,
  Edit3, X, Clock, Video, Sparkles, Globe,
  Zap, Brain, Eye, Lightbulb, PenTool, FileText
} from 'lucide-react';
import Image from 'next/image';

// 语言选项
const LANGUAGES = [
  { value: 'zh', label: '中文', native: '中文', flag: '🇨🇳' },
  { value: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
  { value: 'hi', label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { value: 'es', label: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { value: 'fr', label: 'French', native: 'Français', flag: '🇫🇷' },
  { value: 'ar', label: 'Arabic', native: 'العربية', flag: '🇸🇦' },
  { value: 'bn', label: 'Bengali', native: 'বাংলা', flag: '🇧🇩' },
  { value: 'pt', label: 'Portuguese', native: 'Português', flag: '🇧🇷' },
  { value: 'ru', label: 'Russian', native: 'Русский', flag: '🇷🇺' },
  { value: 'ja', label: 'Japanese', native: '日本語', flag: '🇯🇵' },
  { value: 'de', label: 'German', native: 'Deutsch', flag: '🇩🇪' },
  { value: 'ko', label: 'Korean', native: '한국어', flag: '🇰🇷' },
  { value: 'tr', label: 'Turkish', native: 'Türkçe', flag: '🇹🇷' },
  { value: 'vi', label: 'Vietnamese', native: 'Tiếng Việt', flag: '🇻🇳' },
  { value: 'th', label: 'Thai', native: 'ไทย', flag: '🇹🇭' },
  { value: 'it', label: 'Italian', native: 'Italiano', flag: '🇮🇹' },
  { value: 'ur', label: 'Urdu', native: 'اردو', flag: '🇵🇰' },
  { value: 'fa', label: 'Persian', native: 'فارسی', flag: '🇮🇷' },
  { value: 'id', label: 'Indonesian', native: 'Bahasa Indonesia', flag: '🇮🇩' },
  { value: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
];

// 时长预设
const DURATION_PRESETS = [
  { label: '短视频', speech: '8', video: '10' },
  { label: '标准', speech: '12', video: '15' },
];

// AI处理步骤配置
const PROCESSING_STEPS = [
  { 
    id: 'upload', 
    label: '上传图片', 
    subLabel: 'Uploading product image...',
    icon: Upload,
    duration: 3000 
  },
  { 
    id: 'analyze', 
    label: '分析产品特征', 
    subLabel: 'Analyzing product features...',
    icon: Eye,
    duration: 15000 
  },
  { 
    id: 'brainstorm', 
    label: '构思创意脚本', 
    subLabel: 'Brainstorming creative script...',
    icon: Lightbulb,
    duration: 30000 
  },
  { 
    id: 'generate', 
    label: '生成视频分镜', 
    subLabel: 'Generating video storyboard...',
    icon: PenTool,
    duration: 40000 
  },
  { 
    id: 'optimize', 
    label: '优化提示词', 
    subLabel: 'Optimizing prompts for best results...',
    icon: Sparkles,
    duration: 20000 
  },
  { 
    id: 'finalize', 
    label: '最终整合', 
    subLabel: 'Finalizing output...',
    icon: FileText,
    duration: 2000 
  },
];

// 任务状态类型
type TaskStatus = 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';

// 任务接口
interface Task {
  id: string;
  status: TaskStatus;
  coreSellingPoint: string;
  language: string;
  createdAt: string;
  progress?: number;
  sora?: string;
  seedance?: string;
  error?: string;
  expanded?: boolean;
  imageUrl?: string;
  imagePreview?: string;
  starred?: boolean;
}

// localStorage 键名
const STORAGE_KEYS = {
  TASKS: 'changfeng_video_generator_tasks',
};

export default function Home() {
  // 表单状态
  const [coreSellingPoint, setCoreSellingPoint] = useState('');
  const [productImage, setProductImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [speechDuration, setSpeechDuration] = useState('12');
  const [videoDuration, setVideoDuration] = useState('15');
  const [language, setLanguage] = useState('es');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 任务列表状态
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // AI处理状态
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [dynamicText, setDynamicText] = useState('');
  
  // 收藏筛选
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  
  // 编辑状态
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editSora, setEditSora] = useState('');
  const [editSeedance, setEditSeedance] = useState('');
  
  // 复制状态
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // 页面入场动画
  const [mounted, setMounted] = useState(false);
  
  // 文件输入引用
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 初始化：加载本地存储数据
  useEffect(() => {
    setMounted(true);
    
    try {
      const savedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (savedTasks) {
        const parsed = JSON.parse(savedTasks);
        const completedTasks = parsed.filter((t: Task) => t.status === 'completed');
        setTasks(completedTasks);
      }
    } catch (e) {
      console.error('加载任务历史失败:', e);
    }
  }, []);

  // 保存任务到 localStorage
  const saveTasksToStorage = useCallback((newTasks: Task[]) => {
    try {
      const completedTasks = newTasks
        .filter(t => t.status === 'completed')
        .slice(0, 50);
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(completedTasks));
    } catch (e) {
      console.error('保存任务失败:', e);
    }
  }, []);

  // 动态文字效果
  useEffect(() => {
    if (!isSubmitting) return;
    
    const currentStep = PROCESSING_STEPS[currentStepIndex];
    if (!currentStep) return;
    
    const texts = [
      currentStep.subLabel,
      `正在${currentStep.label}...`,
      'AI智能体工作中...',
      `处理进度 ${Math.round(stepProgress)}%`,
    ];
    
    let textIndex = 0;
    const textInterval = setInterval(() => {
      setDynamicText(texts[textIndex % texts.length]);
      textIndex++;
    }, 2000);
    
    return () => clearInterval(textInterval);
  }, [isSubmitting, currentStepIndex, stepProgress]);

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProductImage(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  // 移除图片
  const removeImage = () => {
    setProductImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 应用时长预设
  const applyPreset = (preset: typeof DURATION_PRESETS[0]) => {
    setSpeechDuration(preset.speech);
    setVideoDuration(preset.video);
  };

  // 复制文本到剪贴板
  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 删除任务
  const deleteTask = (taskId: string) => {
    setTasks(prev => {
      const newTasks = prev.filter(task => task.id !== taskId);
      saveTasksToStorage(newTasks);
      return newTasks;
    });
  };

  // 清空所有历史
  const clearAllHistory = () => {
    if (confirm('确定要清空所有历史记录吗？')) {
      setTasks([]);
      localStorage.removeItem(STORAGE_KEYS.TASKS);
    }
  };

  // 切换收藏状态
  const toggleStar = (taskId: string) => {
    setTasks(prev => {
      const newTasks = prev.map(task => 
        task.id === taskId ? { ...task, starred: !task.starred } : task
      );
      saveTasksToStorage(newTasks);
      return newTasks;
    });
  };

  // 切换展开状态
  const toggleExpand = (taskId: string) => {
    setTasks(prev => 
      prev.map(task => 
        task.id === taskId ? { ...task, expanded: !task.expanded } : task
      )
    );
  };

  // 开始编辑提示词
  const startEdit = (task: Task) => {
    setEditingTask(task);
    setEditSora(task.sora || '');
    setEditSeedance(task.seedance || '');
  };

  // 保存编辑
  const saveEdit = () => {
    if (!editingTask) return;
    
    setTasks(prev => {
      const newTasks = prev.map(task => 
        task.id === editingTask.id 
          ? { ...task, sora: editSora, seedance: editSeedance } 
          : task
      );
      saveTasksToStorage(newTasks);
      return newTasks;
    });
    
    setEditingTask(null);
    setEditSora('');
    setEditSeedance('');
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingTask(null);
    setEditSora('');
    setEditSeedance('');
  };

  // 上传图片到对象存储
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || '图片上传失败');
      }

      return data.url;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('图片上传超时，请检查网络后重试');
      }
      
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('网络连接失败，请检查网络后重试');
      }
      
      throw error;
    }
  };

  // 调用工作流生成视频提示词
  const generatePrompt = async (
    imageUrl: string,
    sellingPoint: string,
    speechDur: string,
    videoDur: string,
    lang: string
  ): Promise<{ sora?: string; seedance?: string }> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000);

    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coreSellingPoint: sellingPoint,
          productImageUrl: imageUrl,
          speechDuration: speechDur,
          videoDuration: videoDur,
          language: lang,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || '提示词生成失败');
      }

      return {
        sora: data.sora,
        seedance: data.seedance,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('请求超时，工作流处理时间过长，请稍后重试');
      }
      
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('网络连接失败，请检查网络后重试');
      }
      
      throw error;
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!coreSellingPoint.trim() || !productImage) {
      return;
    }

    setIsSubmitting(true);
    setCurrentStepIndex(0);
    setStepProgress(0);
    setOverallProgress(0);
    
    const newTask: Task = {
      id: Date.now().toString(),
      status: 'uploading',
      coreSellingPoint,
      language,
      createdAt: new Date().toISOString(),
      progress: 0,
      expanded: true,
      imagePreview: imagePreview || undefined,
    };

    setTasks(prev => [newTask, ...prev]);

    // 模拟进度动画
    const progressInterval = setInterval(() => {
      setOverallProgress(prev => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 3;
      });
      setStepProgress(prev => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 5;
      });
    }, 500);

    // 步骤切换动画
    const totalDuration = PROCESSING_STEPS.reduce((sum, s) => sum + s.duration, 0);
    let elapsedTime = 0;
    
    const stepInterval = setInterval(() => {
      elapsedTime += 1000;
      
      let accumulatedDuration = 0;
      for (let i = 0; i < PROCESSING_STEPS.length; i++) {
        accumulatedDuration += PROCESSING_STEPS[i].duration;
        if (elapsedTime < accumulatedDuration) {
          setCurrentStepIndex(i);
          const stepStart = accumulatedDuration - PROCESSING_STEPS[i].duration;
          const stepProgress = ((elapsedTime - stepStart) / PROCESSING_STEPS[i].duration) * 100;
          setStepProgress(Math.min(stepProgress, 95));
          break;
        }
      }
    }, 1000);

    try {
      // 步骤1：上传
      setCurrentStepIndex(0);
      setStepProgress(0);
      
      const imageUrl = await uploadImage(productImage);
      
      setTasks(prev => 
        prev.map(task => 
          task.id === newTask.id 
            ? { ...task, imageUrl: imageUrl, status: 'processing' }
            : task
        )
      );

      // 步骤2-6：AI处理
      setCurrentStepIndex(1);
      setStepProgress(0);

      const result = await generatePrompt(
        imageUrl,
        coreSellingPoint,
        speechDuration,
        videoDuration,
        language
      );

      // 完成
      clearInterval(progressInterval);
      clearInterval(stepInterval);
      setCurrentStepIndex(PROCESSING_STEPS.length - 1);
      setStepProgress(100);
      setOverallProgress(100);

      setTasks(prev => {
        const newTasks = prev.map(task => 
          task.id === newTask.id 
            ? { 
                ...task, 
                status: 'completed' as TaskStatus, 
                progress: 100, 
                sora: result.sora,
                seedance: result.seedance,
                imageUrl: imageUrl,
              }
            : task
        );
        saveTasksToStorage(newTasks);
        return newTasks;
      });

      // 重置表单
      setCoreSellingPoint('');
      setProductImage(null);
      setImagePreview(null);
      setSpeechDuration('12');
      setVideoDuration('15');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Submit error:', error);
      clearInterval(progressInterval);
      clearInterval(stepInterval);
      
      setTasks(prev => 
        prev.map(task => 
          task.id === newTask.id 
            ? { 
                ...task, 
                status: 'failed', 
                error: error instanceof Error ? error.message : '未知错误' 
              }
            : task
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 获取语言名称
  const getLanguageName = (langCode: string) => {
    const lang = LANGUAGES.find(l => l.value === langCode);
    return lang ? `${lang.flag} ${lang.native}` : langCode;
  };

  // 筛选显示的任务
  const displayedTasks = showStarredOnly 
    ? tasks.filter(t => t.starred)
    : tasks;

  return (
    <div className="min-h-screen page-bg relative overflow-hidden">
      {/* 装饰波浪 */}
      <div className="wave-decoration" />
      
      {/* AI处理中全屏遮罩 */}
      {isSubmitting && (
        <div className="ai-processing-overlay">
          {/* 背景效果 */}
          <div className="grid-background" />
          <div className="glow-orb glow-orb-1" />
          <div className="glow-orb glow-orb-2" />
          <div className="glow-orb glow-orb-3" />
          
          {/* 主内容 */}
          <div className="ai-processing-content">
            {/* AI 大脑动画 */}
            <div className="ai-brain-container mb-8">
              <div className="ai-brain-ring" />
              <div className="ai-brain-ring" />
              <div className="ai-brain-ring" />
              <div className="ai-brain-core">
                <Brain className="w-16 h-16 text-[#4fa3d1] animate-pulse-subtle" />
              </div>
            </div>
            
            {/* 标题 */}
            <h2 className="text-2xl font-bold text-white mb-2">
              AI智能体正在工作
            </h2>
            <p className="text-[#4fa3d1] text-lg mb-8 h-7">
              {dynamicText || '初始化中...'}
            </p>
            
            {/* 总进度 */}
            <div className="mb-10">
              <div className="flex justify-between text-sm text-white/60 mb-2">
                <span>总进度</span>
                <span>{Math.round(overallProgress)}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full progress-bar transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
            
            {/* 步骤列表 */}
            <div className="space-y-3 max-w-md mx-auto">
              {PROCESSING_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStepIndex;
                const isCompleted = index < currentStepIndex;
                
                return (
                  <div 
                    key={step.id}
                    className={`processing-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                  >
                    <div className={`step-icon ${isCompleted ? 'completed' : isActive ? 'active' : 'pending'}`}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : isActive ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    
                    <div className="flex-1 text-left">
                      <div className={`text-sm font-medium ${isActive || isCompleted ? 'text-white' : 'text-white/40'}`}>
                        {step.label}
                      </div>
                      {isActive && (
                        <div className="text-xs text-[#4fa3d1]/80 mt-0.5">
                          {step.subLabel}
                        </div>
                      )}
                    </div>
                    
                    {isActive && (
                      <div className="text-xs text-[#4fa3d1] font-medium">
                        {Math.round(stepProgress)}%
                      </div>
                    )}
                    {isCompleted && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* 提示文字 */}
            <p className="text-white/30 text-sm mt-10">
              正在调用Coze工作流，预计需要1-2分钟
            </p>
          </div>
        </div>
      )}
      
      {/* 主内容 */}
      <div className="relative max-w-7xl mx-auto px-6 py-8">
        
      {/* 白色顶部导航栏 */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-28 h-14 relative">
              <Image
                src="https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F%E9%95%BF%E9%A3%8E%E8%B7%A8%E5%A2%83logo%E6%8F%90%E5%8F%96.png&nonce=53b72a74-c3e7-4c4c-8632-417105b99d47&project_id=7615252896803864582&sign=a7b7df82deb47526062c47ad01bbef2b148a43f5c08de9c3127ab3a27bc61cf9"
                alt="长风跨境"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-2 text-gray-500">
            <Globe className="w-4 h-4" />
            <span className="text-sm font-medium">帮助中国商家出海</span>
          </div>
        </div>
      </header>

        {/* 标题区 */}
        <div className={`text-center mb-12 opacity-0 ${mounted ? 'animate-fadeInUp delay-100' : ''}`}>

          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            长风跨境Prompt智能体
          </h1>
          <p className="text-lg text-white/50 max-w-xl mx-auto leading-relaxed">
            填写产品信息，调用多个AI智能体协作撰写
          </p>
        </div>

        {/* 主内容区 - 左右分栏 */}
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 opacity-0 ${mounted ? 'animate-fadeInUp delay-200' : ''}`}>
          
          {/* 左侧：表单卡片 */}
          <div className="card p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 icon-container primary">
                <Video className="w-6 h-6 text-[#4fa3d1]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">生成提示词</h2>
                <p className="text-sm text-gray-500 mt-0.5">填写产品信息，AI自动生成</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* 核心卖点 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  核心卖点 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="如：30天见效、无副作用、天然成分..."
                  value={coreSellingPoint}
                  onChange={(e) => setCoreSellingPoint(e.target.value)}
                  className="w-full h-14 px-5 input-field text-gray-800"
                />
              </div>

              {/* 产品图片 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  产品图片 <span className="text-red-400">*</span>
                </label>
                
                {imagePreview ? (
                  <div className="relative group">
                    <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-gray-200">
                      <img 
                        src={imagePreview} 
                        alt="产品预览" 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                        <button
                          onClick={removeImage}
                          className="px-4 py-2 bg-white rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors shadow-lg"
                        >
                          更换图片
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 upload-area flex flex-col items-center justify-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                      <Upload className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">点击上传产品图片</p>
                      <p className="text-xs text-gray-400 mt-1">支持 JPG、PNG 格式</p>
                    </div>
                  </button>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* 时长预设 */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  时长预设
                </label>
                <div className="flex gap-3">
                  {DURATION_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => applyPreset(preset)}
                      className={`flex-1 preset-btn ${
                        speechDuration === preset.speech && videoDuration === preset.video
                          ? 'active'
                          : 'inactive'
                      }`}
                    >
                      <span className="block">{preset.label}</span>
                      <span className="block text-xs opacity-70 mt-0.5">{preset.video}s</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 时长设置 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">口播时长</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={speechDuration}
                      onChange={(e) => setSpeechDuration(e.target.value)}
                      className="w-full h-14 px-5 pr-14 input-field text-gray-800"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">秒</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">视频时长</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={videoDuration}
                      onChange={(e) => setVideoDuration(e.target.value)}
                      className="w-full h-14 px-5 pr-14 input-field text-gray-800"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">秒</span>
                  </div>
                </div>
              </div>

              {/* 语言选择 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  语言 <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full h-14 px-5 input-field text-gray-800 appearance-none cursor-pointer"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.flag} {lang.native} ({lang.label})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* 提交按钮 */}
              <button
                onClick={handleSubmit}
                disabled={!coreSellingPoint.trim() || !productImage || isSubmitting}
                className="w-full h-16 btn-primary text-base flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>AI处理中...</span>
                  </>
                ) : (
                  <>
                    <span className="font-semibold">生成提示词</span>
                    <Wand2 className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 右侧：结果卡片 */}
          <div className="card overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-8 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 icon-container warning">
                  <Zap className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">生成结果</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {displayedTasks.length > 0 ? `共 ${displayedTasks.length} 条记录` : '暂无记录'}
                  </p>
                </div>
              </div>
              
              {tasks.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowStarredOnly(!showStarredOnly)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                      showStarredOnly 
                        ? 'bg-amber-50 text-amber-600 border border-amber-200' 
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${showStarredOnly ? 'fill-current' : ''}`} />
                    收藏
                  </button>
                  <button
                    onClick={clearAllHistory}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-500 transition-colors"
                  >
                    清空
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 p-6 overflow-y-auto min-h-[400px] max-h-[600px]">
              {displayedTasks.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-12">
                  <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mb-6">
                    <ImageIcon className="w-10 h-10 text-gray-300" />
                  </div>
                  <p className="text-gray-400 text-center text-lg">
                    {showStarredOnly ? '暂无收藏记录' : '提交表单后结果将显示在这里'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayedTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`task-card ${
                        task.status === 'completed' ? 'completed' : 
                        task.status === 'failed' ? 'failed' : ''
                      } overflow-hidden`}
                    >
                      <div className="p-4 flex items-start gap-4">
                        <div className="flex-shrink-0">
                          {task.imagePreview || task.imageUrl ? (
                            <img 
                              src={task.imagePreview || task.imageUrl} 
                              alt="产品" 
                              className="w-16 h-16 object-cover rounded-xl"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center">
                              <ImageIcon className="w-7 h-7 text-gray-300" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {task.status === 'completed' && (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            )}
                            {task.status === 'failed' && (
                              <XCircle className="w-5 h-5 text-red-500" />
                            )}
                            
                            <span className="text-sm font-semibold text-gray-800">
                              {task.status === 'completed' ? '生成完成' : '生成失败'}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 truncate mb-2 font-medium">
                            {task.coreSellingPoint}
                          </p>
                          
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span className="tag text-xs">
                              {getLanguageName(task.language)}
                            </span>
                            <span>•</span>
                            <span>{new Date(task.createdAt).toLocaleString('zh-CN', { 
                              month: 'numeric', 
                              day: 'numeric',
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}</span>
                          </div>
                        </div>

                        {task.status === 'completed' && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleStar(task.id)}
                              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                                task.starred 
                                  ? 'text-amber-500 bg-amber-50' 
                                  : 'text-gray-400 hover:bg-gray-100 hover:text-amber-500'
                              }`}
                            >
                              <Star className={`w-4.5 h-4.5 ${task.starred ? 'fill-current' : ''}`} />
                            </button>
                            <button
                              onClick={() => startEdit(task)}
                              className="w-9 h-9 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-[#4fa3d1] flex items-center justify-center transition-colors"
                            >
                              <Edit3 className="w-4.5 h-4.5" />
                            </button>
                            <button
                              onClick={() => toggleExpand(task.id)}
                              className="w-9 h-9 rounded-xl text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors"
                            >
                              {task.expanded ? (
                                <ChevronUp className="w-4.5 h-4.5" />
                              ) : (
                                <ChevronDown className="w-4.5 h-4.5" />
                              )}
                            </button>
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="w-9 h-9 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {task.status === 'failed' && task.error && (
                        <div className="px-4 pb-4">
                          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">
                            {task.error}
                          </p>
                        </div>
                      )}

                      {task.status === 'completed' && task.expanded && (
                        <div className="px-4 pb-4 space-y-3">
                          {task.sora && (
                            <div className="result-box overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
                                <div className="flex items-center gap-2">
                                  <div className="decoration-dot primary" />
                                  <span className="text-sm font-semibold text-[#1a3a6b]">Sora</span>
                                </div>
                                <button
                                  onClick={() => copyToClipboard(task.sora!, `${task.id}-sora`)}
                                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#4fa3d1] transition-colors"
                                >
                                  {copiedId === `${task.id}-sora` ? (
                                    <>
                                      <Check className="w-4 h-4 text-emerald-500" />
                                      <span className="text-emerald-500">已复制</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-4 h-4" />
                                      <span>复制</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <div className="p-4 max-h-40 overflow-y-auto">
                                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                                  {task.sora}
                                </p>
                              </div>
                            </div>
                          )}

                          {task.seedance && (
                            <div className="result-box overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
                                <div className="flex items-center gap-2">
                                  <div className="decoration-dot secondary" />
                                  <span className="text-sm font-semibold text-[#4fa3d1]">Seedance</span>
                                </div>
                                <button
                                  onClick={() => copyToClipboard(task.seedance!, `${task.id}-seedance`)}
                                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#4fa3d1] transition-colors"
                                >
                                  {copiedId === `${task.id}-seedance` ? (
                                    <>
                                      <Check className="w-4 h-4 text-emerald-500" />
                                      <span className="text-emerald-500">已复制</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-4 h-4" />
                                      <span>复制</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <div className="p-4 max-h-40 overflow-y-auto">
                                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                                  {task.seedance}
                                </p>
                              </div>
                            </div>
                          )}

                          <button
                            onClick={() => {
                              const allText = `【Sora】\n${task.sora || ''}\n\n【Seedance】\n${task.seedance || ''}`;
                              copyToClipboard(allText, `${task.id}-all`);
                            }}
                            className="w-full h-12 btn-secondary flex items-center justify-center gap-2 text-sm"
                          >
                            {copiedId === `${task.id}-all` ? (
                              <>
                                <Check className="w-4 h-4 text-emerald-500" />
                                <span className="text-emerald-500">已复制全部</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                <span>一键复制全部</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {task.status === 'completed' && !task.expanded && (
                        <div className="px-4 pb-4 flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4 text-gray-400">
                            <span className="flex items-center gap-2">
                              <div className="decoration-dot primary" />
                              Sora
                            </span>
                            <span className="flex items-center gap-2">
                              <div className="decoration-dot secondary" />
                              Seedance
                            </span>
                            {task.starred && (
                              <span className="flex items-center gap-1.5 text-amber-500">
                                <Star className="w-3.5 h-3.5 fill-current" />
                                已收藏
                              </span>
                            )}
                          </div>
                          <span className="text-[#4fa3d1] font-medium">展开查看</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部 */}
        <footer className={`mt-16 text-center opacity-0 ${mounted ? 'animate-fadeIn delay-400' : ''}`}>
          <div className="inline-flex items-center gap-3 text-white/30 mb-4">
            <div className="h-px w-12 bg-white/10" />
            <Sparkles className="w-4 h-4" />
            <div className="h-px w-12 bg-white/10" />
          </div>
          <p className="text-sm text-white/40 mb-2">
            帮助中国商家出海 | Helping Chinese Merchants Go Global
          </p>
          <p className="text-xs text-white/20">
            Powered by Coze Workflow
          </p>
        </footer>
      </div>

      {/* 编辑弹窗 */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-2xl max-h-[85vh] overflow-hidden animate-fadeInUp">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 icon-container primary">
                  <Edit3 className="w-6 h-6 text-[#4fa3d1]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">编辑提示词</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{editingTask.coreSellingPoint}</p>
                </div>
              </div>
              <button
                onClick={cancelEdit}
                className="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto max-h-[50vh]">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Sora 提示词</label>
                <textarea
                  value={editSora}
                  onChange={(e) => setEditSora(e.target.value)}
                  className="w-full h-44 p-4 input-field text-sm resize-none"
                  placeholder="Sora 提示词..."
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Seedance 提示词</label>
                <textarea
                  value={editSeedance}
                  onChange={(e) => setEditSeedance(e.target.value)}
                  className="w-full h-44 p-4 input-field text-sm resize-none"
                  placeholder="Seedance 提示词..."
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={cancelEdit}
                className="px-6 py-3 btn-secondary"
              >
                取消
              </button>
              <button
                onClick={saveEdit}
                className="px-6 py-3 btn-primary"
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
