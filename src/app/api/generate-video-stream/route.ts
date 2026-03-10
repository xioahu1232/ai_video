import { NextRequest } from 'next/server';
import { getUserClient } from '@/lib/db-pool';
import { checkRateLimit, generateRateLimiter, userRateLimiter } from '@/lib/rate-limiter';
import { deductBalance, refundBalance } from '@/lib/balance-service';
import { getCozeApiKey, getWorkflowId } from '@/lib/stable-config';

// Coze 工作流配置
const COZE_API_URL = 'https://api.coze.cn/v1/workflow/stream_run';

interface GenerateVideoRequest {
  coreSellingPoint: string;
  productImageUrl: string;
  speechDuration: string;
  videoDuration: string;
  language: string;
  specialRequirements?: string; // 特殊要求
  taskId: string; // 前端传入的任务ID
}

export async function POST(request: NextRequest) {
  const requestId = Date.now().toString();
  console.log(`[${requestId}] Generate video stream request started`);

  // 验证用户登录状态
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: '请先登录' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.substring(7);
  let supabase;
  try {
    supabase = getUserClient(token);
  } catch (dbError) {
    console.error(`[${requestId}] Database connection error:`, dbError);
    return new Response(JSON.stringify({ error: '数据库连接失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 验证用户
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: '登录已过期' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 🛡️ 限流检查
  const rateLimitResult = checkRateLimit(user.id, [
    { name: 'user', limiter: userRateLimiter },
    { name: 'generate', limiter: generateRateLimiter },
  ]);

  if (!rateLimitResult.allowed) {
    const retryAfter = rateLimitResult.result?.retryAfter || 60;
    return new Response(JSON.stringify({ error: `请求过于频繁，请 ${retryAfter} 秒后重试` }), {
      status: 429,
      headers: { 
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter)
      },
    });
  }

  // 解析请求体
  const body: GenerateVideoRequest = await request.json();
  const { coreSellingPoint, productImageUrl, speechDuration, videoDuration, language, specialRequirements, taskId } = body;

  // 参数验证
  if (!coreSellingPoint || !productImageUrl) {
    return new Response(JSON.stringify({ error: '缺少必填参数' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 获取 API Key
  const apiKey = await getCozeApiKey();
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API Key 未配置' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 获取工作流 ID
  const workflowId = await getWorkflowId();
  console.log(`[${requestId}] Using workflow ID: ${workflowId}`);

  // 🛡️ 先扣减余额
  const deductResult = await deductBalance(supabase, user.id, 1);
  if (!deductResult.success) {
    return new Response(JSON.stringify({ error: deductResult.error || '余额扣减失败' }), {
      status: 402,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 构建工作流请求参数
  const workflowParams: Record<string, string> = {
    'yaodian': coreSellingPoint,
    'pic': productImageUrl,
    'time': videoDuration,
    'yuyan': language,
    'koubo': speechDuration,
    'str.yaoqiu': specialRequirements || '', // 特殊要求
  };

  console.log(`[${requestId}] Starting stream workflow with params:`, workflowParams);

  // 创建 SSE 响应流
  const encoder = new TextEncoder();
  let refundNeeded = false;

  const stream = new ReadableStream({
    async start(controller) {
      // 发送 SSE 消息的辅助函数
      const sendEvent = (event: string, data: Record<string, unknown>) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        // 发送开始事件
        sendEvent('start', { 
          message: '开始处理...',
          taskId,
          timestamp: Date.now()
        });

        // 调用 Coze 流式工作流 API
        const response = await fetch(COZE_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
          },
          body: JSON.stringify({
            workflow_id: workflowId,
            parameters: workflowParams,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[${requestId}] Coze API error:`, response.status, errorText);
          refundNeeded = true;
          sendEvent('error', { 
            error: `工作流调用失败: ${response.status}`,
            details: errorText
          });
          controller.close();
          return;
        }

        // 读取 Coze 的 SSE 流
        const reader = response.body?.getReader();
        if (!reader) {
          refundNeeded = true;
          sendEvent('error', { error: '无法读取响应流' });
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let resultData: { sora?: string; seedance?: string } = {};

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log(`[${requestId}] Stream completed`);
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          
          // 解析 SSE 数据
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // 保留最后一个不完整的行

          for (const line of lines) {
            if (line.startsWith('data:')) {
              try {
                const data = JSON.parse(line.slice(5).trim());
                console.log(`[${requestId}] Received event:`, data);

                // 处理不同类型的事件
                if (data.event === 'message' || data.event === 'node_progress') {
                  // 发送进度事件
                  sendEvent('progress', {
                    message: data.message || data.content || '处理中...',
                    node: data.node_name,
                    progress: data.progress,
                  });
                } else if (data.event === 'done' || data.code === 0) {
                  // 工作流完成
                  const output = data.data || data.output || {};
                  
                  // 解析结果
                  if (typeof output === 'string') {
                    try {
                      const parsed = JSON.parse(output);
                      resultData = {
                        sora: parsed.sora || parsed.Sora || '',
                        seedance: parsed.seedance || parsed.Seedance || '',
                      };
                    } catch {
                      resultData = { sora: output, seedance: '' };
                    }
                  } else {
                    resultData = {
                      sora: output.sora || output.Sora || '',
                      seedance: output.seedance || output.Seedance || '',
                    };
                  }

                  sendEvent('complete', {
                    message: '生成完成',
                    sora: resultData.sora,
                    seedance: resultData.seedance,
                    taskId,
                    debugUrl: data.debug_url,
                  });
                } else if (data.event === 'error' || data.code !== undefined && data.code !== 0) {
                  refundNeeded = true;
                  sendEvent('error', {
                    error: data.msg || data.message || '工作流执行失败',
                    code: data.code,
                  });
                }
              } catch (parseError) {
                // 忽略解析错误，继续处理
                console.log(`[${requestId}] Parse error for line:`, line);
              }
            }
          }
        }

        // 如果没有收到完成事件，但有数据，尝试发送完成
        if (!refundNeeded && (resultData.sora || resultData.seedance)) {
          sendEvent('complete', {
            message: '生成完成',
            sora: resultData.sora,
            seedance: resultData.seedance,
            taskId,
          });
        }

      } catch (error) {
        console.error(`[${requestId}] Stream error:`, error);
        refundNeeded = true;
        sendEvent('error', { 
          error: error instanceof Error ? error.message : '处理失败'
        });
      } finally {
        // 如果需要退款，执行退款
        if (refundNeeded) {
          await refundBalance(supabase, user.id, 1);
          console.log(`[${requestId}] Refunded balance due to error`);
        }
        controller.close();
      }
    },
  });

  // 返回 SSE 响应
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // 禁用 Nginx 缓冲
    },
  });
}
