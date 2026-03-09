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
    const { prompt, sellingPoint, language = 'zh', imageUrl } = body;
    
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
    const today = new Date().toISOString().split('T')[0];
    
    // 1. 搜索TikTok相关热门内容和趋势
    const searchQueries = [
      `TikTok viral video ${sellingPoint.split(',')[0]} trending hashtags`,
      `TikTok successful ${sellingPoint.split(',')[0]} marketing strategy 2024`,
      `TikTok SEO best practices ${language === 'zh' ? '中文' : 'English'} 2024`,
    ];
    
    const searchResults = await Promise.all(
      searchQueries.map(query => 
        searchClient.advancedSearch(query, {
          count: 5,
          timeRange: '1m',
          needSummary: true,
        })
      )
    );
    
    const searchSummaries = searchResults.map(r => r.summary).filter(Boolean).join('\n\n');
    const searchItems = searchResults.flatMap(r => r.web_items || []);
    
    // 2. 搜索热门标签
    const hashtagSearch = await searchClient.webSearch(
      `TikTok trending hashtags ${today} viral`,
      10,
      true
    );
    
    // 3. 使用LLM进行深度分析
    const systemPrompt = `你是一位资深的TikTok SEO专家，拥有丰富的短视频营销经验。

你的任务是分析用户的产品提示词，结合最新的TikTok趋势数据，提供专业的SEO优化建议。

你需要输出严格的JSON格式：
{
  "overallScore": 0-100的分数,
  "category": "产品类别",
  "analysis": {
    "titleScore": 0-100,
    "titleIssues": ["问题1", "问题2"],
    "titleOptimizations": ["优化版本1", "优化版本2", "优化版本3"]
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
    "timezone": "时区",
    "reason": "推荐理由"
  },
  "contentStrategy": {
    "hook": "开场钩子建议",
    "storytelling": "叙事结构建议",
    "cta": "行动号召建议"
  },
  "competitionAnalysis": {
    "level": "竞争激烈程度",
    "opportunities": ["机会1", "机会2"],
    "warnings": ["注意事项1", "注意事项2"]
  },
  "actionItems": ["行动项1", "行动项2", "行动项3", "行动项4", "行动项5"]
}

重要原则：
1. 基于真实搜索数据进行分析，不要编造
2. 给出具体可执行的建议，避免空泛的套话
3. 考虑TikTok算法机制和用户行为
4. 用${language === 'zh' ? '中文' : 'English'}回复`;

    const userPrompt = `请分析以下TikTok视频内容，提供专业的SEO优化建议：

【产品提示词】
${content}

【核心卖点】
${sellingPoint}

【目标语言】
${language === 'zh' ? '中文' : 'English'}

【今日TikTok趋势数据】
${searchSummaries}

【热门标签搜索结果】
${hashtagSearch.summary || '暂无数据'}

【相关成功案例】
${searchItems.slice(0, 5).map(item => `
- ${item.title}
  ${item.snippet}
`).join('\n')}

请基于以上数据，提供详细的SEO优化分析报告。`;

    const llmResponse = await llmClient.invoke(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      { 
        temperature: 0.4, 
        model: 'doubao-seed-2-0-lite-260215'  // 使用更强大的模型
      }
    );
    
    // 解析LLM返回的JSON
    let analysisData;
    try {
      const jsonMatch = llmResponse.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
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
      meta: {
        analyzedAt: new Date().toISOString(),
        searchResultsCount: searchItems.length,
        model: 'doubao-seed-2-0-lite-260215',
      },
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
