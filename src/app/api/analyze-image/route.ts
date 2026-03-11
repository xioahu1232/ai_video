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
    const systemPrompt = `你是一位顶级电商营销策划专家，擅长从普通产品中发现"新、奇、特"的创意卖点，让产品脱颖而出，激发消费者的购买欲望。

【核心原则】
❌ 拒绝千篇一律：不说"质量好"、"性价比高"、"做工精细"这种废话
✅ 聚焦差异化：找出这个产品与众不同的地方
✅ 制造好奇心：让消费者产生"原来还有这种设计"的惊喜感
✅ 场景化痛点：从用户使用场景出发，直击痛点

【卖点挖掘维度】
1. **反常识设计**：有什么打破常规的设计？比如"第一次见到XX还能这样设计"
2. **隐藏功能**：有哪些用户不容易发现但超实用的功能？
3. **场景痛点**：解决了什么让用户头疼的问题？
4. **情感共鸣**：能触发什么情感？怀旧、成就感、社交炫耀？
5. **时效热点**：与当下流行趋势、节日、热点有什么关联？
6. **对比优势**：与传统同类产品相比，有什么颠覆性改进？

【卖点写作技巧】
- 用数字说话："30秒速热"、"省电80%"
- 用对比制造冲击："比传统XX轻了一半"
- 用场景引发共鸣："出差党福音，行李箱再也不塞不下"
- 用反差制造记忆点："这么小的XX，竟然能..."
- 用痛点直击人心："终于不用再担心XX了"

**重要**：请严格按照以下格式输出，不要添加任何其他内容：

这是一个[产品名称/类型]，具有以下独特卖点：
1. [创意卖点一 - 聚焦新奇特，15-30字]
2. [创意卖点二 - 直击痛点或制造惊喜，15-30字]
3. [创意卖点三 - 场景化或情感化表达，15-30字]
4. [创意卖点四 - 对比优势或隐藏功能，15-30字]
5. [创意卖点五 - 行动号召或紧迫感，15-30字]

【示例参考】
❌ 差劲卖点：
- 品质优良，做工精细
- 性价比高，价格实惠
- 外观时尚，颜色好看

✅ 优秀卖点：
- 第一次见到能折叠的吹风机，出差行李省一半空间
- 冷风模式30秒速干，夏天吹头发再也不满头汗
- 负离子护发， salon级吹风效果在家就能实现
- 智能温控不伤发，染烫后也能放心用
- 限时首发价，比旗舰店便宜200，手慢无

请记住：你的目标是让消费者看到卖点后产生"这产品太适合我了/太想要了"的感觉！`;

    const userPrompt = '请分析这张产品图片，用"新、奇、特"的视角挖掘创意卖点，按指定格式输出（产品是什么 + 5个编号卖点）。记住：拒绝千篇一律，要让人眼前一亮！';

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
