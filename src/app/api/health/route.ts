import { NextResponse } from 'next/server';
import { getSystemHealth, quickHealthCheck } from '@/lib/health-monitor';

/**
 * 健康检查 API
 * 
 * GET /api/health - 完整健康检查
 * GET /api/health?quick=1 - 快速检查（用于负载均衡器）
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const quick = url.searchParams.get('quick');

  try {
    if (quick) {
      // 快速检查（轻量级）
      const result = await quickHealthCheck();
      return NextResponse.json(result, {
        status: result.healthy ? 200 : 503,
      });
    }

    // 完整检查
    const health = await getSystemHealth();
    
    return NextResponse.json(health, {
      status: health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
