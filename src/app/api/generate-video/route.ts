import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { checkRateLimit, generateRateLimiter, userRateLimiter } from '@/lib/rate-limiter';
import { deductBalance, getBalanceInfo } from '@/lib/balance-service';

// Coze 工作流配置
const WORKFLOW_ID = '7601074566710444095';
const COZE_API_URL = 'https://api.coze.cn/v1/workflow/run';
// 工作流超时时间：5分钟
const WORKFLOW_TIMEOUT = 300000;

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
  retryAfter?: number;
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

    // 🛡️ 限流检查：防止高并发崩溃
    const rateLimitResult = checkRateLimit(user.id, [
      { name: 'user', limiter: userRateLimiter },
      { name: 'generate', limiter: generateRateLimiter },
    ]);

    if (!rateLimitResult.allowed) {
      const retryAfter = rateLimitResult.result?.retryAfter || 60;
      return NextResponse.json(
        {
          success: false,
          error: `请求过于频繁，请 ${retryAfter} 秒后重试`,
          retryAfter,
        },
        { 
          status: 429,
          headers: { 'Retry-After': String(retryAfter) }
        }
      );
    }

    // 获取用户余额信息
    const balanceInfo = await getBalanceInfo(supabase, user.id);

    // 检查用户余额
    if (!balanceInfo || balanceInfo.balance <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: '余额不足，请先充值',
          balance: balanceInfo?.balance || 0 
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
        { success: false, error: 'API Key 未配置，请联系管理员' },
        { status: 500 }
      );
    }

    // 🛡️ 先扣减余额（并发安全）
    // 这样可以防止用户在余额不足时仍然调用工作流
    const deductResult = await deductBalance(supabase, user.id, 1);
    
    if (!deductResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: deductResult.error || '余额扣减失败',
          balance: deductResult.previousBalance,
        },
        { status: 402 }
      );
    }

    // 构建工作流请求参数
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
      userId: user.id,
      previousBalance: deductResult.previousBalance,
    });

    // 调用 Coze 工作流 API（带超时控制）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WORKFLOW_TIMEOUT);

    try {
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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const result = await response.json();
      console.log('Coze Workflow Result:', JSON.stringify(result, null, 2));

      // 检查 API 返回状态
      if (result.code !== 0) {
        const errorMsg = result.msg || '工作流调用失败';
        console.error('Coze API Error:', result);
        
        // 🛡️ API 调用失败，返还余额
        await refundBalance(supabase, user.id, 1);
        
        return NextResponse.json({
          success: false,
          error: errorMsg,
          debugUrl: result.debug_url,
          rawResponse: result,
          balance: deductResult.previousBalance,
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

      return NextResponse.json({
        success: true,
        taskId: result.execute_id || Date.now().toString(),
        sora: outputData.sora as string | undefined,
        seedance: outputData.seedance as string | undefined,
        debugUrl: result.debug_url,
        balance: deductResult.newBalance,
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // 🛡️ 超时或网络错误，返还余额
      await refundBalance(supabase, user.id, 1);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          error: '工作流执行超时，请稍后重试。您的余额已返还。',
          balance: deductResult.previousBalance,
        }, { status: 504 });
      }
      
      throw fetchError;
    }

  } catch (error) {
    console.error('Generate Video Error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    // 如果是认证错误，返回401
    if (error instanceof Error && error.message.includes('JWT')) {
      return NextResponse.json(
        { success: false, error: '登录已过期，请重新登录' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '服务器内部错误',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * 返还余额（用于失败时回滚）
 */
async function refundBalance(
  supab: ReturnType<typeof getSupabaseClient>,
  userId: string,
  amount: number
): Promise<void> {
  try {
    // 获取当前余额
    const { data: current } = await supab
      .from('user_balances')
      .select('balance, total_used')
      .eq('user_id', userId)
      .single();

    if (current) {
      await supab
        .from('user_balances')
        .update({
          balance: current.balance + amount,
          total_used: Math.max(0, current.total_used - amount),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
      
      console.log(`Refunded ${amount} balance to user ${userId}`);
    }
  } catch (error) {
    console.error('Refund balance error:', error);
    // 不抛出错误，避免影响主流程
  }
}
