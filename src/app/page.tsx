'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Video, Upload, Loader2, CheckCircle2, XCircle, 
  Copy, Check, Sparkles, ChevronDown, ChevronUp, Trash2, 
  ImageIcon, ArrowRight, Zap, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Image from 'next/image';

// 语言选项 - 全球使用量最大的前20种语言（按使用人数排名）
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

// 任务状态类型
type TaskStatus = 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';

// 任务接口
interface Task {
  id: string;
  status: TaskStatus;
  coreSellingPoint: string;
  language: string;
  createdAt: Date;
  progress?: number;
  sora?: string;
  seedance?: string;
  error?: string;
  expanded?: boolean;
  imageUrl?: string;
  imagePreview?: string;
}

// 加载动画文案
const LOADING_MESSAGES = [
  '分析产品特点',
  '构思创意脚本',
  '生成视频分镜',
  '优化提示词',
  '即将完成',
];

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
  
  // 复制状态
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // 加载动画
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  
  // 页面入场动画
  const [mounted, setMounted] = useState(false);
  
  // 文件输入引用
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  // 切换展开状态
  const toggleExpand = (taskId: string) => {
    setTasks(prev => 
      prev.map(task => 
        task.id === taskId ? { ...task, expanded: !task.expanded } : task
      )
    );
  };

  // 上传图片到对象存储
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || '图片上传失败');
    }

    return data.url;
  };

  // 调用工作流生成视频提示词
  const generatePrompt = async (
    imageUrl: string,
    sellingPoint: string,
    speechDur: string,
    videoDur: string,
    lang: string
  ): Promise<{ sora?: string; seedance?: string }> => {
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
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || '提示词生成失败');
    }

    return {
      sora: data.sora,
      seedance: data.seedance,
    };
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!coreSellingPoint.trim() || !productImage) {
      return;
    }

    setIsSubmitting(true);
    setLoadingMessageIndex(0);
    
    const newTask: Task = {
      id: Date.now().toString(),
      status: 'uploading',
      coreSellingPoint,
      language,
      createdAt: new Date(),
      progress: 0,
      expanded: true,
      imagePreview: imagePreview || undefined,
    };

    setTasks(prev => [newTask, ...prev]);

    const messageInterval = setInterval(() => {
      setLoadingMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 1800);

    try {
      setTasks(prev => 
        prev.map(task => 
          task.id === newTask.id 
            ? { ...task, status: 'uploading', progress: 15 }
            : task
        )
      );

      const imageUrl = await uploadImage(productImage);

      setTasks(prev => 
        prev.map(task => 
          task.id === newTask.id 
            ? { ...task, imageUrl: imageUrl, status: 'processing', progress: 35 }
            : task
        )
      );

      const result = await generatePrompt(
        imageUrl,
        coreSellingPoint,
        speechDuration,
        videoDuration,
        language
      );

      setTasks(prev => 
        prev.map(task => 
          task.id === newTask.id 
            ? { 
                ...task, 
                status: 'completed', 
                progress: 100, 
                sora: result.sora,
                seedance: result.seedance,
              }
            : task
        )
      );

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
      clearInterval(messageInterval);
      setIsSubmitting(false);
    }
  };

  // 获取语言名称（带国旗）
  const getLanguageName = (langCode: string) => {
    const lang = LANGUAGES.find(l => l.value === langCode);
    return lang ? `${lang.flag} ${lang.native}` : langCode;
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* 背景光晕 */}
      <div className="fixed inset-0 bg-gradient-radial pointer-events-none" />
      
      {/* 主内容 */}
      <div className="relative max-w-6xl mx-auto px-6 py-8 md:py-12">
        {/* 头部区域 */}
        <header className={`text-center mb-12 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative w-20 h-20 md:w-24 md:h-24">
              <Image
                src="https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F%E9%95%BF%E9%A3%8E%E8%B7%A8%E5%A2%83logo%E6%8F%90%E5%8F%96.png&nonce=53b72a74-c3e7-4c4c-8632-417105b99d47&project_id=7615252896803864582&sign=a7b7df82deb47526062c47ad01bbef2b148a43f5c08de9c3127ab3a27bc61cf9"
                alt="长风跨境"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          </div>
          
          {/* 标签 */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/20 mb-6">
            <Sparkles className="h-3.5 w-3.5 text-sky-500" />
            <span className="text-xs font-medium tracking-wide text-primary">AI Video Generator</span>
          </div>
          
          {/* 标题 */}
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3 text-gradient">
            长风跨境
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
            智能生成视频提示词，助力出海营销
          </p>
          
          {/* 品牌标语 */}
          <p className="text-sm text-muted-foreground/70 mt-3 flex items-center justify-center gap-2">
            <Globe className="h-4 w-4" />
            <span>帮助中国商家出海</span>
          </p>
        </header>

        {/* 主内容区 */}
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          
          {/* 左侧：表单区域 */}
          <div className="space-y-6">
            {/* 表单卡片 */}
            <div className="glass rounded-3xl border border-border p-6 md:p-8 card-hover">
              <div className="flex items-center gap-3 mb-6 md:mb-8">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Video className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-medium">生成提示词</h2>
                  <p className="text-sm text-muted-foreground">填写产品信息，AI自动生成</p>
                </div>
              </div>

              <div className="space-y-5 md:space-y-6">
                {/* 核心卖点 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    核心卖点 <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    placeholder="如：30天见效、无副作用、天然成分..."
                    value={coreSellingPoint}
                    onChange={(e) => setCoreSellingPoint(e.target.value)}
                    className="h-12 bg-secondary border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 input-glow transition-smooth"
                  />
                </div>

                {/* 产品图片 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    产品图片 <span className="text-red-400">*</span>
                  </Label>
                  
                  {imagePreview ? (
                    <div className="relative group">
                      <div className="relative w-full h-32 rounded-2xl overflow-hidden bg-secondary border border-border">
                        <img 
                          src={imagePreview} 
                          alt="产品预览" 
                          className="w-full h-full object-cover img-zoom"
                        />
                        <div className="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 transition-smooth flex items-center justify-center">
                          <button
                            onClick={removeImage}
                            className="px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-lg text-sm font-medium text-white hover:bg-white/20 transition-smooth"
                          >
                            更换图片
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-32 rounded-2xl border-2 border-dashed border-border hover:border-primary/30 bg-secondary/30 hover:bg-secondary/50 transition-smooth flex flex-col items-center justify-center gap-3 group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-secondary group-hover:bg-primary/10 transition-smooth flex items-center justify-center">
                        <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-smooth" />
                      </div>
                      <span className="text-sm text-muted-foreground">点击上传产品图片</span>
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

                {/* 时长设置 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">口播时长</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={speechDuration}
                        onChange={(e) => setSpeechDuration(e.target.value)}
                        className="h-12 bg-secondary border-border rounded-xl pr-12 input-glow transition-smooth"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">秒</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">视频时长</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={videoDuration}
                        onChange={(e) => setVideoDuration(e.target.value)}
                        className="h-12 bg-secondary border-border rounded-xl pr-12 input-glow transition-smooth"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">秒</span>
                    </div>
                  </div>
                </div>

                {/* 语言选择 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    语言 <span className="text-red-400">*</span>
                  </Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="h-12 bg-secondary border-border rounded-xl">
                      <SelectValue placeholder="选择语言" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border rounded-xl max-h-80">
                      {LANGUAGES.map((lang) => (
                        <SelectItem 
                          key={lang.value} 
                          value={lang.value}
                          className="rounded-lg focus:bg-secondary"
                        >
                          <span className="flex items-center gap-2">
                            <span>{lang.flag}</span>
                            <span>{lang.native}</span>
                            <span className="text-muted-foreground text-xs">({lang.label})</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 提交按钮 */}
                <Button
                  onClick={handleSubmit}
                  disabled={!coreSellingPoint.trim() || !productImage || isSubmitting}
                  className="w-full h-14 btn-brand rounded-2xl font-medium text-base btn-ripple disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>生成中...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>生成提示词</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* 右侧：结果区域 */}
          <div className="space-y-4">
            {/* 结果卡片 */}
            <div className="glass rounded-3xl border border-border overflow-hidden">
              {/* 头部 */}
              <div className="p-5 md:p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-sky-500/10 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-sky-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-medium">生成结果</h2>
                      <p className="text-sm text-muted-foreground">
                        {tasks.length > 0 ? `${tasks.length} 条记录` : '暂无记录'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 内容区 */}
              <div className="p-5 md:p-6">
                {tasks.length === 0 ? (
                  <div className="py-12 md:py-16 flex flex-col items-center justify-center">
                    <div className="w-20 h-20 rounded-3xl bg-secondary flex items-center justify-center mb-6">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                    <p className="text-muted-foreground text-center">
                      提交表单后<br />结果将显示在这里
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 -mr-1">
                    {tasks.map((task, index) => (
                      <div
                        key={task.id}
                        className={`rounded-2xl overflow-hidden transition-all duration-500 ${
                          task.status === 'failed' 
                            ? 'bg-red-500/5 border border-red-500/20' 
                            : task.status === 'completed'
                            ? 'bg-secondary/50 border border-border'
                            : 'bg-secondary/30 border border-border/50'
                        }`}
                        style={{
                          animationDelay: `${index * 100}ms`
                        }}
                      >
                        {/* 任务头部 */}
                        <div className="p-4 flex items-start gap-4">
                          {/* 产品图片 */}
                          <div className="flex-shrink-0">
                            {task.imagePreview || task.imageUrl ? (
                              <img 
                                src={task.imagePreview || task.imageUrl} 
                                alt="产品" 
                                className="w-14 h-14 md:w-16 md:h-16 object-cover rounded-xl"
                              />
                            ) : (
                              <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-secondary flex items-center justify-center">
                                <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                              </div>
                            )}
                          </div>

                          {/* 任务信息 */}
                          <div className="flex-1 min-w-0">
                            {/* 状态行 */}
                            <div className="flex items-center gap-2 mb-1">
                              {task.status === 'completed' && (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              )}
                              {task.status === 'failed' && (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              {(task.status === 'processing' || task.status === 'uploading') && (
                                <Loader2 className="h-4 w-4 text-primary animate-spin" />
                              )}
                              
                              <span className="text-sm font-medium">
                                {task.status === 'processing' 
                                  ? LOADING_MESSAGES[loadingMessageIndex]
                                  : task.status === 'uploading'
                                  ? '上传中'
                                  : task.status === 'completed'
                                  ? '生成完成'
                                  : task.status === 'failed'
                                  ? '生成失败'
                                  : '等待中'
                                }
                              </span>
                              
                              {task.status === 'processing' && (
                                <span className="flex gap-1 ml-1">
                                  <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{animationDelay: '0ms'}} />
                                  <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{animationDelay: '150ms'}} />
                                  <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{animationDelay: '300ms'}} />
                                </span>
                              )}
                            </div>
                            
                            {/* 卖点 */}
                            <p className="text-sm text-muted-foreground truncate mb-1">
                              {task.coreSellingPoint}
                            </p>
                            
                            {/* 标签 */}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
                              <span>{getLanguageName(task.language)}</span>
                              <span>•</span>
                              <span>{task.createdAt.toLocaleTimeString()}</span>
                            </div>
                          </div>

                          {/* 操作按钮 */}
                          {task.status === 'completed' && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => toggleExpand(task.id)}
                                className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center transition-smooth"
                              >
                                {task.expanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={() => deleteTask(task.id)}
                                className="w-8 h-8 rounded-lg hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center transition-smooth"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* 进度条 */}
                        {(task.status === 'uploading' || task.status === 'processing') && (
                          <div className="px-4 pb-4">
                            <div className="h-1 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full progress-brand rounded-full transition-all duration-700"
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* 错误信息 */}
                        {task.status === 'failed' && task.error && (
                          <div className="px-4 pb-4">
                            <p className="text-sm text-red-500 bg-red-500/10 rounded-xl px-4 py-3">
                              {task.error}
                            </p>
                          </div>
                        )}

                        {/* 提示词结果 */}
                        {task.status === 'completed' && task.expanded && (
                          <div className="px-4 pb-4 space-y-3">
                            {/* Sora */}
                            {task.sora && (
                              <div className="bg-secondary/50 rounded-xl overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                                  <span className="text-xs font-medium text-primary">Sora</span>
                                  <button
                                    onClick={() => copyToClipboard(task.sora!, `${task.id}-sora`)}
                                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-smooth"
                                  >
                                    {copiedId === `${task.id}-sora` ? (
                                      <>
                                        <Check className="h-3.5 w-3.5 text-green-500" />
                                        <span className="text-green-500">已复制</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="h-3.5 w-3.5" />
                                        <span>复制</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <div className="p-4 max-h-40 overflow-y-auto">
                                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {task.sora}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Seedance */}
                            {task.seedance && (
                              <div className="bg-secondary/50 rounded-xl overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                                  <span className="text-xs font-medium text-sky-500">Seedance</span>
                                  <button
                                    onClick={() => copyToClipboard(task.seedance!, `${task.id}-seedance`)}
                                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-smooth"
                                  >
                                    {copiedId === `${task.id}-seedance` ? (
                                      <>
                                        <Check className="h-3.5 w-3.5 text-green-500" />
                                        <span className="text-green-500">已复制</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="h-3.5 w-3.5" />
                                        <span>复制</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <div className="p-4 max-h-40 overflow-y-auto">
                                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {task.seedance}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* 一键复制全部 */}
                            <button
                              onClick={() => {
                                const allText = `【Sora】\n${task.sora || ''}\n\n【Seedance】\n${task.seedance || ''}`;
                                copyToClipboard(allText, `${task.id}-all`);
                              }}
                              className="w-full h-10 bg-secondary hover:bg-primary/10 rounded-xl text-sm font-medium transition-smooth flex items-center justify-center gap-2"
                            >
                              {copiedId === `${task.id}-all` ? (
                                <>
                                  <Check className="h-4 w-4 text-green-500" />
                                  <span className="text-green-500">已复制全部</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4" />
                                  <span>一键复制全部</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {/* 收起状态 */}
                        {task.status === 'completed' && !task.expanded && (
                          <div className="px-4 pb-4 flex items-center justify-between text-xs text-muted-foreground/50">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                Sora
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                                Seedance
                              </span>
                            </div>
                            <span className="text-primary">展开查看</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 底部 */}
        <footer className={`mt-12 md:mt-16 text-center transition-all duration-700 delay-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-sm text-muted-foreground/50">
            Powered by Coze Workflow
          </p>
        </footer>
      </div>
    </div>
  );
}
