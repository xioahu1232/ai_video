import { NextRequest, NextResponse } from 'next/server';
import { SearchClient, Config, LLMClient, HeaderUtils } from 'coze-coding-dev-sdk';

interface SEOAnalysisRequest {
  prompt: string;
  sellingPoint: string;
  language: string;
  imageUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SEOAnalysisRequest = await request.json();
    const { prompt, sellingPoint, language = 'zh' } = body;
    
    if (!prompt && !sellingPoint) {
      return NextResponse.json({
        success: false,
        error: '请提供提示词或产品卖点',
      }, { status: 400 });
    }
    
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const searchClient = new SearchClient(config, customHeaders);
    const llmClient = new LLMClient(config, customHeaders);
    
    const content = prompt || sellingPoint;
    
    // 1. 搜索TikTok相关热门内容
    const mainKeyword = sellingPoint.split(/[,，、]/)[0] || content.slice(0, 20);
    
    const searchResults = await Promise.all([
      searchClient.webSearch(`TikTok ${mainKeyword} trending hashtags viral`, 8, true),
      searchClient.webSearch(`TikTok ${mainKeyword} marketing successful case`, 5, true),
    ]);
    
    const searchSummaries = searchResults.map(r => r.summary).filter(Boolean).join('\n\n');
    const searchItems = searchResults.flatMap(r => r.web_items || []);
    
    // 2. 使用LLM进行深度分析
    const systemPrompt = `你是一位资深的TikTok SEO专家，专门服务中国跨境卖家。

你的任务是分析用户的产品提示词，提供专业的SEO优化建议。

【重要】输出规则：
1. 所有分析和建议必须用中文
2. 标签可以是英文（因为TikTok标签本就是英文），但标签的推荐理由必须用中文
3. 不要输出contentStrategy字段
4. 给出具体可执行的建议，避免空泛套话

你需要输出严格的JSON格式（不要包含contentStrategy）：
{
  "overallScore": 0-100的分数,
  "category": "产品类别（中文）",
  "analysis": {
    "titleScore": 0-100,
    "titleIssues": ["问题1", "问题2"],
    "titleOptimizations": ["优化标题1", "优化标题2", "优化标题3"]
  },
  "hashtags": {
    "recommended": [
      {"tag": "英文标签", "reason": "中文推荐理由", "expectedReach": "预计触达人数"}
    ],
    "strategy": "中文标签策略说明"
  },
  "description": {
    "optimized": "中文优化描述",
    "tips": ["中文技巧1", "中文技巧2"]
  },
  "postingTime": {
    "best": ["时间1", "时间2"],
    "timezone": "时区",
    "reason": "中文推荐理由"
  },
  "competitionAnalysis": {
    "level": "高/中/低",
    "opportunities": ["中文机会1", "中文机会2"],
    "warnings": ["中文注意事项1"]
  },
  "actionItems": ["中文行动项1", "中文行动项2", "中文行动项3"]
}

记住：主体内容必须中文，标签可以是英文但理由要中文！`;

    const userPrompt = `请分析以下TikTok视频内容，提供SEO优化建议：

【产品提示词】
${content}

【核心卖点】
${sellingPoint}

【搜索到的相关数据】
${searchSummaries || '暂无相关数据'}

请基于以上信息，用中文提供详细的SEO优化分析报告。`;

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
        // 删除contentStrategy字段（如果存在）
        if (analysisData.contentStrategy) {
          delete analysisData.contentStrategy;
        }
      } else {
        throw new Error('无法解析JSON');
      }
    } catch (parseError) {
      // 解析失败时返回原始内容
      analysisData = {
        overallScore: 70,
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
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
