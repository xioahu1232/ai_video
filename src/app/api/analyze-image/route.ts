import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getUserClient } from '@/lib/db-pool';

interface AnalyzeRequest {
  imageBase64: string;
  language?: string;
}

interface SellingPoint {
  zh: string;  // 中文版本
  en: string;  // 英文版本（用于后续生成）
}

interface AnalyzeResponse {
  success: boolean;
  suggestions?: SellingPoint[];
  productType?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeResponse>> {
  const requestId = Date.now().toString();
  console.log(`[${requestId}] Analyze image request started`);

  try {
    // 验证用户登录状态（可选，可以根据需求调整）
    const authHeader = request.headers.get('authorization');
    let userId = 'anonymous';
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const supabase = getUserClient(token);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          userId = user.id;
        }
      } catch {
        // 忽略认证错误，允许匿名分析
      }
    }

    const body: AnalyzeRequest = await request.json();
    const { imageBase64, language = 'zh' } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: '请上传图片' },
        { status: 400 }
      );
    }

    // 提取转发头
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 初始化 LLM 客户端
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 构建分析提示词 - 要求同时输出中英文
    const systemPrompt = `你是一位专业的电商文案专家和产品分析师。你的任务是分析产品图片，提取产品卖点。

请仔细观察图片中的产品，从以下维度进行分析：
1. **产品类型**：这是什么类型的产品？
2. **外观设计**：颜色、形状、材质、设计风格等
3. **功能特点**：从外观能推断出什么功能？
4. **目标用户**：这款产品适合什么人群？
5. **使用场景**：在什么场景下使用？
6. **差异化优势**：与同类产品相比有什么独特之处？

**重要**：你的输出必须同时包含中文和英文版本，方便中国用户理解。

请按以下 JSON 格式输出（不要添加任何其他文字）：
[
  {"zh": "中文卖点描述", "en": "English selling point"},
  {"zh": "中文卖点描述", "en": "English selling point"},
  ...
]

要求：
- 提供 3-5 个核心卖点
- 中文卖点：15-30 字，简洁有力的营销语言
- 英文卖点：对应的英文翻译，10-25 words
- 突出产品的独特价值，避免空洞的形容词`;

    const userPrompt = '请分析这张产品图片，提取核心卖点。按 JSON 格式输出，同时包含中文和英文版本。';

    // 构建多模态消息
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: userPrompt },
          {
            type: 'image_url' as const,
            image_url: {
              url: imageBase64,
              detail: 'high' as const, // 高细节模式，更准确的分析
            },
          },
        ],
      },
    ];

    console.log(`[${requestId}] Calling vision model for analysis...`);

    // 调用视觉模型
    const response = await client.invoke(messages, {
      model: 'doubao-seed-1-6-vision-250815', // 视觉模型
      temperature: 0.7,
    });

    console.log(`[${requestId}] Vision model response received`);

    // 解析结果
    const content = response.content.trim();
    console.log(`[${requestId}] Raw response:`, content);
    
    // 尝试解析 JSON
    let suggestions: SellingPoint[] = [];
    
    try {
      // 尝试提取 JSON 数组
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.log(`[${requestId}] JSON parse failed, trying alternative parsing`);
      
      // 如果 JSON 解析失败，尝试从文本中提取
      const lines = content.split('\n').filter(line => line.trim());
      for (const line of lines) {
        // 尝试匹配中英文格式
        const match = line.match(/["']zh["']\s*:\s*["']([^"']+)["'].*["']en["']\s*:\s*["']([^"']+)["']/);
        if (match) {
          suggestions.push({ zh: match[1], en: match[2] });
        }
      }
    }

    // 如果仍然没有提取到，创建默认格式
    if (suggestions.length === 0) {
      // 将原始内容作为中文，生成简单英文
      const lines = content.split('\n').filter(line => line.trim() && line.length > 5);
      suggestions = lines.slice(0, 5).map(line => ({
        zh: line.replace(/^[\d\-\•\*\•]+\s*/, '').trim(),
        en: line.replace(/^[\d\-\•\*\•]+\s*/, '').trim() // 如果没有英文，暂时用中文
      }));
    }

    // 尝试识别产品类型
    const productType = extractProductType(content);

    console.log(`[${requestId}] Analysis complete: ${suggestions.length} suggestions`);

    return NextResponse.json({
      success: true,
      suggestions: suggestions.slice(0, 5), // 最多返回5个
      productType,
    });

  } catch (error) {
    console.error(`[${requestId}] Analyze error:`, error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : '图片分析失败，请稍后重试';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * 从分析结果中提取产品类型
 */
function extractProductType(content: string): string {
  const keywords = [
    { zh: '手机', en: 'phone' },
    { zh: '耳机', en: 'earphone' },
    { zh: '手表', en: 'watch' },
    { zh: '包', en: 'bag' },
    { zh: '鞋', en: 'shoes' },
    { zh: '服装', en: 'clothing' },
    { zh: '化妆品', en: 'cosmetics' },
    { zh: '食品', en: 'food' },
    { zh: '饮料', en: 'drink' },
    { zh: '电子产品', en: 'electronics' },
    { zh: '家居', en: 'home' },
    { zh: '玩具', en: 'toy' },
    { zh: '书籍', en: 'book' },
    { zh: '运动', en: 'sports' },
    { zh: '首饰', en: 'jewelry' },
    { zh: '眼镜', en: 'glasses' },
    { zh: '灯具', en: 'lamp' },
    { zh: '家具', en: 'furniture' },
  ];
  
  const lowerContent = content.toLowerCase();
  
  for (const keyword of keywords) {
    if (lowerContent.includes(keyword.zh) || lowerContent.includes(keyword.en)) {
      return keyword.zh;
    }
  }
  
  return '产品';
}
