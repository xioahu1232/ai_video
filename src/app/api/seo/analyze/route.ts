import { NextRequest, NextResponse } from 'next/server';

// TikTok热门标签数据库（按类别）
const POPULAR_HASHTAGS: Record<string, Array<{ tag: string; views: string; category: string }>> = {
  beauty: [
    { tag: 'beautytok', views: '150B+', category: 'large' },
    { tag: 'skincare', views: '80B+', category: 'large' },
    { tag: 'makeup', views: '120B+', category: 'large' },
    { tag: 'skincareroutine', views: '45B+', category: 'medium' },
    { tag: 'beautyhacks', views: '30B+', category: 'medium' },
    { tag: 'glowskin', views: '15B+', category: 'small' },
    { tag: 'skintips', views: '8B+', category: 'small' },
  ],
  tech: [
    { tag: 'techtok', views: '100B+', category: 'large' },
    { tag: 'gadgets', views: '60B+', category: 'large' },
    { tag: 'techreview', views: '35B+', category: 'medium' },
    { tag: 'unboxing', views: '50B+', category: 'medium' },
    { tag: 'techtips', views: '20B+', category: 'medium' },
    { tag: 'gadgetlover', views: '5B+', category: 'small' },
    { tag: 'techlife', views: '10B+', category: 'small' },
  ],
  fashion: [
    { tag: 'fashiontok', views: '130B+', category: 'large' },
    { tag: 'ootd', views: '90B+', category: 'large' },
    { tag: 'styleinspo', views: '40B+', category: 'medium' },
    { tag: 'outfitideas', views: '25B+', category: 'medium' },
    { tag: 'fashionhacks', views: '15B+', category: 'small' },
    { tag: 'streetstyle', views: '8B+', category: 'small' },
  ],
  food: [
    { tag: 'foodtok', views: '200B+', category: 'large' },
    { tag: 'recipe', views: '80B+', category: 'large' },
    { tag: 'cooking', views: '100B+', category: 'large' },
    { tag: 'easyrecipe', views: '35B+', category: 'medium' },
    { tag: 'foodie', views: '120B+', category: 'large' },
    { tag: 'homecooking', views: '15B+', category: 'small' },
    { tag: 'yummy', views: '50B+', category: 'medium' },
  ],
  fitness: [
    { tag: 'fitness', views: '150B+', category: 'large' },
    { tag: 'workout', views: '100B+', category: 'large' },
    { tag: 'gymtok', views: '80B+', category: 'large' },
    { tag: 'homeworkout', views: '40B+', category: 'medium' },
    { tag: 'fitnesstips', views: '20B+', category: 'medium' },
    { tag: 'fitnessmotivation', views: '30B+', category: 'medium' },
    { tag: 'getfit', views: '5B+', category: 'small' },
  ],
  general: [
    { tag: 'fyp', views: '5000B+', category: 'large' },
    { tag: 'foryou', views: '3000B+', category: 'large' },
    { tag: 'viral', views: '500B+', category: 'large' },
    { tag: 'trending', views: '300B+', category: 'large' },
    { tag: 'tiktok', views: '1000B+', category: 'large' },
  ],
};

// 各时区最佳发布时间
const BEST_POSTING_TIMES: Record<string, { peak: string[]; good: string[] }> = {
  'zh': { peak: ['18:00', '19:00', '20:00'], good: ['12:00', '13:00', '21:00'] },
  'en': { peak: ['09:00', '12:00', '19:00'], good: ['07:00', '15:00', '21:00'] },
  'ja': { peak: ['19:00', '20:00', '21:00'], good: ['12:00', '18:00', '22:00'] },
  'ko': { peak: ['18:00', '19:00', '20:00'], good: ['12:00', '17:00', '21:00'] },
  'es': { peak: ['10:00', '13:00', '20:00'], good: ['09:00', '15:00', '21:00'] },
  'fr': { peak: ['09:00', '12:00', '19:00'], good: ['08:00', '14:00', '20:00'] },
  'de': { peak: ['09:00', '12:00', '18:00'], good: ['07:00', '14:00', '20:00'] },
  'pt': { peak: ['10:00', '13:00', '19:00'], good: ['09:00', '15:00', '20:00'] },
  'ar': { peak: ['18:00', '19:00', '20:00'], good: ['12:00', '17:00', '21:00'] },
  'hi': { peak: ['18:00', '19:00', '20:00'], good: ['12:00', '17:00', '21:00'] },
};

// 检测产品类别
function detectCategory(content: string): string {
  const keywords: Record<string, string[]> = {
    beauty: ['护肤', '美妆', '化妆品', '面膜', '精华', '口红', '眼影', '粉底', 'skincare', 'beauty', 'makeup', 'cream', 'serum', 'lipstick'],
    tech: ['数码', '电子', '手机', '耳机', '电脑', '智能', 'gadget', 'tech', 'phone', 'earphone', 'laptop', 'smart'],
    fashion: ['服装', '穿搭', '时尚', '衣服', '鞋子', '包包', 'fashion', 'style', 'clothing', 'shoes', 'bag', 'wear'],
    food: ['食品', '零食', '饮料', '美食', '健康', '营养', 'food', 'snack', 'drink', 'healthy', 'nutrition', 'eat'],
    fitness: ['健身', '运动', '减肥', '瑜伽', '训练', 'fitness', 'workout', 'exercise', 'gym', 'yoga', 'diet'],
  };

  const lowerContent = content.toLowerCase();
  
  for (const [category, words] of Object.entries(keywords)) {
    if (words.some(word => lowerContent.includes(word))) {
      return category;
    }
  }
  
  return 'general';
}

// 生成标签策略
function generateHashtagStrategy(category: string, keywords: string[]): {
  recommended: Array<{ tag: string; views: string; category: string; reason: string }>;
  strategy: string;
} {
  const categoryTags = POPULAR_HASHTAGS[category] || POPULAR_HASHTAGS['general'];
  const generalTags = POPULAR_HASHTAGS['general'];
  
  // 标签策略：2个大标签 + 2个中标签 + 2个小标签 + 1个精准标签
  const largeTags = categoryTags.filter(t => t.category === 'large').slice(0, 2);
  const mediumTags = categoryTags.filter(t => t.category === 'medium').slice(0, 2);
  const smallTags = categoryTags.filter(t => t.category === 'small').slice(0, 2);
  
  // 添加通用大标签
  const fyp = generalTags.find(t => t.tag === 'fyp');
  const viral = generalTags.find(t => t.tag === 'viral');
  
  const recommended: Array<{ tag: string; views: string; category: string; reason: string }> = [];
  
  // 添加通用标签
  if (fyp) recommended.push({ ...fyp, reason: '必选：最大流量池' });
  if (viral) recommended.push({ ...viral, reason: '爆款标签' });
  
  // 添加类目标签
  largeTags.forEach(tag => recommended.push({ ...tag, reason: '类目大词，高曝光' }));
  mediumTags.forEach(tag => recommended.push({ ...tag, reason: '中等竞争，精准流量' }));
  smallTags.forEach(tag => recommended.push({ ...tag, reason: '小众精准，易上榜' }));
  
  // 根据关键词生成精准标签
  if (keywords.length > 0) {
    recommended.push({
      tag: keywords[0].replace(/\s+/g, '').toLowerCase(),
      views: '1B+',
      category: 'niche',
      reason: '精准关键词，高转化',
    });
  }
  
  return {
    recommended: recommended.slice(0, 8),
    strategy: '🔥 黄金组合：2大流量词 + 2中等词 + 2精准词 + 1niche词，平衡曝光与转化',
  };
}

// 分析标题吸引力
function analyzeTitle(title: string): {
  score: number;
  issues: string[];
  suggestions: string[];
  optimizedVersions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 60;
  
  // 检查长度
  if (title.length < 20) {
    issues.push('标题过短，信息量不足');
    suggestions.push('增加更多吸引人的描述');
    score -= 10;
  } else if (title.length > 100) {
    issues.push('标题过长，可能被截断');
    suggestions.push('精简到80字符以内');
    score -= 5;
  } else {
    score += 10;
  }
  
  // 检查是否包含数字
  if (/\d+/.test(title)) {
    score += 10;
    suggestions.push('✓ 包含数字，增加可信度');
  } else {
    suggestions.push('考虑添加数字（如"3个技巧"、"7天见效"）');
  }
  
  // 检查情感词汇
  const emotionalWords = ['惊人', '震惊', '必看', '揭秘', '神奇', 'amazing', 'shocking', 'must', 'secret', 'incredible'];
  if (emotionalWords.some(word => title.toLowerCase().includes(word))) {
    score += 10;
    suggestions.push('✓ 包含吸引眼球的词汇');
  } else {
    suggestions.push('可以添加情感词汇增加吸引力');
  }
  
  // 检查是否有疑问句
  if (title.includes('?') || title.includes('？') || title.includes('如何') || title.includes('怎么') || title.includes('why') || title.includes('how')) {
    score += 10;
    suggestions.push('✓ 疑问句式，引发好奇');
  }
  
  // 生成优化版本
  const optimizedVersions: string[] = [];
  
  // 版本1：添加数字和悬念
  optimizedVersions.push(`🔥 ${title} | 你绝对想不到的效果！`);
  
  // 版本2：疑问句式
  optimizedVersions.push(`为什么大家都在用？${title} 真相揭秘 👇`);
  
  // 版本3：紧迫感
  optimizedVersions.push(`⚠️ 最后机会！${title} | 错过后悔一整年`);
  
  return {
    score: Math.min(100, Math.max(0, score)),
    issues,
    suggestions,
    optimizedVersions,
  };
}

// 生成SEO描述
function generateDescription(sellingPoint: string, keywords: string[], language: string): {
  description: string;
  tips: string[];
} {
  const tips: string[] = [];
  
  let description = '';
  
  if (language === 'zh') {
    description = `${sellingPoint}\n\n`;
    description += `✨ 为什么选择？\n`;
    description += `👉 ${keywords[0] || '高品质'}，值得信赖\n`;
    description += `👉 效果看得见，用户都说好\n\n`;
    description += `💬 评论"想要"获取更多信息\n`;
    description += `❤️ 点赞+收藏，不错过好物\n`;
    description += `🔗 链接在主页，欢迎咨询～\n\n`;
    description += `#好物推荐 #种草 #推荐`;
  } else {
    description = `${sellingPoint}\n\n`;
    description += `✨ Why choose us?\n`;
    description += `👉 ${keywords[0] || 'Premium quality'} you can trust\n`;
    description += `👉 Real results, happy customers\n\n`;
    description += `💬 Comment "INFO" for details\n`;
    description += `❤️ Like + Save for later\n`;
    description += `🔗 Link in bio!\n\n`;
    description += `#recommended #musthave #viral`;
  }
  
  tips.push('✓ 描述包含关键词，利于搜索');
  tips.push('✓ 添加互动引导，提升评论率');
  tips.push('✓ 主页链接引导，促进转化');
  tips.push('建议：前3行放最吸引人的内容');
  tips.push('建议：使用emoji增加视觉吸引力');
  
  return { description, tips };
}

// 预测搜索排名
function predictRanking(seoScore: number, category: string): {
  estimatedViews: string;
  difficulty: string;
  tips: string[];
} {
  let estimatedViews = '';
  let difficulty = '';
  const tips: string[] = [];
  
  if (seoScore >= 80) {
    estimatedViews = '10万 - 100万+';
    difficulty = '较易';
    tips.push('✓ 内容质量优秀，有爆款潜力');
    tips.push('建议：配合热门BGM，进一步提升');
  } else if (seoScore >= 60) {
    estimatedViews = '1万 - 10万';
    difficulty = '中等';
    tips.push('建议：优化标题和标签');
    tips.push('建议：选择热门发布时间');
  } else {
    estimatedViews = '1000 - 1万';
    difficulty = '较难';
    tips.push('建议：重新优化内容');
    tips.push('建议：增加热门元素');
    tips.push('建议：参考同类爆款视频');
  }
  
  // 类目竞争度
  const categoryDifficulty: Record<string, string> = {
    beauty: '竞争激烈',
    tech: '中等竞争',
    fashion: '竞争激烈',
    food: '中等竞争',
    fitness: '中等竞争',
    general: '低竞争',
  };
  
  const catDiff = categoryDifficulty[category] || '未知';
  tips.push(`类目竞争度：${catDiff}`);
  
  return { estimatedViews, difficulty, tips };
}

// 主API处理
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, sellingPoint, language = 'zh' } = body;
    
    if (!prompt && !sellingPoint) {
      return NextResponse.json({
        success: false,
        error: '请提供提示词或产品卖点',
      }, { status: 400 });
    }
    
    const content = prompt || sellingPoint;
    
    // 检测产品类别
    const category = detectCategory(content);
    
    // 提取关键词
    const keywords = sellingPoint ? sellingPoint.split(/[,，、\s]+/).filter((k: string) => k.length > 1) : [];
    
    // 生成标签策略
    const hashtagStrategy = generateHashtagStrategy(category, keywords);
    
    // 分析标题（取提示词的前100字符作为标题参考）
    const titleAnalysis = analyzeTitle(content.slice(0, 100));
    
    // 生成SEO描述
    const descriptionResult = generateDescription(sellingPoint || content, keywords, language);
    
    // 获取最佳发布时间
    const postingTimes = BEST_POSTING_TIMES[language] || BEST_POSTING_TIMES['en'];
    
    // 预测排名
    const ranking = predictRanking(titleAnalysis.score, category);
    
    // 计算综合SEO分数
    const overallScore = Math.round((titleAnalysis.score + 70) / 2);
    
    // 生成优化建议
    const recommendations: string[] = [];
    
    if (titleAnalysis.score < 70) {
      recommendations.push('📌 优化标题，提升吸引力');
    }
    if (keywords.length < 3) {
      recommendations.push('📌 添加更多关键词，提升搜索曝光');
    }
    recommendations.push('📌 使用推荐标签组合');
    recommendations.push(`📌 在${postingTimes.peak[0]}左右发布`);
    recommendations.push('📌 添加热门BGM');
    
    return NextResponse.json({
      success: true,
      data: {
        category,
        overallScore,
        hashtagStrategy,
        titleAnalysis,
        description: descriptionResult.description,
        descriptionTips: descriptionResult.tips,
        postingTimes,
        ranking,
        recommendations,
      },
    });
    
  } catch (error) {
    console.error('SEO analyze error:', error);
    return NextResponse.json({
      success: false,
      error: '分析失败，请稍后重试',
    }, { status: 500 });
  }
}
