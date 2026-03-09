'use client';

import { useState, useRef } from 'react';
import { Video, Clock, Upload, Loader2, CheckCircle2, XCircle } from 'lucide-react';
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
type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

// 任务接口
interface Task {
  id: string;
  status: TaskStatus;
  coreSellingPoint: string;
  language: string;
  createdAt: Date;
  progress?: number;
  videoUrl?: string;
  error?: string;
}

export default function Home() {
  // 表单状态
  const [coreSellingPoint, setCoreSellingPoint] = useState('');
  const [productImage, setProductImage] = useState<File | null>(null);
  const [speechDuration, setSpeechDuration] = useState('12');
  const [videoDuration, setVideoDuration] = useState('15');
  const [language, setLanguage] = useState('es');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 任务列表状态
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // 文件输入引用
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProductImage(file);
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!coreSellingPoint.trim() || !productImage) {
      return;
    }

    setIsSubmitting(true);
    
    // 创建新任务
    const newTask: Task = {
      id: Date.now().toString(),
      status: 'pending',
      coreSellingPoint,
      language,
      createdAt: new Date(),
      progress: 0,
    };

    setTasks(prev => [newTask, ...prev]);

    // 模拟任务处理
    // TODO: 替换为真实的后端API调用
    setTimeout(() => {
      setTasks(prev => 
        prev.map(task => 
          task.id === newTask.id 
            ? { ...task, status: 'processing', progress: 30 }
            : task
        )
      );
    }, 1000);

    setTimeout(() => {
      setTasks(prev => 
        prev.map(task => 
          task.id === newTask.id 
            ? { ...task, progress: 60 }
            : task
        )
      );
    }, 2000);

    setTimeout(() => {
      setTasks(prev => 
        prev.map(task => 
          task.id === newTask.id 
            ? { ...task, status: 'completed', progress: 100, videoUrl: '#' }
            : task
        )
      );
      setIsSubmitting(false);
    }, 3000);

    // 重置表单
    setCoreSellingPoint('');
    setProductImage(null);
    setSpeechDuration('12');
    setVideoDuration('15');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  // 获取状态文本
  const getStatusText = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return '等待中';
      case 'processing':
        return '处理中';
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark text-foreground p-6">
      {/* 顶部导航 */}
      <div className="max-w-6xl mx-auto">
        {/* 功能标识按钮 */}
        <div className="flex justify-center mb-6">
          <div className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-full">
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
            通过AI技术快速生成高质量视频内容，助力您的营销推广
          </p>
        </div>

        {/* 双卡片布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：生成视频表单 */}
          <Card className="bg-card border border-border backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Video className="h-5 w-5 text-blue-500" />
                生成视频
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
                  <span className="text-sm text-muted-foreground">
                    {productImage ? productImage.name : '未选择任何文件'}
                  </span>
                </div>
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
                {isSubmitting ? '生成中...' : '生成视频'}
              </Button>
            </CardContent>
          </Card>

          {/* 右侧：任务列表 */}
          <Card className="bg-card border border-border backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-blue-500" />
                  任务列表
                </CardTitle>
                <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {tasks.length} 个任务
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-12 w-12 mb-4 opacity-20" />
                  <p className="text-sm font-medium mb-1">暂无任务</p>
                  <p className="text-xs">提交表单后任务将显示在这里</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 bg-secondary/50 border border-border rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(task.status)}
                          <span className="text-sm font-medium">
                            {getStatusText(task.status)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {task.createdAt.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mb-2">
                        {task.coreSellingPoint}
                      </p>
                      {task.status === 'processing' && (
                        <div className="w-full bg-secondary rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      )}
                      {task.status === 'completed' && task.videoUrl && (
                        <Button
                          size="sm"
                          className="mt-2 bg-blue-600 hover:bg-blue-700"
                          onClick={() => window.open(task.videoUrl, '_blank')}
                        >
                          查看视频
                        </Button>
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
