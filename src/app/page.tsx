'use client';

import { useState, useRef } from 'react';
import { Video, Clock, Upload, Loader2, CheckCircle2, XCircle, Copy, Check, Sparkles, FileText, ChevronDown, ChevronUp, Trash2, ImageIcon } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// 语言选项
const LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'pt', label: 'Português' },
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
  imageUrl?: string;      // 图片URL（上传后的）
  imagePreview?: string;  // 本地预览URL
}

// 加载动画文案
const LOADING_MESSAGES = [
  '正在分析产品卖点...',
  'AI正在构思创意...',
  '生成视频脚本中...',
  '优化提示词质量...',
  '即将完成...',
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
  
  // 文件输入引用
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProductImage(file);
      // 创建本地预览URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
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
    
    // 创建新任务，保存本地预览图片
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

    // 加载动画轮播
    const messageInterval = setInterval(() => {
      setLoadingMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);

    try {
      // 步骤1：上传图片
      setTasks(prev => 
        prev.map(task => 
          task.id === newTask.id 
            ? { ...task, status: 'uploading', progress: 20 }
            : task
        )
      );

      const imageUrl = await uploadImage(productImage);
      console.log('Image uploaded:', imageUrl);

      // 更新任务的图片URL
      setTasks(prev => 
        prev.map(task => 
          task.id === newTask.id 
            ? { ...task, imageUrl: imageUrl }
            : task
        )
      );

      // 步骤2：调用工作流
      setTasks(prev => 
        prev.map(task => 
          task.id === newTask.id 
            ? { ...task, status: 'processing', progress: 50 }
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
      console.log('Prompts generated:', result);

      // 完成
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

  // 获取语言名称
  const getLanguageName = (langCode: string) => {
    const lang = LANGUAGES.find(l => l.value === langCode);
    return lang?.label || langCode;
  };

  return (
    <div className="min-h-screen bg-gradient-dark text-foreground p-6">
      {/* 顶部导航 */}
      <div className="max-w-6xl mx-auto">
        {/* 功能标识按钮 */}
        <div className="flex justify-center mb-6">
          <div className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-full flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Video Generator
          </div>
        </div>

        {/* 标题区域 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">梵梦AIGC</h1>
            <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">
              v4.6Rbeta
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            通过AI技术快速生成高质量视频提示词，助力您的营销推广
          </p>
        </div>

        {/* 双卡片布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：生成视频表单 */}
          <Card className="bg-card border border-border backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Video className="h-5 w-5 text-blue-500" />
                生成提示词
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* 核心卖点 */}
              <div className="space-y-2">
                <Label htmlFor="sellingPoint" className="text-sm">
                  核心卖点 <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="sellingPoint"
                  placeholder="请输入产品核心优势，如：30天见效、无副作用、天然成分..."
                  value={coreSellingPoint}
                  onChange={(e) => setCoreSellingPoint(e.target.value)}
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {/* 产品图片 */}
              <div className="space-y-2">
                <Label htmlFor="productImage" className="text-sm">
                  产品图片 <span className="text-red-400">*</span>
                </Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-secondary border-border hover:bg-secondary/80"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    选择文件
                  </Button>
                  <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {productImage ? productImage.name : '未选择任何文件'}
                  </span>
                </div>
                {/* 图片预览 */}
                {imagePreview && (
                  <div className="mt-2 relative inline-block">
                    <img 
                      src={imagePreview} 
                      alt="产品预览" 
                      className="h-20 w-20 object-cover rounded-lg border border-border"
                    />
                  </div>
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
                  <Label htmlFor="speechDuration" className="text-sm">
                    口播时长（秒）
                  </Label>
                  <div className="relative">
                    <Input
                      id="speechDuration"
                      type="number"
                      value={speechDuration}
                      onChange={(e) => setSpeechDuration(e.target.value)}
                      className="bg-secondary border-border text-foreground pr-10"
                    />
                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="videoDuration" className="text-sm">
                    视频时长（秒）
                  </Label>
                  <div className="relative">
                    <Input
                      id="videoDuration"
                      type="number"
                      value={videoDuration}
                      onChange={(e) => setVideoDuration(e.target.value)}
                      className="bg-secondary border-border text-foreground pr-10"
                    />
                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              {/* 语言选择 */}
              <div className="space-y-2">
                <Label className="text-sm">
                  语言 <span className="text-red-400">*</span>
                </Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue placeholder="选择语言" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {LANGUAGES.map((lang) => (
                      <SelectItem 
                        key={lang.value} 
                        value={lang.value}
                        className="text-foreground hover:bg-secondary focus:bg-secondary"
                      >
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 提交按钮 */}
              <Button
                onClick={handleSubmit}
                disabled={!coreSellingPoint.trim() || !productImage || isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 glow-blue transition-all"
              >
                <Video className="h-4 w-4 mr-2" />
                {isSubmitting ? '生成中...' : '生成提示词'}
              </Button>
            </CardContent>
          </Card>

          {/* 右侧：任务列表 */}
          <Card className="bg-card border border-border backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-blue-500" />
                  生成结果
                </CardTitle>
                {tasks.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    共 {tasks.length} 条记录
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                    <Sparkles className="h-8 w-8 opacity-30" />
                  </div>
                  <p className="text-sm font-medium mb-1">暂无生成记录</p>
                  <p className="text-xs">提交表单后结果将显示在这里</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`rounded-xl overflow-hidden transition-all duration-300 ${
                        task.status === 'failed' 
                          ? 'bg-red-500/5 border border-red-500/20' 
                          : task.status === 'completed'
                          ? 'bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-blue-500/20'
                          : 'bg-secondary/30 border border-border'
                      }`}
                    >
                      {/* 任务头部 - 带图片 */}
                      <div className="p-4 flex items-start gap-3">
                        {/* 产品图片缩略图 */}
                        <div className="flex-shrink-0">
                          {task.imagePreview || task.imageUrl ? (
                            <img 
                              src={task.imagePreview || task.imageUrl} 
                              alt="产品" 
                              className="w-16 h-16 object-cover rounded-lg border border-border/50"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-secondary/50 border border-border/50 flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>

                        {/* 任务信息 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              {/* 状态行 */}
                              <div className="flex items-center gap-2 mb-1">
                                {/* 状态图标 */}
                                <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                                  task.status === 'completed' 
                                    ? 'bg-green-500/20' 
                                    : task.status === 'failed'
                                    ? 'bg-red-500/20'
                                    : task.status === 'processing'
                                    ? 'bg-blue-500/20'
                                    : 'bg-yellow-500/20'
                                }`}>
                                  {task.status === 'completed' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                                  {task.status === 'failed' && <XCircle className="h-3 w-3 text-red-500" />}
                                  {task.status === 'processing' && <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />}
                                  {task.status === 'uploading' && <Upload className="h-3 w-3 text-yellow-500 animate-pulse" />}
                                  {task.status === 'pending' && <Clock className="h-3 w-3 text-yellow-500" />}
                                </div>
                                
                                <span className="text-sm font-medium truncate">
                                  {task.status === 'processing' 
                                    ? LOADING_MESSAGES[loadingMessageIndex]
                                    : task.status === 'uploading'
                                    ? '正在上传图片...'
                                    : task.status === 'completed'
                                    ? '生成完成'
                                    : task.status === 'failed'
                                    ? '生成失败'
                                    : '等待中'
                                  }
                                </span>
                                {task.status === 'processing' && (
                                  <span className="inline-flex gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{animationDelay: '0ms'}} />
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{animationDelay: '150ms'}} />
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{animationDelay: '300ms'}} />
                                  </span>
                                )}
                              </div>
                              
                              {/* 核心卖点 */}
                              <p className="text-xs text-muted-foreground truncate mb-1.5">
                                {task.coreSellingPoint}
                              </p>
                              
                              {/* 标签 */}
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded">
                                  {getLanguageName(task.language)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {task.createdAt.toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                            
                            {/* 操作按钮 */}
                            {task.status === 'completed' && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => toggleExpand(task.id)}
                                >
                                  {task.expanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 hover:text-red-400"
                                  onClick={() => deleteTask(task.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 进度条 */}
                      {(task.status === 'uploading' || task.status === 'processing') && (
                        <div className="px-4 pb-3">
                          <div className="h-1 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* 错误信息 */}
                      {task.status === 'failed' && task.error && (
                        <div className="px-4 pb-4">
                          <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                            {task.error}
                          </p>
                        </div>
                      )}

                      {/* 生成的提示词 */}
                      {task.status === 'completed' && task.expanded && (
                        <div className="px-4 pb-4 space-y-3">
                          {/* Sora 提示词 */}
                          {task.sora && (
                            <div className="bg-secondary/50 rounded-lg overflow-hidden">
                              <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
                                <span className="text-xs font-medium text-blue-400 flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                                  Sora 提示词
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => copyToClipboard(task.sora!, `${task.id}-sora`)}
                                >
                                  {copiedId === `${task.id}-sora` ? (
                                    <>
                                      <Check className="h-3 w-3 mr-1 text-green-500" />
                                      已复制
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3 w-3 mr-1" />
                                      复制
                                    </>
                                  )}
                                </Button>
                              </div>
                              <div className="p-3 max-h-48 overflow-y-auto">
                                <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
                                  {task.sora}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Seedance 提示词 */}
                          {task.seedance && (
                            <div className="bg-secondary/50 rounded-lg overflow-hidden">
                              <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
                                <span className="text-xs font-medium text-purple-400 flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                                  Seedance 提示词
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => copyToClipboard(task.seedance!, `${task.id}-seedance`)}
                                >
                                  {copiedId === `${task.id}-seedance` ? (
                                    <>
                                      <Check className="h-3 w-3 mr-1 text-green-500" />
                                      已复制
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3 w-3 mr-1" />
                                      复制
                                    </>
                                  )}
                                </Button>
                              </div>
                              <div className="p-3 max-h-48 overflow-y-auto">
                                <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
                                  {task.seedance}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* 一键复制全部 */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full bg-secondary/30 border-border hover:bg-secondary/50"
                            onClick={() => {
                              const allText = `【Sora 提示词】\n${task.sora || ''}\n\n【Seedance 提示词】\n${task.seedance || ''}`;
                              copyToClipboard(allText, `${task.id}-all`);
                            }}
                          >
                            {copiedId === `${task.id}-all` ? (
                              <>
                                <Check className="h-4 w-4 mr-2 text-green-500" />
                                已复制全部内容
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4 mr-2" />
                                一键复制全部
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {/* 收起状态的提示词预览 */}
                      {task.status === 'completed' && !task.expanded && (
                        <div className="px-4 pb-4 flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            Sora
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-purple-500" />
                            Seedance
                          </span>
                          <span className="text-blue-400 ml-auto">点击展开查看</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 底部标注 */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          Powered by Coze Workflow
        </div>
      </div>
    </div>
  );
}
