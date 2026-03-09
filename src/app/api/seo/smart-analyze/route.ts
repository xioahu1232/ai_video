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
  // 日文的特点是同时使用汉字和假名，假名是日文的特征
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
    const targetTimezone = targetInfo.timezone;
    
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const searchClient = new SearchClient(config, customHeaders);
    const llmClient = new LLMClient(config, customHeaders);
    
    // 1. 搜索相关热门内容
    const mainKeyword = sellingPoint.split(/[,，、]/)[0] || content.slice(0, 20);
    
    const searchResults = await Promise.all([
      searchClient.webSearch(`TikTok ${mainKeyword} trending hashtags ${targetMarket}`, 8, true),
      searchClient.webSearch(`TikTok ${targetMarket} marketing strategy viral`, 5, true),
    ]);
    
    const searchSummaries = searchResults.map(r => r.summary).filter(Boolean).join('\n\n');
    
    // 2. 根据目标语言构建不同的prompt
    const langInstructions: Record<string, string> = {
      ko: `
【重要】输出语言规则 - 目标市场：韩国：
1. 所有分析、建议、理由必须用韩文
2. 标签用韩文或英文（韩国用户常用英文标签如#skincare）
3. 标题优化版本用韩文
4. 描述用韩文
5. 发布时间按韩国时间推荐`,
      
      ja: `
【重要】输出语言规则 - 目标市场：日本：
1. 所有分析、建议、理由必须用日文
2. 标签用日文或英文（日本用户常用英文标签）
3. 标题优化版本用日文
4. 描述用日文
5. 发布时间按日本时间推荐`,
      
      zh: `
【重要】输出语言规则 - 目标市场：华人：
1. 所有分析、建议、理由必须用中文
2. 标签用英文（TikTok标签本就是英文）
3. 标题优化版本用中文
4. 描述用中文
5. 发布时间按北京时间推荐`,
      
      ar: `
【重要】输出语言规则 - 目标市场：中东：
1. 所有分析、建议、理由必须用阿拉伯语
2. 标签用阿拉伯语或英文
3. 标题优化版本用阿拉伯语
4. 描述用阿拉伯语
5. 发布时间按中东时间推荐`,
      
      es: `
【重要】输出语言规则 - 目标市场：西班牙/拉美：
1. 所有分析、建议、理由必须用西班牙语
2. 标签用西班牙语或英文
3. 标题优化版本用西班牙语
4. 描述用西班牙语
5. 发布时间按马德里时间推荐`,
      
      en: `
【重要】输出语言规则 - 目标市场：欧美：
1. 所有分析、建议、理由必须用英文
2. 标签用英文
3. 标题优化版本用英文
4. 描述用英文
5. 发布时间按美东时间推荐`,
    };
    
    const systemPrompt = `你是一位资深的TikTok SEO专家，专门服务跨境卖家。

你的任务是分析用户的产品提示词，提供专业的SEO优化建议。

${langInstructions[targetLang] || langInstructions.en}

你需要输出严格的JSON格式：
{
  "overallScore": 0-100的分数,
  "targetMarket": "目标市场名称",
  "category": "产品类别",
  "analysis": {
    "titleScore": 0-100,
    "titleIssues": ["问题1", "问题2"],
    "titleOptimizations": ["优化标题1", "优化标题2", "优化标题3"]
  },
  "hashtags": {
    "recommended": [
      {"tag": "标签名", "reason": "推荐理由", "expectedReach": "预计触达人数"}
    ],
    "strategy": "标签策略说明"
  },
  "description": {
    "optimized": "优化后的描述",
    "tips": ["技巧1", "技巧2"]
  },
  "postingTime": {
    "best": ["时间1", "时间2"],
    "timezone": "时区说明",
    "reason": "推荐理由"
  },
  "competitionAnalysis": {
    "level": "高/中/低",
    "opportunities": ["机会1", "机会2"],
    "warnings": ["注意事项1"]
  },
  "actionItems": ["行动项1", "行动项2", "行动项3"]
}

记住：必须用目标市场的语言输出！`;

    const userPrompt = `请分析以下TikTok视频内容，提供SEO优化建议：

【产品提示词】
${content}

【核心卖点】
${sellingPoint}

【检测到的目标市场】
${targetMarket}

【搜索到的相关数据】
${searchSummaries || '暂无相关数据'}

请基于以上信息，用${targetMarket}的语言提供详细的SEO优化分析报告。`;

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
        // 确保包含目标市场信息
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
