'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  TrendingUp,
  Hash,
  Clock,
  FileText,
  Target,
  Lightbulb,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SEOData {
  category: string;
  overallScore: number;
  hashtagStrategy: {
    recommended: Array<{ tag: string; views: string; category: string; reason: string }>;
    strategy: string;
  };
  titleAnalysis: {
    score: number;
    issues: string[];
    suggestions: string[];
    optimizedVersions: string[];
  };
  description: string;
  descriptionTips: string[];
  postingTimes: {
    peak: string[];
    good: string[];
  };
  ranking: {
    estimatedViews: string;
    difficulty: string;
    tips: string[];
  };
  recommendations: string[];
}

interface TikTokSEOProps {
  prompt: string;
  sellingPoint: string;
  language: string;
  onCopy?: (text: string, type: string) => void;
}

export default function TikTokSEO({ prompt, sellingPoint, language, onCopy }: TikTokSEOProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SEOData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    hashtags: true,
    title: true,
    description: true,
    posting: true,
    ranking: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleAnalyze = async () => {
    if (!prompt && !sellingPoint) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/seo/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, sellingPoint, language }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || '分析失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
    if (onCopy) onCopy(text, type);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { text: '优秀', className: 'bg-green-500' };
    if (score >= 60) return { text: '良好', className: 'bg-yellow-500' };
    return { text: '需优化', className: 'bg-red-500' };
  };

  const getCategoryBadge = (category: string) => {
    const categoryNames: Record<string, string> = {
      beauty: '美妆护肤',
      tech: '数码科技',
      fashion: '时尚穿搭',
      food: '美食饮品',
      fitness: '健身运动',
      general: '综合',
    };
    return categoryNames[category] || category;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAnalyze}
          className="gap-2 border-[#4fa3d1] text-[#4fa3d1] hover:bg-[#4fa3d1] hover:text-white"
        >
          <TrendingUp className="w-4 h-4" />
          SEO优化
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1a3a6b]">
            <TrendingUp className="w-5 h-5" />
            TikTok SEO 优化分析
          </DialogTitle>
        </DialogHeader>
        
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4fa3d1]"></div>
            <p className="mt-4 text-gray-500">正在分析中...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
            {error}
          </div>
        )}
        
        {data && !loading && (
          <div className="space-y-4">
            {/* 综合评分 */}
            <Card className="border-[#4fa3d1]/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[#1a3a6b]">综合SEO评分</h3>
                    <p className="text-sm text-gray-500">检测到类目：{getCategoryBadge(data.category)}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-4xl font-bold ${getScoreColor(data.overallScore)}`}>
                      {data.overallScore}
                    </div>
                    <Badge className={getScoreBadge(data.overallScore).className}>
                      {getScoreBadge(data.overallScore).text}
                    </Badge>
                  </div>
                </div>
                <Progress value={data.overallScore} className="h-2" />
              </CardContent>
            </Card>

            {/* 标签策略 */}
            <Card className="border-[#4fa3d1]/20">
              <CardHeader 
                className="cursor-pointer"
                onClick={() => toggleSection('hashtags')}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-[#1a3a6b]">
                    <Hash className="w-5 h-5 text-[#4fa3d1]" />
                    标签策略
                  </CardTitle>
                  {expandedSections.hashtags ? 
                    <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  }
                </div>
              </CardHeader>
              {expandedSections.hashtags && (
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                    {data.hashtagStrategy.strategy}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {data.hashtagStrategy.recommended.map((tag, idx) => (
                      <div key={idx} className="group relative">
                        <Badge
                          variant="outline"
                          className="cursor-pointer hover:bg-[#4fa3d1] hover:text-white transition-colors"
                          onClick={() => handleCopy(`#${tag.tag}`, `hashtag-${idx}`)}
                        >
                          #{tag.tag}
                          {copied === `hashtag-${idx}` ? 
                            <Check className="w-3 h-3 ml-1" /> : 
                            <Copy className="w-3 h-3 ml-1" />
                          }
                        </Badge>
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {tag.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleCopy(
                      data.hashtagStrategy.recommended.map(t => `#${t.tag}`).join(' '),
                      'all-hashtags'
                    )}
                  >
                    {copied === 'all-hashtags' ? '✓ 已复制全部标签' : '复制全部标签'}
                  </Button>
                </CardContent>
              )}
            </Card>

            {/* 标题优化 */}
            <Card className="border-[#4fa3d1]/20">
              <CardHeader 
                className="cursor-pointer"
                onClick={() => toggleSection('title')}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-[#1a3a6b]">
                    <FileText className="w-5 h-5 text-[#4fa3d1]" />
                    标题优化
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={getScoreBadge(data.titleAnalysis.score).className}>
                      {data.titleAnalysis.score}分
                    </Badge>
                    {expandedSections.title ? 
                      <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    }
                  </div>
                </div>
              </CardHeader>
              {expandedSections.title && (
                <CardContent className="space-y-3">
                  {/* 问题 */}
                  {data.titleAnalysis.issues.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-red-600">⚠️ 存在问题：</p>
                      <ul className="text-sm text-gray-600 list-disc list-inside">
                        {data.titleAnalysis.issues.map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* 建议 */}
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-[#1a3a6b]">💡 优化建议：</p>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                      {data.titleAnalysis.suggestions.map((suggestion, idx) => (
                        <li key={idx}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* 优化版本 */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[#1a3a6b]">✨ 优化版本：</p>
                    {data.titleAnalysis.optimizedVersions.map((version, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-50 p-3 rounded-lg text-sm cursor-pointer hover:bg-gray-100 transition-colors flex items-start justify-between gap-2"
                        onClick={() => handleCopy(version, `title-${idx}`)}
                      >
                        <span>{version}</span>
                        {copied === `title-${idx}` ? 
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" /> : 
                          <Copy className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        }
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* 描述生成 */}
            <Card className="border-[#4fa3d1]/20">
              <CardHeader 
                className="cursor-pointer"
                onClick={() => toggleSection('description')}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-[#1a3a6b]">
                    <FileText className="w-5 h-5 text-[#4fa3d1]" />
                    SEO描述
                  </CardTitle>
                  {expandedSections.description ? 
                    <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  }
                </div>
              </CardHeader>
              {expandedSections.description && (
                <CardContent className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded-lg text-sm whitespace-pre-line">
                    {data.description}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleCopy(data.description, 'description')}
                  >
                    {copied === 'description' ? '✓ 已复制描述' : '复制描述'}
                  </Button>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-[#1a3a6b]">📌 描述技巧：</p>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                      {data.descriptionTips.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* 发布时机 */}
            <Card className="border-[#4fa3d1]/20">
              <CardHeader 
                className="cursor-pointer"
                onClick={() => toggleSection('posting')}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-[#1a3a6b]">
                    <Clock className="w-5 h-5 text-[#4fa3d1]" />
                    最佳发布时间
                  </CardTitle>
                  {expandedSections.posting ? 
                    <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  }
                </div>
              </CardHeader>
              {expandedSections.posting && (
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-green-700 mb-1">🔥 黄金时段</p>
                      <div className="space-y-1">
                        {data.postingTimes.peak.map((time, idx) => (
                          <Badge key={idx} className="bg-green-500 mr-1">{time}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-blue-700 mb-1">✅ 推荐时段</p>
                      <div className="space-y-1">
                        {data.postingTimes.good.map((time, idx) => (
                          <Badge key={idx} className="bg-blue-500 mr-1">{time}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    * 时间为本地时区，建议提前15分钟发布以通过审核
                  </p>
                </CardContent>
              )}
            </Card>

            {/* 排名预测 */}
            <Card className="border-[#4fa3d1]/20">
              <CardHeader 
                className="cursor-pointer"
                onClick={() => toggleSection('ranking')}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-[#1a3a6b]">
                    <Target className="w-5 h-5 text-[#4fa3d1]" />
                    流量预测
                  </CardTitle>
                  {expandedSections.ranking ? 
                    <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  }
                </div>
              </CardHeader>
              {expandedSections.ranking && (
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-purple-700">预估播放量</p>
                      <p className="text-xl font-bold text-purple-600">{data.ranking.estimatedViews}</p>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-orange-700">竞争难度</p>
                      <p className="text-xl font-bold text-orange-600">{data.ranking.difficulty}</p>
                    </div>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {data.ranking.tips.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </CardContent>
              )}
            </Card>

            {/* 综合建议 */}
            <Card className="bg-gradient-to-r from-[#1a3a6b] to-[#4fa3d1] text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Lightbulb className="w-5 h-5" />
                  优化行动清单
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-white/80">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
