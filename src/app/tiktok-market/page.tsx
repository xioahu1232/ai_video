'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Hash,
  Music,
  Target,
  Lightbulb,
  RefreshCw,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Sparkles,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

interface TrendingData {
  date: string;
  category: string;
  hashtags: Array<{
    tag: string;
    views: string;
    trend: 'up' | 'down' | 'stable';
  }>;
  bgm: Array<{
    name: string;
    artist: string;
    usage_count: string;
    trend: 'up' | 'down' | 'stable';
  }>;
  challenges: Array<{
    name: string;
    participants: string;
    description: string;
  }>;
  insights: string;
  recommendations: string[];
}

interface MarketData {
  success: boolean;
  data: TrendingData;
  rawSearchResults?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
}

const categories = [
  { value: 'general', label: '综合热门', icon: '🔥' },
  { value: 'beauty', label: '美妆护肤', icon: '💄' },
  { value: 'tech', label: '数码科技', icon: '📱' },
  { value: 'fashion', label: '时尚穿搭', icon: '👗' },
  { value: 'food', label: '美食饮品', icon: '🍔' },
  { value: 'fitness', label: '健身运动', icon: '💪' },
];

export default function TikTokMarketPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MarketData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('general');

  const fetchMarketData = async (category: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/tiktok/market-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setData(result);
      } else {
        setError(result.error || '获取数据失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData(selectedCategory);
  }, [selectedCategory]);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#1a3a6b] to-[#0a1628]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#1a3a6b]/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  返回首页
                </Button>
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-[#4fa3d1]" />
                  TikTok 市场分析
                </h1>
                <p className="text-sm text-white/60">实时趋势 · 智能洞察</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchMarketData(selectedCategory)}
              disabled={loading}
              className="border-white/20 text-white hover:bg-white/10"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="ml-2 hidden sm:inline">刷新</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* 类别选择 */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Button
              key={cat.value}
              variant={selectedCategory === cat.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.value)}
              className={
                selectedCategory === cat.value
                  ? 'bg-[#4fa3d1] text-white'
                  : 'border-white/20 text-white hover:bg-white/10'
              }
            >
              <span className="mr-1">{cat.icon}</span>
              {cat.label}
            </Button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-[#4fa3d1]" />
            <p className="mt-4 text-white/60">正在分析TikTok市场趋势...</p>
            <p className="text-sm text-white/40 mt-2">AI正在搜索并整理最新数据</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <Card className="bg-red-500/10 border-red-500/20">
            <CardContent className="pt-6">
              <p className="text-red-400">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchMarketData(selectedCategory)}
                className="mt-4"
              >
                重试
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Data Display */}
        {data && !loading && (
          <div className="space-y-6">
            {/* 日期和类别 */}
            <div className="flex items-center justify-between">
              <Badge className="bg-[#4fa3d1]/20 text-[#4fa3d1] border-[#4fa3d1]/30">
                {data.data.date} · {categories.find(c => c.value === data.data.category)?.label || data.data.category}
              </Badge>
              <span className="text-sm text-white/40">
                数据由AI实时分析生成
              </span>
            </div>

            {/* 热门标签 */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Hash className="w-5 h-5 text-[#4fa3d1]" />
                  热门标签
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.data.hashtags?.map((hashtag, idx) => (
                    <div
                      key={idx}
                      className="bg-white/5 rounded-lg p-3 border border-white/10 hover:border-[#4fa3d1]/50 transition-colors cursor-pointer"
                      onClick={() => navigator.clipboard.writeText(hashtag.tag)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">{hashtag.tag}</span>
                        {getTrendIcon(hashtag.trend)}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm text-white/60">{hashtag.views} 浏览</span>
                        <span className={`text-xs ${getTrendColor(hashtag.trend)}`}>
                          {hashtag.trend === 'up' ? '上升中' : hashtag.trend === 'down' ? '下降中' : '稳定'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 热门BGM */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Music className="w-5 h-5 text-[#4fa3d1]" />
                  热门BGM
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.data.bgm?.map((bgm, idx) => (
                    <div
                      key={idx}
                      className="bg-white/5 rounded-lg p-3 border border-white/10 hover:border-[#4fa3d1]/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-white font-medium">{bgm.name}</span>
                          <span className="text-white/40 mx-2">·</span>
                          <span className="text-white/60">{bgm.artist}</span>
                        </div>
                        {getTrendIcon(bgm.trend)}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm text-white/60">{bgm.usage_count} 次使用</span>
                        <span className={`text-xs ${getTrendColor(bgm.trend)}`}>
                          {bgm.trend === 'up' ? '🔥 爆火' : bgm.trend === 'down' ? '📉 降温' : '➡️ 稳定'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 热门挑战 */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#4fa3d1]" />
                  热门挑战
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.data.challenges?.map((challenge, idx) => (
                    <div
                      key={idx}
                      className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-[#4fa3d1]/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-semibold text-lg">{challenge.name}</span>
                        <Badge className="bg-[#4fa3d1]/20 text-[#4fa3d1]">
                          {challenge.participants} 参与
                        </Badge>
                      </div>
                      <p className="text-white/60 text-sm">{challenge.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 市场洞察 */}
            <Card className="bg-gradient-to-r from-[#4fa3d1]/20 to-[#1a3a6b]/20 border-[#4fa3d1]/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#4fa3d1]" />
                  市场洞察
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/80 leading-relaxed whitespace-pre-line">
                  {data.data.insights}
                </p>
              </CardContent>
            </Card>

            {/* 行动建议 */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-400" />
                  今日行动建议
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.data.recommendations?.map((rec, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 text-white/80"
                    >
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#4fa3d1]/20 text-[#4fa3d1] text-sm flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 数据来源 */}
            {data.rawSearchResults && data.rawSearchResults.length > 0 && (
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    数据来源
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.rawSearchResults.slice(0, 3).map((result, idx) => (
                      <a
                        key={idx}
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-white/60 hover:text-[#4fa3d1] transition-colors"
                      >
                        {result.title}
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
