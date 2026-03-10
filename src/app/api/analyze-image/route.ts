import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getUserClient } from '@/lib/db-pool';

interface AnalyzeRequest {
  imageBase64: string;
}

interface AnalyzeResponse {
  success: boolean;
  result?: string;  // 完整的卖点文本
  productType?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeResponse>> {
  const requestId = Date.now().toString();
  console.log(`[${requestId}] Analyze image request started`);

  try {
    // 验证用户登录状态（可选）
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
    const { imageBase64 } = body;

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

    // 构建分析提示词 - 要求特定格式
    const systemPrompt = `你是一位专业的电商文案专家和产品分析师。你的任务是分析产品图片，提取产品卖点。

请仔细观察图片中的产品，从以下维度进行分析：
1. **产品类型**：这是什么类型的产品？
2. **外观设计**：颜色、形状、材质、设计风格等
3. **功能特点**：从外观能推断出什么功能？
4. **目标用户**：这款产品适合什么人群？
5. **使用场景**：在什么场景下使用？
6. **差异化优势**：与同类产品相比有什么独特之处？

**重要**：请严格按照以下格式输出，不要添加任何其他内容（如前言、解释、总结等）：

这是一个[产品名称/类型]，具有以下独特卖点：
1. [卖点一]
2. [卖点二]
3. [卖点三]
4. [卖点四]
5. [卖点五]

输出要求：
- 第一行必须以"这是一个"开头，清晰描述产品是什么
- 必须列出5个卖点，用数字1-5编号
- 每个卖点15-30字，简洁有力的营销语言
- 卖点要突出产品的独特价值，避免空洞的形容词
- 直接输出上述格式的内容，不要有任何其他文字`;

    const userPrompt = '请分析这张产品图片，按指定格式输出核心卖点（产品是什么 + 5个编号卖点）。';

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
              detail: 'high' as const,
            },
          },
        ],
      },
    ];

    console.log(`[${requestId}] Calling vision model for analysis...`);

    // 调用视觉模型
    const response = await client.invoke(messages, {
      model: 'doubao-seed-1-6-vision-250815',
      temperature: 0.7,
    });

    console.log(`[${requestId}] Vision model response received`);

    // 获取结果
    const result = response.content.trim();
    console.log(`[${requestId}] Analysis result:\n${result}`);

    // 验证格式是否正确
    if (!result.includes('这是一个') || !result.includes('独特卖点')) {
      console.log(`[${requestId}] Format warning: result may not match expected format`);
    }

    // 尝试识别产品类型
    const productType = extractProductType(result);

    console.log(`[${requestId}] Analysis complete, product type: ${productType}`);

    return NextResponse.json({
      success: true,
      result,
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
  // 尝试从"这是一个XXX"中提取
  const match = content.match(/这是一个([^，,。\n]+)/);
  if (match) {
    return match[1].trim();
  }
  
  // 关键词匹配
  const keywords = [
    '手机', '耳机', '手表', '包', '鞋', '服装', '化妆品', 
    '食品', '饮料', '电子产品', '家居', '玩具', '书籍', 
    '运动', '首饰', '眼镜', '灯具', '家具', '家电'
  ];
  
  for (const keyword of keywords) {
    if (content.includes(keyword)) {
      return keyword;
    }
  }
  
  return '产品';
}
