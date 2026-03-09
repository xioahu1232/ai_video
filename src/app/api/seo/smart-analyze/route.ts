import { NextRequest, NextResponse } from 'next/server';
import { SearchClient, Config, LLMClient, HeaderUtils } from 'coze-coding-dev-sdk';

interface SEOAnalysisRequest {
  prompt: string;
  sellingPoint: string;
  language: string;
}

// 检测文本的主要语言
function detectTargetLanguage(text: string): { lang: string; market: string; timezone: string } {
  // 韩文检测（韩文字符是独特的）
  if (/[가-힣]/.test(text)) {
    return { lang: 'ko', market: '韩国市场', timezone: '韩国时间 (UTC+9)' };
  }
  
  // 日文检测（必须包含假名 - 平假名或片假名）
  if (/[あ-んア-ン]/.test(text)) {
    return { lang: 'ja', market: '日本市场', timezone: '日本时间 (UTC+9)' };
  }
  
  // 中文检测（有汉字但没有假名）
  if (/[\u4e00-\u9fff]/.test(text)) {
    return { lang: 'zh', market: '华人市场', timezone: '北京时间 (UTC+8)' };
  }
  
  // 阿拉伯语检测
  if (/[\u0600-\u06ff]/.test(text)) {
    return { lang: 'ar', market: '中东市场', timezone: '中东时间 (UTC+3)' };
  }
  
  // 西班牙语特殊字符检测
  if (/[áéíóúüñ¿¡]/i.test(text)) {
    return { lang: 'es', market: '西班牙/拉美市场', timezone: '马德里时间 (UTC+1)' };
  }
  
  // 默认英语
  return { lang: 'en', market: '欧美市场', timezone: '美东时间 (UTC-5)' };
}

export async function POST(request: NextRequest) {
  try {
    const body: SEOAnalysisRequest = await request.json();
    const { prompt, sellingPoint, language } = body;
    
    if (!prompt && !sellingPoint) {
      return NextResponse.json({
        success: false,
        error: '请提供提示词或产品卖点',
      }, { status: 400 });
    }
    
    const content = prompt || sellingPoint;
    
    // 智能检测目标语言和市场
    const targetInfo = detectTargetLanguage(content);
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
    });
    
  } catch (error) {
    console.error('SEO analysis error:', error);
    return NextResponse.json({
      success: false,
      error: 'SEO分析失败，请稍后重试',
    }, { status: 500 });
  }
}
