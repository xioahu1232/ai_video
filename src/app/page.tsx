'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Upload, Loader2, CheckCircle2, XCircle, 
  Copy, Check, ChevronDown, ChevronUp, Trash2, 
  ImageIcon, Wand2, Star,
  Edit3, X, Clock, Video, Sparkles, Globe,
  Zap, Brain, Eye, Lightbulb, PenTool, FileText,
  LogIn, LogOut, User, Gift, Coins, Shield
} from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/AuthModal';
import { RedeemModal } from '@/components/RedeemModal';
import WelcomeModal from '@/components/WelcomeModal';
import Confetti from '@/components/Confetti';

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
  { label: '长视频', speech: '22', video: '25' },
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
    duration: 30000 
  },
  { 
    id: 'brainstorm', 
    label: '构思创意脚本', 
    subLabel: 'Brainstorming creative script...',
    icon: Lightbulb,
    duration: 60000 
  },
  { 
    id: 'generate', 
    label: '生成视频分镜', 
    subLabel: 'Generating video storyboard...',
    icon: PenTool,
    duration: 90000 
  },
  { 
    id: 'optimize', 
    label: '优化提示词', 
    subLabel: 'Optimizing prompts for best results...',
    icon: Sparkles,
    duration: 45000 
  },
  { 
    id: 'finalize', 
    label: '最终整合', 
    subLabel: 'Finalizing output...',
    icon: FileText,
    duration: 12000 
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
  videoDuration?: string;
}

export default function Home() {
  // 认证相关
  const { user, token, isLoading: authLoading, isAdmin, isNewUser, login, register, logout, clearNewUserFlag } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // 余额相关
  const [balance, setBalance] = useState(0);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  
  // 欢迎弹窗和礼花
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showRedeemConfetti, setShowRedeemConfetti] = useState(false);
  
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

  // 从数据库加载任务
  const loadTasksFromDB = useCallback(async () => {
    if (!token) return;
    
    try {
      const res = await fetch('/api/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = await res.json();
      
      if (data.success && data.tasks) {
        const formattedTasks: Task[] = data.tasks.map((t: Record<string, unknown>) => ({
          id: t.id as string,
          status: t.status as TaskStatus,
          coreSellingPoint: t.core_selling_point as string,
          language: t.language as string,
          createdAt: t.created_at as string,
          sora: t.sora as string | undefined,
          seedance: t.seedance as string | undefined,
          error: t.error as string | undefined,
          expanded: false,
          starred: t.starred as boolean,
          imageUrl: t.image_url as string | undefined,
          videoDuration: t.video_duration as string | undefined,
        }));
        setTasks(formattedTasks);
      }
    } catch (error) {
      console.error('加载任务失败:', error);
    }
  }, [token]);

  // 获取用户余额
  const loadBalance = useCallback(async () => {
    if (!token) return;
    
    try {
      const res = await fetch('/api/balance', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = await res.json();
      
      if (data.success) {
        setBalance(data.balance.balance);
      }
    } catch (error) {
      console.error('获取余额失败:', error);
    }
  }, [token]);

  // 初始化：加载任务
  useEffect(() => {
    setMounted(true);
  }, []);

  // 登录状态变化时加载任务和余额
  useEffect(() => {
    if (token && user) {
      loadTasksFromDB();
      loadBalance();
      
      // 如果是新用户，显示欢迎弹窗
      if (isNewUser) {
        setTimeout(() => {
          setShowWelcomeModal(true);
        }, 500);
      }
    } else {
      setTasks([]);
      setBalance(0);
    }
  }, [token, user, loadTasksFromDB, loadBalance, isNewUser]);

  // 保存任务到数据库
  const saveTaskToDB = useCallback(async (task: Task) => {
    if (!token) return;
    
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          coreSellingPoint: task.coreSellingPoint,
          imageUrl: task.imageUrl,
          videoDuration: task.videoDuration,
          language: task.language,
          sora: task.sora,
          seedance: task.seedance,
          status: task.status,
          error: task.error,
        }),
      });
      
      const data = await res.json();
      return data.success ? data.task : null;
    } catch (error) {
      console.error('保存任务失败:', error);
      return null;
    }
  }, [token]);

  // 更新任务到数据库
  const updateTaskInDB = useCallback(async (taskId: string, updates: Partial<Task>) => {
    if (!token) return;
    
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error('更新任务失败:', error);
    }
  }, [token]);

  // 删除任务从数据库
  const deleteTaskFromDB = useCallback(async (taskId: string) => {
    if (!token) return;
    
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error('删除任务失败:', error);
    }
  }, [token]);

  // 清空所有任务从数据库
  const clearAllTasksFromDB = useCallback(async () => {
    if (!token) return;
    
    try {
      await fetch('/api/tasks', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error('清空任务失败:', error);
    }
  }, [token]);

  // 删除旧的 saveTasksToStorage 函数并替换为空函数（兼容旧代码）
  const saveTasksToStorage = useCallback(() => {
    // 不再使用localStorage，数据保存在数据库中
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
  const deleteTask = async (taskId: string) => {
    await deleteTaskFromDB(taskId);
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  // 清空所有历史
  const clearAllHistory = async () => {
    if (confirm('确定要清空所有历史记录吗？')) {
      await clearAllTasksFromDB();
      setTasks([]);
    }
  };

  // 切换收藏状态
  const toggleStar = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newStarred = !task.starred;
    await updateTaskInDB(taskId, { starred: newStarred });
    
    setTasks(prev => 
      prev.map(task => 
        task.id === taskId ? { ...task, starred: newStarred } : task
      )
    );
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
  const saveEdit = async () => {
    if (!editingTask) return;
    
    await updateTaskInDB(editingTask.id, { sora: editSora, seedance: editSeedance });
    
    setTasks(prev => 
      prev.map(task => 
        task.id === editingTask.id 
          ? { ...task, sora: editSora, seedance: editSeedance } 
          : task
      )
    );
    
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
  ): Promise<{ sora?: string; seedance?: string; balance?: number }> => {
    const controller = new AbortController();
    // 增加超时时间到 5 分钟，Coze 工作流可能需要较长时间
    const timeoutId = setTimeout(() => controller.abort(), 300000);

    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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
        balance: data.balance,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('AI 工作流处理超时（超过5分钟），请检查产品图片和卖点描述是否正确，或稍后重试');
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

    // 检查是否登录
    if (!user || !token) {
      setShowAuthModal(true);
      return;
    }

    // 检查余额是否足够
    if (balance <= 0) {
      setShowRedeemModal(true);
      return;
    }

    // 如果有任务正在处理，提示用户
    if (isSubmitting) {
      alert('当前有任务正在处理中，请等待完成后再提交新任务');
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

    // 保存当前输入，用于重置表单
    const currentInput = {
      coreSellingPoint,
      imagePreview,
      productImage,
    };

    setTasks(prev => [newTask, ...prev]);

    // 立即重置表单，允许用户输入新内容
    setCoreSellingPoint('');
    setProductImage(null);
    setImagePreview(null);
    setSpeechDuration('12');
    setVideoDuration('15');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // 进度同步更新 - 总进度基于步骤进度计算
    const updateProgress = (stepIndex: number, stepProg: number) => {
      setCurrentStepIndex(stepIndex);
      setStepProgress(stepProg);
      // 总进度 = (已完成步骤数 + 当前步骤进度/100) / 总步骤数 * 100
      const totalSteps = PROCESSING_STEPS.length;
      const overallProg = ((stepIndex + stepProg / 100) / totalSteps) * 100;
      setOverallProgress(Math.min(overallProg, 99));
    };

    // 步骤切换动画 - 基于实际时间
    const totalDuration = PROCESSING_STEPS.reduce((sum, s) => sum + s.duration, 0);
    let elapsedTime = 0;
    
    const stepInterval = setInterval(() => {
      elapsedTime += 100;
      
      let accumulatedDuration = 0;
      for (let i = 0; i < PROCESSING_STEPS.length; i++) {
        accumulatedDuration += PROCESSING_STEPS[i].duration;
        if (elapsedTime < accumulatedDuration) {
          const stepStart = accumulatedDuration - PROCESSING_STEPS[i].duration;
          const stepProg = Math.min(((elapsedTime - stepStart) / PROCESSING_STEPS[i].duration) * 100, 95);
          updateProgress(i, stepProg);
          break;
        }
      }
    }, 100);

    try {
      // 步骤1：上传
      updateProgress(0, 0);
      
      const imageUrl = await uploadImage(productImage);
      
      setTasks(prev => 
        prev.map(task => 
          task.id === newTask.id 
            ? { ...task, imageUrl: imageUrl, status: 'processing' }
            : task
        )
      );

      // 步骤2-6：AI处理
      updateProgress(1, 0);

      const result = await generatePrompt(
        imageUrl,
        coreSellingPoint,
        speechDuration,
        videoDuration,
        language
      );

      // 完成
      clearInterval(stepInterval);
      setCurrentStepIndex(PROCESSING_STEPS.length - 1);
      setStepProgress(100);
      setOverallProgress(100);

      // 更新任务状态并保存到数据库
      const completedTask = {
        ...newTask,
        status: 'completed' as TaskStatus,
        progress: 100,
        sora: result.sora,
        seedance: result.seedance,
        imageUrl: imageUrl,
      };

      // 保存到数据库
      const savedTask = await saveTaskToDB(completedTask);

      // 更新本地余额显示（API已经扣减了余额）
      if (result.balance !== undefined) {
        setBalance(result.balance);
      } else {
        setBalance(prev => Math.max(0, prev - 1));
      }

      setTasks(prev => {
        if (savedTask) {
          return prev.map(task => 
            task.id === newTask.id 
              ? { ...completedTask, id: savedTask.id }
              : task
          );
        }
        return prev.map(task => 
          task.id === newTask.id ? completedTask : task
        );
      });

    } catch (error) {
      console.error('Submit error:', error);
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

  // 当前正在处理的任务
  const processingTask = tasks.find(t => t.status === 'uploading' || t.status === 'processing');

  return (
    <div className="min-h-screen page-bg relative overflow-hidden">
      {/* 装饰波浪 */}
      <div className="wave-decoration" />
      
      {/* 白色顶部导航栏 */}
      <header className="bg-white shadow-sm relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-3 sm:py-4 md:py-6 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-36 h-16 sm:w-48 sm:h-20 md:w-72 md:h-32 relative">
              <Image
                src="https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F%E9%95%BF%E9%A3%8E%E8%B7%A8%E5%A2%83logo%E6%8F%90%E5%8F%96.png&nonce=8b8fbdf1-5123-40a3-aa2f-019b159531b9&project_id=7615252896803864582&sign=70c33727e4787358b928d6129b3f425c36c504859f0479478886c5b0a1075964"
                alt="长风跨境"
                fill
                className="object-contain"
                unoptimized
                loading="eager"
                priority
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4">
            {user ? (
              <>
                {/* 余额显示 */}
                <button
                  onClick={() => setShowRedeemModal(true)}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-[#4fa3d1]/10 to-[#1a3a6b]/10 rounded-lg sm:rounded-xl border border-[#4fa3d1]/20 hover:border-[#4fa3d1]/40 transition-colors"
                >
                  <Coins className="w-4 h-4 text-[#4fa3d1]" />
                  <span className="text-xs sm:text-sm font-semibold text-[#1a3a6b]">{balance} 次</span>
                </button>
                
                {/* 兑换按钮 */}
                <button
                  onClick={() => setShowRedeemModal(true)}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium bg-amber-50 hover:bg-amber-100 text-amber-600 transition-colors"
                >
                  <Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">兑换</span>
                </button>
                
                <div className="hidden sm:flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-100 rounded-lg sm:rounded-xl">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-xs sm:text-sm text-gray-700 font-medium">{user.name}</span>
                </div>
                
                {/* 管理员入口 */}
                {isAdmin && (
                  <a
                    href="/admin"
                    className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:opacity-90 transition-opacity"
                  >
                    <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">管理后台</span>
                  </a>
                )}
                
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-600 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">退出</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium bg-[#4fa3d1] hover:bg-[#3d8ab8] text-white transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  登录
                </button>
                <div className="hidden md:flex items-center gap-2 text-gray-500">
                  <Globe className="w-5 h-5" />
                  <span className="text-sm font-medium">帮助中国商家出海</span>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12">
        
        {/* 标题区 */}
        <div className={`text-center mb-8 sm:mb-12 md:mb-16 opacity-0 ${mounted ? 'animate-fadeInUp delay-100' : ''}`}>
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#e8ecf2] mb-3 sm:mb-4 tracking-tight px-4">
            长风跨境Prompt智能体
          </h1>
          <p className="text-base sm:text-lg text-[#8ba3bc] max-w-xl mx-auto leading-relaxed px-4">
            填写产品信息，调用多个AI智能体协作撰写
          </p>
        </div>

        {/* 主内容区 - 左右分栏 */}
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 md:gap-10 opacity-0 ${mounted ? 'animate-fadeInUp delay-200' : ''}`}>
          
          {/* 左侧：表单卡片 */}
          <div className="card p-5 sm:p-8 md:p-10">
            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 md:mb-10">
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 icon-container primary">
                <Video className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-[#4fa3d1]" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800">生成提示词</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">填写产品信息，AI自动生成</p>
              </div>
            </div>

            <div className="space-y-5 sm:space-y-6 md:space-y-7">
              {/* 核心卖点 */}
              <div className="space-y-2 sm:space-y-3">
                <label className="text-sm font-semibold text-gray-700">
                  核心卖点 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="如：30天见效、无副作用、天然成分..."
                  value={coreSellingPoint}
                  onChange={(e) => setCoreSellingPoint(e.target.value)}
                  className="w-full h-12 sm:h-14 md:h-16 px-4 sm:px-5 md:px-6 input-field text-gray-800 text-sm sm:text-base"
                />
              </div>

              {/* 产品图片 */}
              <div className="space-y-2 sm:space-y-3">
                <label className="text-sm font-semibold text-gray-700">
                  产品图片 <span className="text-red-400">*</span>
                </label>
                
                {imagePreview ? (
                  <div className="relative group">
                    <div className="relative w-full h-32 sm:h-36 md:h-40 rounded-xl sm:rounded-2xl overflow-hidden border border-gray-200">
                      <img 
                        src={imagePreview} 
                        alt="产品预览" 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4 sm:pb-5">
                        <button
                          onClick={removeImage}
                          className="px-4 py-2 sm:px-5 sm:py-2.5 bg-white rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors shadow-lg"
                        >
                          更换图片
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-28 sm:h-32 md:h-40 upload-area flex flex-col items-center justify-center gap-3 sm:gap-4"
                  >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white flex items-center justify-center shadow-sm">
                      <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm sm:text-base font-medium text-gray-600">点击上传产品图片</p>
                      <p className="text-xs sm:text-sm text-gray-400 mt-1">支持 JPG、PNG 格式</p>
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
              <div className="space-y-2 sm:space-y-3 md:space-y-4">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  时长预设
                </label>
                <div className="flex gap-2 sm:gap-3 md:gap-4">
                  {DURATION_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => applyPreset(preset)}
                      className={`flex-1 preset-btn py-3 sm:py-4 ${
                        speechDuration === preset.speech && videoDuration === preset.video
                          ? 'active'
                          : 'inactive'
                      }`}
                    >
                      <span className="block text-sm sm:text-base">{preset.label}</span>
                      <span className="block text-xs sm:text-sm opacity-70 mt-0.5 sm:mt-1">{preset.video}s</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 时长设置 */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5">
                <div className="space-y-2 sm:space-y-3">
                  <label className="text-sm font-semibold text-gray-700">口播时长</label>
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
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700">视频时长</label>
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
              <div className="space-y-2 sm:space-y-3">
                <label className="text-sm font-semibold text-gray-700">
                  语言 <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full h-12 sm:h-14 px-4 sm:px-5 input-field text-gray-800 text-sm sm:text-base appearance-none cursor-pointer"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.flag} {lang.native} ({lang.label})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* 提交按钮 */}
              {user && balance <= 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 sm:p-4 bg-red-50 rounded-lg sm:rounded-xl text-red-500 text-xs sm:text-sm">
                    <Coins className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <span>余额不足，请先兑换使用额度</span>
                  </div>
                  <button
                    onClick={() => setShowRedeemModal(true)}
                    className="w-full h-12 sm:h-14 md:h-16 bg-amber-500 hover:bg-amber-600 text-white rounded-xl sm:rounded-2xl text-base sm:text-lg flex items-center justify-center gap-2 sm:gap-3 transition-colors"
                  >
                    <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="font-semibold">立即兑换</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!coreSellingPoint.trim() || !productImage}
                  className="w-full h-12 sm:h-14 md:h-16 btn-primary text-base sm:text-lg flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none mt-2 sm:mt-4"
                >
                  <span className="font-semibold">生成提示词</span>
                  {user && <span className="text-xs sm:text-sm opacity-80">({balance}次)</span>}
                  <Wand2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
              
              {/* 等待时间提示 */}
              <p className="text-xs text-gray-400 text-center mt-3">
                AI生成需要约1-4分钟，请耐心等待
              </p>
            </div>
          </div>

          {/* 右侧：结果卡片 */}
          <div className="card overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-6 md:p-8 border-b border-gray-100">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 icon-container warning">
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800">生成结果</h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
                    {displayedTasks.length > 0 ? `共 ${displayedTasks.length} 条记录` : '暂无记录'}
                  </p>
                </div>
              </div>
              
              {tasks.length > 0 && (
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={() => setShowStarredOnly(!showStarredOnly)}
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 sm:gap-2 ${
                      showStarredOnly 
                        ? 'bg-amber-50 text-amber-600 border border-amber-200' 
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${showStarredOnly ? 'fill-current' : ''}`} />
                    <span className="hidden sm:inline">收藏</span>
                  </button>
                  <button
                    onClick={clearAllHistory}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-500 transition-colors"
                  >
                    清空
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 p-4 sm:p-6 overflow-y-auto min-h-[300px] sm:min-h-[400px] md:max-h-[600px]">
              {/* 处理中的任务状态面板 */}
              {processingTask && (
                <div className="mb-4 sm:mb-6 p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#1a3a6b]/5 to-[#4fa3d1]/5 border border-[#4fa3d1]/20">
                  {/* 头部 */}
                  <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-[#4fa3d1]/10 flex items-center justify-center flex-shrink-0">
                      <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-[#4fa3d1] animate-pulse-subtle" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-800">AI智能体工作中</h3>
                      <p className="text-xs sm:text-sm text-[#4fa3d1] truncate">{dynamicText || '初始化中...'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xl sm:text-2xl font-bold text-[#4fa3d1]">{Math.round(overallProgress)}</span>
                      <span className="text-xs sm:text-sm text-gray-400">%</span>
                    </div>
                  </div>
                  
                  {/* 总进度条 */}
                  <div className="h-1.5 sm:h-2 bg-gray-200 rounded-full overflow-hidden mb-4 sm:mb-5">
                    <div 
                      className="h-full progress-bar transition-all duration-300"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                  
                  {/* 步骤列表 */}
                  <div className="space-y-1.5 sm:space-y-2">
                    {PROCESSING_STEPS.map((step, index) => {
                      const Icon = step.icon;
                      const isActive = index === currentStepIndex;
                      const isCompleted = index < currentStepIndex;
                      
                      return (
                        <div 
                          key={step.id}
                          className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all ${
                            isActive ? 'bg-white shadow-sm' : ''
                          }`}
                        >
                          <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isCompleted ? 'bg-emerald-100 text-emerald-600' :
                            isActive ? 'bg-[#4fa3d1]/10 text-[#4fa3d1]' :
                            'bg-gray-100 text-gray-400'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            ) : isActive ? (
                              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                            ) : (
                              <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <span className={`text-sm ${
                              isActive ? 'text-gray-800 font-medium' : 
                              isCompleted ? 'text-gray-600' : 'text-gray-400'
                            }`}>
                              {step.label}
                            </span>
                          </div>
                          
                          {isActive && (
                            <span className="text-xs text-[#4fa3d1] font-medium flex-shrink-0">
                              {Math.round(stepProgress)}%
                            </span>
                          )}
                          {isCompleted && (
                            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 flex-shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* 提示 */}
                  <p className="text-xs text-gray-400 mt-3 sm:mt-4 text-center">
                    正在调用Coze工作流，预计需要1-2分钟
                  </p>
                </div>
              )}
              
              {displayedTasks.length === 0 && !processingTask ? (
                <div className="h-full flex flex-col items-center justify-center py-8 sm:py-12">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-gray-100 flex items-center justify-center mb-4 sm:mb-6">
                    <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10 text-gray-300" />
                  </div>
                  <p className="text-gray-400 text-center text-sm sm:text-base sm:text-lg">
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
                      <div className="p-3 sm:p-4 flex items-start gap-3 sm:gap-4">
                        <div className="flex-shrink-0">
                          {task.imagePreview || task.imageUrl ? (
                            <img 
                              src={task.imagePreview || task.imageUrl} 
                              alt="产品" 
                              className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg sm:rounded-xl"
                            />
                          ) : (
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl bg-gray-100 flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 sm:w-7 sm:h-7 text-gray-300" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                            {task.status === 'completed' && (
                              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 flex-shrink-0" />
                            )}
                            {task.status === 'failed' && (
                              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
                            )}
                            
                            <span className="text-xs sm:text-sm font-semibold text-gray-800">
                              {task.status === 'completed' ? '生成完成' : '生成失败'}
                            </span>
                          </div>
                          
                          <p className="text-xs sm:text-sm text-gray-600 truncate mb-1.5 sm:mb-2 font-medium">
                            {task.coreSellingPoint}
                          </p>
                          
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-gray-400">
                            <span className="tag text-xs px-2 py-0.5 sm:py-1">
                              {getLanguageName(task.language)}
                            </span>
                            <span className="hidden sm:inline">•</span>
                            <span>{new Date(task.createdAt).toLocaleString('zh-CN', { 
                              month: 'numeric', 
                              day: 'numeric',
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}</span>
                          </div>
                        </div>

                        {task.status === 'completed' && (
                          <div className="flex items-center gap-0.5 sm:gap-1">
                            <button
                              onClick={() => toggleStar(task.id)}
                              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-all ${
                                task.starred 
                                  ? 'text-amber-500 bg-amber-50' 
                                  : 'text-gray-400 hover:bg-gray-100 hover:text-amber-500'
                              }`}
                            >
                              <Star className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${task.starred ? 'fill-current' : ''}`} />
                            </button>
                            <button
                              onClick={() => startEdit(task)}
                              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl text-gray-400 hover:bg-gray-100 hover:text-[#4fa3d1] flex items-center justify-center transition-colors"
                            >
                              <Edit3 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                            </button>
                            <button
                              onClick={() => toggleExpand(task.id)}
                              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors"
                            >
                              {task.expanded ? (
                                <ChevronUp className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                              ) : (
                                <ChevronDown className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                              )}
                            </button>
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors"
                            >
                              <Trash2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {task.status === 'failed' && task.error && (
                        <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                          <p className="text-xs sm:text-sm text-red-500 bg-red-50 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3">
                            {task.error}
                          </p>
                        </div>
                      )}

                      {task.status === 'completed' && task.expanded && (
                        <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2.5 sm:space-y-3">
                          {task.sora && (
                            <div className="result-box overflow-hidden">
                              <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-100 bg-white">
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <div className="decoration-dot primary" />
                                  <span className="text-xs sm:text-sm font-semibold text-[#1a3a6b]">Sora</span>
                                </div>
                                <button
                                  onClick={() => copyToClipboard(task.sora!, `${task.id}-sora`)}
                                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500 hover:text-[#4fa3d1] transition-colors"
                                >
                                  {copiedId === `${task.id}-sora` ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
                                      <span className="text-emerald-500">已复制</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                      <span>复制</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <div className="p-3 sm:p-4 max-h-32 sm:max-h-40 overflow-y-auto">
                                <p className="text-xs sm:text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                                  {task.sora}
                                </p>
                              </div>
                            </div>
                          )}

                          {task.seedance && (
                            <div className="result-box overflow-hidden">
                              <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-100 bg-white">
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <div className="decoration-dot secondary" />
                                  <span className="text-xs sm:text-sm font-semibold text-[#4fa3d1]">Seedance</span>
                                </div>
                                <button
                                  onClick={() => copyToClipboard(task.seedance!, `${task.id}-seedance`)}
                                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500 hover:text-[#4fa3d1] transition-colors"
                                >
                                  {copiedId === `${task.id}-seedance` ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
                                      <span className="text-emerald-500">已复制</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                      <span>复制</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <div className="p-3 sm:p-4 max-h-32 sm:max-h-40 overflow-y-auto">
                                <p className="text-xs sm:text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
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
                            className="w-full h-10 sm:h-12 btn-secondary flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
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
                          <span className="text-[#4fa3d1] font-medium text-xs sm:text-sm">展开查看</span>
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
        <footer className={`mt-12 sm:mt-16 md:mt-20 text-center opacity-0 ${mounted ? 'animate-fadeIn delay-400' : ''}`}>
          <div className="inline-flex items-center gap-2 sm:gap-3 text-[#4a6a8a] mb-3 sm:mb-5">
            <div className="h-px w-10 sm:w-16 bg-[#2a4a6a]/30" />
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            <div className="h-px w-10 sm:w-16 bg-[#2a4a6a]/30" />
          </div>
          <p className="text-sm sm:text-base text-[#6a8aaa] mb-1.5 sm:mb-2">
            帮助中国商家出海 | Helping Chinese Merchants Go Global
          </p>
          <p className="text-xs sm:text-sm text-[#4a6a8a]">
            Powered by Coze Workflow
          </p>
        </footer>
      </div>

      {/* 编辑弹窗 */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="card w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden animate-fadeInUp">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 icon-container primary">
                  <Edit3 className="w-5 h-5 sm:w-6 sm:h-6 text-[#4fa3d1]" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800">编辑提示词</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate max-w-[180px] sm:max-w-none">{editingTask.coreSellingPoint}</p>
                </div>
              </div>
              <button
                onClick={cancelEdit}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto max-h-[45vh] sm:max-h-[50vh]">
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-semibold text-gray-700">Sora 提示词</label>
                <textarea
                  value={editSora}
                  onChange={(e) => setEditSora(e.target.value)}
                  className="w-full h-32 sm:h-44 p-3 sm:p-4 input-field text-xs sm:text-sm resize-none"
                  placeholder="Sora 提示词..."
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-semibold text-gray-700">Seedance 提示词</label>
                <textarea
                  value={editSeedance}
                  onChange={(e) => setEditSeedance(e.target.value)}
                  className="w-full h-32 sm:h-44 p-3 sm:p-4 input-field text-xs sm:text-sm resize-none"
                  placeholder="Seedance 提示词..."
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={cancelEdit}
                className="px-4 sm:px-6 py-2.5 sm:py-3 btn-secondary text-xs sm:text-sm"
              >
                取消
              </button>
              <button
                onClick={saveEdit}
                className="px-4 sm:px-6 py-2.5 sm:py-3 btn-primary text-xs sm:text-sm"
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 登录/注册弹窗 */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={login}
        onRegister={register}
      />

      {/* 兑换码弹窗 */}
      {token && (
        <RedeemModal
          isOpen={showRedeemModal}
          onClose={() => setShowRedeemModal(false)}
          onSuccess={(amount) => {
            setBalance(prev => prev + amount);
            // 触发礼花动效
            setShowRedeemConfetti(true);
          }}
          token={token}
        />
      )}

      {/* 欢迎弹窗 - 新用户首次登录 */}
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => {
          setShowWelcomeModal(false);
          clearNewUserFlag();
        }}
        userName={user?.name || user?.email?.split('@')[0] || '新用户'}
        freeCredits={5}
      />

      {/* 兑换成功礼花 */}
      <Confetti
        isActive={showRedeemConfetti}
        duration={3000}
        particleCount={120}
        onComplete={() => setShowRedeemConfetti(false)}
      />
    </div>
  );
}
