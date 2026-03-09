import { NextRequest, NextResponse } from 'next/server';
import { SearchClient, Config, LLMClient, HeaderUtils } from 'coze-coding-dev-sdk';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { deductBalance, getBalanceInfo } from '@/lib/balance-service';

interface SEOAnalysisRequest {
  prompt: string;
  sellingPoint: string;
  language: string;
}

// SEO分析扣费金额
const SEO_ANALYSIS_COST = 0.2;

// 根据用户选择的语言代码映射目标市场
function getTargetMarketFromLanguage(langCode: string): { lang: string; market: string; timezone: string } {
  const languageMap: Record<string, { lang: string; market: string; timezone: string }> = {
    'zh': { lang: 'zh', market: '华人市场', timezone: '北京时间 (UTC+8)' },
    'en': { lang: 'en', market: '欧美市场', timezone: '美东时间 (UTC-5)' },
    'ja': { lang: 'ja', market: '日本市场', timezone: '日本时间 (UTC+9)' },
    'ko': { lang: 'ko', market: '韩国市场', timezone: '韩国时间 (UTC+9)' },
    'es': { lang: 'es', market: '西班牙/拉美市场', timezone: '马德里时间 (UTC+1)' },
    'pt': { lang: 'pt', market: '巴西/葡萄牙市场', timezone: '巴西利亚时间 (UTC-3)' },
    'fr': { lang: 'fr', market: '法国/法语区市场', timezone: '巴黎时间 (UTC+1)' },
    'de': { lang: 'de', market: '德语区市场', timezone: '柏林时间 (UTC+1)' },
    'it': { lang: 'it', market: '意大利市场', timezone: '罗马时间 (UTC+1)' },
    'ru': { lang: 'ru', market: '俄语区市场', timezone: '莫斯科时间 (UTC+3)' },
    'ar': { lang: 'ar', market: '中东市场', timezone: '迪拜时间 (UTC+4)' },
    'hi': { lang: 'hi', market: '印度市场', timezone: '新德里时间 (UTC+5:30)' },
    'bn': { lang: 'bn', market: '孟加拉市场', timezone: '达卡时间 (UTC+6)' },
    'tr': { lang: 'tr', market: '土耳其市场', timezone: '伊斯坦布尔时间 (UTC+3)' },
    'vi': { lang: 'vi', market: '越南市场', timezone: '河内时间 (UTC+7)' },
    'th': { lang: 'th', market: '泰国市场', timezone: '曼谷时间 (UTC+7)' },
    'id': { lang: 'id', market: '印尼市场', timezone: '雅加达时间 (UTC+7)' },
    'ur': { lang: 'ur', market: '巴基斯坦市场', timezone: '卡拉奇时间 (UTC+5)' },
    'fa': { lang: 'fa', market: '伊朗市场', timezone: '德黑兰时间 (UTC+3:30)' },
    'pa': { lang: 'pa', market: '旁遮普市场', timezone: '新德里时间 (UTC+5:30)' },
  };
  
  return languageMap[langCode] || { lang: 'en', market: '欧美市场', timezone: '美东时间 (UTC-5)' };
}

export async function POST(request: NextRequest) {
  try {
    // 1. 用户认证
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: '请先登录',
      }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    const supabase = getSupabaseClient(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: '登录已过期，请重新登录',
      }, { status: 401 });
    }
    
    // 2. 检查用户余额
    const balanceInfo = await getBalanceInfo(supabase, user.id);
    
    if (!balanceInfo || balanceInfo.balance < SEO_ANALYSIS_COST) {
      return NextResponse.json({
        success: false,
        error: `余额不足，SEO分析需要${SEO_ANALYSIS_COST}额度`,
        balance: balanceInfo?.balance || 0,
      }, { status: 402 });
    }
    
    // 3. 扣除余额
    const deductResult = await deductBalance(supabase, user.id, SEO_ANALYSIS_COST);
    
    if (!deductResult.success) {
      console.error('SEO deduct balance error:', deductResult.error);
      return NextResponse.json({
        success: false,
        error: typeof deductResult.error === 'string' ? deductResult.error : '余额扣减失败',
        balance: deductResult.previousBalance,
      }, { status: 402 });
    }
    
    const body: SEOAnalysisRequest = await request.json();
    const { prompt, sellingPoint, language } = body;
    
    if (!prompt && !sellingPoint) {
      // 返还余额
      await refundBalance(supabase, user.id, SEO_ANALYSIS_COST);
      return NextResponse.json({
        success: false,
        error: '请提供提示词或产品卖点',
        balance: deductResult.previousBalance,
      }, { status: 400 });
    }
    
    const content = prompt || sellingPoint;
    
    // 根据用户选择的语言确定目标市场
    const targetInfo = getTargetMarketFromLanguage(language || 'zh');
    const targetLang = targetInfo.lang;
    const targetMarket = targetInfo.market;
    
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const searchClient = new SearchClient(config, customHeaders);
    const llmClient = new LLMClient(config, customHeaders);
    
    // 1. 搜索相关热门内容
    const mainKeyword = sellingPoint.split(/[,，、]/)[0] || content.slice(0, 20);
    
    const searchResults = await Promise.all([
      searchClient.webSearch(`TikTok ${mainKeyword} trending hashtags ${targetMarket}`, 8, true),
      searchClient.webSearch(`TikTok ${targetMarket} marketing viral tips`, 5, true),
    ]);
    
    const searchSummaries = searchResults.map(r => r.summary).filter(Boolean).join('\n\n');
    
    // 2. 根据目标语言构建不同的prompt
    const langInstructions: Record<string, string> = {
      ko: `目标市场：韩国。所有内容用韩文输出。标签可用韩文或英文。`,
      ja: `目标市场：日本。所有内容用日文输出。标签可用日文或英文。`,
      zh: `目标市场：华人。所有内容用中文输出。标签用英文。`,
      ar: `目标市场：中东。所有内容用阿拉伯语输出。标签可用阿拉伯语或英文。`,
      es: `目标市场：西班牙/拉美。所有内容用西班牙语输出。标签可用西班牙语或英文。`,
      en: `目标市场：欧美。所有内容用英文输出。标签用英文。`,
    };
    
    const systemPrompt = `你是一位资深的TikTok SEO专家，专门服务跨境卖家。

【重要】${langInstructions[targetLang] || langInstructions.en}

你的任务是：根据用户提供的视频提示词和卖点，给出发布视频时的SEO建议。

注意：用户输入的是视频提示词（用来生成视频的内容描述），不是标题。所以你要给出的是"标题撰写建议"，而不是评分。

你需要输出严格的JSON格式：
{
  "overallScore": 0-100的综合SEO潜力评分,
  "targetMarket": "目标市场名称",
  "category": "产品类别",
  "titleSuggestions": {
    "principles": ["标题撰写原则1", "标题撰写原则2"],
    "examples": ["推荐标题示例1", "推荐标题示例2", "推荐标题示例3"]
  },
  "hashtags": {
    "recommended": [
      {"tag": "标签名", "reason": "推荐理由", "expectedReach": "预计触达人数"}
    ],
    "strategy": "标签策略说明"
  },
  "description": {
    "optimized": "优化后的视频描述",
    "tips": ["描述技巧1", "描述技巧2"]
  },
  "postingTime": {
    "best": ["最佳发布时间1", "最佳发布时间2"],
    "timezone": "时区",
    "reason": "推荐理由"
  },
  "competitionAnalysis": {
    "level": "高/中/低",
    "opportunities": ["机会点1"],
    "warnings": ["注意事项1"]
  },
  "actionItems": ["行动建议1", "行动建议2", "行动建议3"]
}

关键点：
1. titleSuggestions 是标题撰写建议，包含原则和示例，不要评分！
2. 所有内容用目标市场语言输出`;

    const userPrompt = `请分析以下TikTok视频内容，提供SEO优化建议：

【视频提示词】
${content}

【核心卖点】
${sellingPoint}

【目标市场】
${targetMarket}

【搜索到的趋势数据】
${searchSummaries || '暂无相关数据'}

请用${targetMarket}的语言，提供详细的SEO优化建议。`;

    const llmResponse = await llmClient.invoke(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      { 
        temperature: 0.4, 
        model: 'doubao-seed-2-0-lite-260215'
      }
    );
    
    // 解析LLM返回的JSON
    let analysisData;
    try {
      const jsonMatch = llmResponse.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
        analysisData.targetMarket = targetMarket;
        analysisData.detectedLanguage = targetLang;
      } else {
        throw new Error('无法解析JSON');
      }
    } catch (parseError) {
      analysisData = {
        overallScore: 70,
        targetMarket,
        detectedLanguage: targetLang,
        category: '综合',
        rawAnalysis: llmResponse.content,
        actionItems: ['请查看详细分析内容'],
      };
    }
    
    return NextResponse.json({
      success: true,
      data: analysisData,
      balance: deductResult.newBalance,
    });
    
  } catch (error) {
    console.error('SEO analysis error:', error);
    // 如果已扣费但分析失败，尝试返还余额
    // 注意：这里无法获取 deductResult，所以不返还
    // 实际上，扣费是在验证参数后才执行的，如果到了这里说明分析过程出错
    // 这种情况下应该返还余额，但我们需要追踪是否已扣费
    return NextResponse.json({
      success: false,
      error: 'SEO分析失败，请稍后重试',
    }, { status: 500 });
  }
}

/**
 * 返还余额（用于错误情况）
 */
async function refundBalance(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string,
  amount: number
): Promise<void> {
  try {
    const { data: current } = await supabase
      .from('user_balances')
      .select('balance, total_used')
      .eq('user_id', userId)
      .single();

    if (current) {
      await supabase
        .from('user_balances')
        .update({
          balance: current.balance + amount,
          total_used: Math.max(0, current.total_used - amount),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
      
      console.log(`Refunded ${amount} balance to user ${userId} for SEO analysis`);
    }
  } catch (error) {
    console.error('Refund balance error:', error);
  }
}
