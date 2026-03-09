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
  Sparkles,
  Zap,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface SmartSEOData {
  overallScore: number;
  category: string;
  analysis?: {
    titleScore: number;
    titleIssues: string[];
    titleOptimizations: string[];
  };
  hashtags?: {
    recommended: Array<{ tag: string; reason: string; expectedReach: string }>;
    strategy: string;
  };
  description?: {
    optimized: string;
    tips: string[];
  };
  postingTime?: {
    best: string[];
    timezone: string;
    reason: string;
  };
  contentStrategy?: {
    hook: string;
    storytelling: string;
    cta: string;
  };
  competitionAnalysis?: {
    level: string;
    opportunities: string[];
    warnings: string[];
  };
  actionItems?: string[];
  rawAnalysis?: string;
}

interface SmartSEOProps {
  prompt: string;
  sellingPoint: string;
  language: string;
  onCopy?: (text: string, type: string) => void;
}

export default function SmartSEO({ prompt, sellingPoint, language, onCopy }: SmartSEOProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SmartSEOData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    title: true,
    hashtags: true,
    description: true,
    posting: true,
    strategy: true,
    competition: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleAnalyze = async () => {
    if (!prompt && !sellingPoint) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/seo/smart-analyze', {
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

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAnalyze}
          className="gap-2 border-[#4fa3d1] text-[#4fa3d1] hover:bg-[#4fa3d1] hover:text-white"
        >
          <Sparkles className="w-4 h-4" />
          AI SEO分析
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1a3a6b]">
            <Sparkles className="w-5 h-5 text-[#4fa3d1]" />
            TikTok AI SEO 分析
            <Badge className="bg-[#4fa3d1]/20 text-[#4fa3d1] text-xs">智能分析</Badge>
          </DialogTitle>
        </DialogHeader>
        
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-[#4fa3d1]" />
            <p className="mt-4 text-gray-600">AI正在分析...</p>
            <p className="text-sm text-gray-400 mt-1">搜索最新趋势并生成优化建议</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">分析失败</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
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
                    <p className="text-sm text-gray-500">
                      产品类别：{data.category || '综合'}
                    </p>
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
                <p className="text-xs text-gray-400 mt-2 text-right">
                  基于实时TikTok数据智能分析
                </p>
              </CardContent>
            </Card>

            {/* 如果是原始分析结果 */}
            {data.rawAnalysis && (
              <Card className="border-[#4fa3d1]/20">
                <CardContent className="pt-6">
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                      {data.rawAnalysis}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 标题分析 */}
            {data.analysis && (
              <Card className="border-[#4fa3d1]/20">
                <CardHeader 
                  className="cursor-pointer"
                  onClick={() => toggleSection('title')}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-[#1a3a6b]">
                      <FileText className="w-5 h-5 text-[#4fa3d1]" />
                      标题分析
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={getScoreBadge(data.analysis.titleScore).className}>
                        {data.analysis.titleScore}分
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
                    {data.analysis.titleIssues.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-red-600">⚠️ 问题：</p>
                        <ul className="text-sm text-gray-600 list-disc list-inside">
                          {data.analysis.titleIssues.map((issue, idx) => (
                            <li key={idx}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-[#1a3a6b]">✨ 优化版本：</p>
                      {data.analysis.titleOptimizations.map((version, idx) => (
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
            )}

            {/* 标签策略 */}
            {data.hashtags && (
              <Card className="border-[#4fa3d1]/20">
                <CardHeader 
                  className="cursor-pointer"
                  onClick={() => toggleSection('hashtags')}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-[#1a3a6b]">
                      <Hash className="w-5 h-5 text-[#4fa3d1]" />
                      智能标签推荐
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
                      {data.hashtags.strategy}
                    </p>
                    <div className="space-y-2">
                      {data.hashtags.recommended.map((tag, idx) => (
                        <div
                          key={idx}
                          className="group flex items-center justify-between bg-gray-50 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="cursor-pointer hover:bg-[#4fa3d1] hover:text-white transition-colors"
                              onClick={() => handleCopy(tag.tag, `hashtag-${idx}`)}
                            >
                              {tag.tag}
                            </Badge>
                            <span className="text-xs text-gray-500">{tag.expectedReach}</span>
                          </div>
                          <span className="text-xs text-gray-400 hidden sm:block">{tag.reason}</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleCopy(
                        data.hashtags!.recommended.map(t => t.tag).join(' '),
                        'all-hashtags'
                      )}
                    >
                      {copied === 'all-hashtags' ? '✓ 已复制全部标签' : '复制全部标签'}
                    </Button>
                  </CardContent>
                )}
              </Card>
            )}

            {/* 描述优化 */}
            {data.description && (
              <Card className="border-[#4fa3d1]/20">
                <CardHeader 
                  className="cursor-pointer"
                  onClick={() => toggleSection('description')}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-[#1a3a6b]">
                      <FileText className="w-5 h-5 text-[#4fa3d1]" />
                      描述优化
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
                      {data.description.optimized}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleCopy(data.description!.optimized, 'description')}
                    >
                      {copied === 'description' ? '✓ 已复制' : '复制描述'}
                    </Button>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {data.description.tips.map((tip, idx) => (
                        <li key={idx}>💡 {tip}</li>
                      ))}
                    </ul>
                  </CardContent>
                )}
              </Card>
            )}

            {/* 发布时机 */}
            {data.postingTime && (
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
                    <div className="flex flex-wrap gap-2">
                      {data.postingTime.best.map((time, idx) => (
                        <Badge key={idx} className="bg-green-500 text-lg px-4 py-1">
                          {time}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600">
                      时区：{data.postingTime.timezone}
                    </p>
                    <p className="text-sm text-gray-500">
                      {data.postingTime.reason}
                    </p>
                  </CardContent>
                )}
              </Card>
            )}

            {/* 内容策略 */}
            {data.contentStrategy && (
              <Card className="border-[#4fa3d1]/20">
                <CardHeader 
                  className="cursor-pointer"
                  onClick={() => toggleSection('strategy')}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-[#1a3a6b]">
                      <Zap className="w-5 h-5 text-[#4fa3d1]" />
                      内容策略
                    </CardTitle>
                    {expandedSections.strategy ? 
                      <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    }
                  </div>
                </CardHeader>
                {expandedSections.strategy && (
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="bg-gradient-to-r from-[#1a3a6b]/5 to-[#4fa3d1]/5 p-3 rounded-lg">
                        <p className="text-sm font-medium text-[#1a3a6b]">🎯 开场钩子</p>
                        <p className="text-sm text-gray-600 mt-1">{data.contentStrategy.hook}</p>
                      </div>
                      <div className="bg-gradient-to-r from-[#1a3a6b]/5 to-[#4fa3d1]/5 p-3 rounded-lg">
                        <p className="text-sm font-medium text-[#1a3a6b]">📖 叙事结构</p>
                        <p className="text-sm text-gray-600 mt-1">{data.contentStrategy.storytelling}</p>
                      </div>
                      <div className="bg-gradient-to-r from-[#1a3a6b]/5 to-[#4fa3d1]/5 p-3 rounded-lg">
                        <p className="text-sm font-medium text-[#1a3a6b]">📢 行动号召</p>
                        <p className="text-sm text-gray-600 mt-1">{data.contentStrategy.cta}</p>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* 竞争分析 */}
            {data.competitionAnalysis && (
              <Card className="border-[#4fa3d1]/20">
                <CardHeader 
                  className="cursor-pointer"
                  onClick={() => toggleSection('competition')}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-[#1a3a6b]">
                      <Target className="w-5 h-5 text-[#4fa3d1]" />
                      竞争分析
                    </CardTitle>
                    {expandedSections.competition ? 
                      <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    }
                  </div>
                </CardHeader>
                {expandedSections.competition && (
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">竞争程度：</span>
                      <Badge className={
                        data.competitionAnalysis.level === '高' ? 'bg-red-500' :
                        data.competitionAnalysis.level === '中' ? 'bg-yellow-500' : 'bg-green-500'
                      }>
                        {data.competitionAnalysis.level}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-green-600">✅ 机会点：</p>
                      <ul className="text-sm text-gray-600 list-disc list-inside">
                        {data.competitionAnalysis.opportunities.map((opp, idx) => (
                          <li key={idx}>{opp}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-orange-600">⚠️ 注意事项：</p>
                      <ul className="text-sm text-gray-600 list-disc list-inside">
                        {data.competitionAnalysis.warnings.map((warn, idx) => (
                          <li key={idx}>{warn}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* 行动清单 */}
            {data.actionItems && (
              <Card className="bg-gradient-to-r from-[#1a3a6b] to-[#4fa3d1] text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Lightbulb className="w-5 h-5" />
                    行动清单
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {data.actionItems.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 text-white text-sm flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
