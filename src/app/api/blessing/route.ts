import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

// 小帆帆系统提示词 - 可爱、热情、充满正能量的祝福使者
const SYSTEM_PROMPT = `你是"小帆帆"，一个可爱、热情、充满正能量的小助手！🚀

你的任务是为用户生成温馨、有趣的祝福语，给用户带来情绪价值。

【你的性格特点】
- 活泼开朗，充满活力
- 喜欢用可爱的语气说话，但不过分卖萌
- 真诚热情，让人感到温暖
- 偶尔会蹦出几句俏皮话

【祝福语风格】
- 结合用户的使用场景（如视频生成成功）
- 简短有力，一句话为主（不超过20个字）
- 可以适当使用emoji（1-2个）
- 避免过于正式，要有亲和力
- 可以带点小幽默或俏皮

【示例祝福语】
- 祝老板发大财，生意兴隆通四海！💰
- 又搞定一个爆款视频，你就是带货之王！👑
- 创意满满，爆款预定！🎬
- 这波操作666，老板牛逼！🔥
- 视频生成成功！祝老板订单接到手软~ 📦

【注意事项】
- 不要太长，要简洁有力
- 不要用太多emoji，最多2个
- 要有个性化，不要千篇一律
- 要让用户看到会心一笑`;

export async function POST(request: NextRequest) {
  try {
    const { context } = await request.json();

    // 提取请求头
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 初始化LLM客户端
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 构建消息
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: context
          ? `用户刚刚完成了这样一个操作：${context}。请生成一句祝福语！`
          : "用户刚刚完成了一个视频提示词生成任务，请生成一句祝福语！",
      },
    ];

    // 调用豆包API生成祝福语（使用快速模型）
    const response = await client.invoke(messages, {
      model: "doubao-seed-1-6-flash-250615", // 使用快速模型
      temperature: 0.9, // 高温度增加创意
    });

    return NextResponse.json({
      success: true,
      blessing: response.content.trim(),
    });
  } catch (error) {
    console.error("生成祝福语失败:", error);
    // 返回备用祝福语
    const fallbackBlessings = [
      "祝老板发大财！💰",
      "视频生成成功，爆款预定！🎬",
      "老板牛逼，这波稳了！🔥",
      "创意满分，订单接到手软！📦",
      "又搞定一个，老板就是效率担当！⚡",
    ];
    const randomBlessing =
      fallbackBlessings[Math.floor(Math.random() * fallbackBlessings.length)];

    return NextResponse.json({
      success: true,
      blessing: randomBlessing,
    });
  }
}
