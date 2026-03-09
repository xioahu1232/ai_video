import { NextRequest, NextResponse } from 'next/server';

// Coze 工作流配置
const WORKFLOW_ID = '7601074566710444095';
const COZE_API_URL = 'https://api.coze.cn/v1/workflow/run';

// API Key 从环境变量获取（需要在 .env.local 中配置）
// COZE_API_KEY=你的API密钥

interface GenerateVideoRequest {
  coreSellingPoint: string;
  productImageUrl: string; // 图片URL（需要先上传到对象存储）
  speechDuration: string;
  videoDuration: string;
  language: string;
}

interface TaskResponse {
  success: boolean;
  taskId?: string;
  videoUrl?: string;
  prompt?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<TaskResponse>> {
  try {
    const body: GenerateVideoRequest = await request.json();
    const { coreSellingPoint, productImageUrl, speechDuration, videoDuration, language } = body;

    // 参数验证
    if (!coreSellingPoint || !productImageUrl) {
      return NextResponse.json(
        { success: false, error: '缺少必填参数：核心卖点和产品图片' },
        { status: 400 }
      );
    }

    // 获取 API Key
    const apiKey = process.env.COZE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API Key 未配置，请联系管理员' },
        { status: 500 }
      );
    }

    // 构建工作流请求参数
    // TODO: 根据实际工作流参数名称调整
    const workflowParams = {
      // 根据你的工作流开始节点定义的参数名称修改
      // 例如：
      // core_selling_point: coreSellingPoint,
      // image_url: productImageUrl,
      // speech_duration: speechDuration,
      // video_duration: videoDuration,
      // language: language,
    };

    console.log('Calling Coze Workflow:', {
      workflow_id: WORKFLOW_ID,
      params: workflowParams,
    });

    // 调用 Coze 工作流 API
    const response = await fetch(COZE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflow_id: WORKFLOW_ID,
        parameters: workflowParams,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Coze API Error:', errorText);
      return NextResponse.json(
        { success: false, error: `工作流调用失败: ${response.status}` },
        { status: 500 }
      );
    }

    const result = await response.json();
    console.log('Coze Workflow Result:', result);

    // 解析工作流返回结果
    // TODO: 根据实际工作流输出参数名称调整
    return NextResponse.json({
      success: true,
      taskId: result.data?.id || Date.now().toString(),
      videoUrl: result.data?.output?.video_url || result.data?.video_url,
      prompt: result.data?.output?.prompt || result.data?.prompt,
    });

  } catch (error) {
    console.error('Generate Video Error:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
