import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getUserClient } from '@/lib/db-pool';

interface AnalyzeRequest {
  imageBase64: string;
  language?: string;
}

interface AnalyzeResponse {
  success: boolean;
  suggestions?: string[];
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

    // 构建分析提示词
    const systemPrompt = language === 'zh' 
      ? `你是一位专业的电商文案专家和产品分析师。你的任务是分析产品图片，提取产品卖点。

请仔细观察图片中的产品，从以下维度进行分析：
1. **产品类型**：这是什么类型的产品？
2. **外观设计**：颜色、形状、材质、设计风格等
3. **功能特点**：从外观能推断出什么功能？
4. **目标用户**：这款产品适合什么人群？
5. **使用场景**：在什么场景下使用？
6. **差异化优势**：与同类产品相比有什么独特之处？

请用简洁有力的营销语言，提炼出 3-5 个核心卖点，每个卖点控制在 15-30 字。
卖点要突出产品的独特价值，避免空洞的形容词。`
      : `You are a professional e-commerce copywriting expert. Analyze the product image and extract key selling points.

Please analyze from these dimensions:
1. **Product Type**: What type of product is this?
2. **Design**: Color, shape, material, design style
3. **Features**: What features can be inferred?
4. **Target Users**: Who is this product for?
5. **Use Cases**: Where/when would this be used?
6. **Unique Advantages**: What makes it stand out?

Provide 3-5 concise selling points, each 10-25 words.
Focus on unique value, avoid empty adjectives.`;

    const userPrompt = language === 'zh'
      ? '请分析这张产品图片，提取核心卖点。直接输出卖点列表，每个卖点一行，不需要序号或其他格式。'
      : 'Analyze this product image and extract key selling points. Output one selling point per line, no numbering needed.';

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
    
    // 将内容分割成行，过滤空行
    const suggestions = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('【') && !line.startsWith('**'))
      .map(line => {
        // 移除可能的序号前缀（如 "1. ", "- ", "• " 等）
        return line.replace(/^[\d\-\•\*\•]+\s*/, '').trim();
      })
      .filter(line => line.length >= 5 && line.length <= 100); // 过滤过长或过短的行

    // 如果没有提取到有效的卖点，使用原始内容
    const finalSuggestions = suggestions.length > 0 
      ? suggestions.slice(0, 5) // 最多返回5个
      : [content.substring(0, 100)];

    // 尝试识别产品类型（从第一个建议中提取关键词）
    const productType = extractProductType(content, language);

    console.log(`[${requestId}] Analysis complete: ${finalSuggestions.length} suggestions, product type: ${productType}`);

    return NextResponse.json({
      success: true,
      suggestions: finalSuggestions,
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
function extractProductType(content: string, language: string): string {
  const keywords = language === 'zh'
    ? ['手机', '耳机', '手表', '包', '鞋', '服装', '化妆品', '食品', '饮料', '电子产品', '家居', '玩具', '书籍', '运动']
    : ['phone', 'earphone', 'watch', 'bag', 'shoes', 'clothing', 'cosmetics', 'food', 'drink', 'electronics', 'home', 'toy', 'book', 'sports'];
  
  const lowerContent = content.toLowerCase();
  
  for (const keyword of keywords) {
    if (lowerContent.includes(keyword.toLowerCase())) {
      return keyword;
    }
  }
  
  return language === 'zh' ? '产品' : 'Product';
}
