import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// Coze 工作流配置
const WORKFLOW_ID = '7601074566710444095';
const COZE_API_URL = 'https://api.coze.cn/v1/workflow/run';

interface GenerateVideoRequest {
  coreSellingPoint: string;
  productImageUrl: string;
  speechDuration: string;
  videoDuration: string;
  language: string;
}

interface TaskResponse {
  success: boolean;
  taskId?: string;
  sora?: string;
  seedance?: string;
  debugUrl?: string;
  error?: string;
  rawResponse?: unknown;
  balance?: number;
}

export async function POST(request: NextRequest): Promise<NextResponse<TaskResponse>> {
  try {
    // 验证用户登录状态
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const supabase = getSupabaseClient(token);

    // 验证用户
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '登录已过期，请重新登录' },
        { status: 401 }
      );
    }

    // 检查用户余额
    const { data: userBalance, error: balanceError } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (balanceError && balanceError.code !== 'PGRST116') {
      console.error('Get balance error:', balanceError);
      return NextResponse.json(
        { success: false, error: '获取余额失败' },
        { status: 500 }
      );
    }

    const currentBalance = userBalance?.balance || 0;

    if (currentBalance <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: '余额不足，请先充值',
          balance: currentBalance 
        },
        { status: 402 } // 402 Payment Required
      );
    }

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
        { success: false, error: 'API Key 未配置，请在 .env.local 中配置 COZE_API_KEY' },
        { status: 500 }
      );
    }

    // 构建工作流请求参数
    // 尝试去掉 str. 前缀，直接使用变量名
    const workflowParams: Record<string, string> = {
      'yaodian': coreSellingPoint,      // 核心卖点
      'pic': productImageUrl,           // 产品图片URL
      'time': videoDuration,            // 视频时长
      'yuyan': language,                // 语言
      'koubo': speechDuration,          // 口播时长
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

    const result = await response.json();
    console.log('Coze Workflow Result:', JSON.stringify(result, null, 2));

    // 检查 API 返回状态
    if (result.code !== 0) {
      const errorMsg = result.msg || '工作流调用失败';
      console.error('Coze API Error:', result);
      
      return NextResponse.json({
        success: false,
        error: errorMsg,
        debugUrl: result.debug_url,
        rawResponse: result,
      });
    }

    // 解析工作流返回结果
    let outputData: Record<string, unknown> = {};
    
    if (result.data) {
      try {
        if (typeof result.data === 'string') {
          outputData = JSON.parse(result.data);
        } else {
          outputData = result.data;
        }
      } catch (parseError) {
        console.error('Failed to parse result.data:', parseError);
        outputData = { raw: result.data };
      }
    }

    console.log('Parsed output:', outputData);

    // 扣减余额
    const newBalance = currentBalance - 1;
    
    if (userBalance) {
      // 更新已有记录
      const { error: updateError } = await supabase
        .from('user_balances')
        .update({
          balance: newBalance,
          total_used: userBalance.total_used + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Update balance error:', updateError);
        // 不影响主流程，只记录错误
      }
    } else {
      // 创建新记录（理论上不会走到这里，因为前面已经检查过余额）
      await supabase
        .from('user_balances')
        .insert({
          user_id: user.id,
          balance: 0,
          total_used: 1,
          total_purchased: 0,
        });
    }

    return NextResponse.json({
      success: true,
      taskId: result.execute_id || Date.now().toString(),
      sora: outputData.sora as string | undefined,
      seedance: outputData.seedance as string | undefined,
      debugUrl: result.debug_url,
      balance: newBalance,
    });

  } catch (error) {
    console.error('Generate Video Error:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误: ' + (error instanceof Error ? error.message : '未知.message') },
      { status: 500 }
    );
  }
}
