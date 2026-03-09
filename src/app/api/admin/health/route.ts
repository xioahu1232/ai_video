import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 系统健康检查接口
 * 
 * GET /api/admin/health
 * 
 * 返回：
 * - 数据库连接状态
 * - 各表记录数和存储大小
 * - 限流状态
 * - 系统资源使用情况
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const supabase = getSupabaseClient(token);

    // 验证用户
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

    // 验证管理员权限
    const { data: userBalance } = await supabase
      .from('user_balances')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userBalance || userBalance.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }

    // 获取各表统计信息
    const [
      usersResult,
      balancesResult,
      tasksResult,
      invitesResult,
      codesResult,
    ] = await Promise.all([
      supabase.from('user_balances').select('id', { count: 'exact', head: true }),
      supabase.from('user_balances').select('balance, total_used'),
      supabase.from('user_tasks').select('id', { count: 'exact', head: true }),
      supabase.from('invite_codes').select('id', { count: 'exact', head: true }),
      supabase.from('redemption_codes').select('id', { count: 'exact', head: true }),
    ]);

    // 计算总余额和总使用量
    const totalBalance = balancesResult.data?.reduce((sum, u) => sum + (u.balance || 0), 0) || 0;
    const totalUsed = balancesResult.data?.reduce((sum, u) => sum + (u.total_used || 0), 0) || 0;

    // 获取限流统计
    const { getRateLimitStats } = await import('@/lib/rate-limiter');
    const rateLimitStats = getRateLimitStats();

    // 估算数据库存储使用情况
    // Supabase 免费版限制：500MB
    const estimatedRowSize = {
      user_balances: 500,    // 每行约 500 字节
      user_tasks: 2000,      // 每行约 2KB（含提示词文本）
      invite_codes: 200,     // 每行约 200 字节
      redemption_codes: 200, // 每行约 200 字节
    };

    const estimatedSize = {
      user_balances: (usersResult.count || 0) * estimatedRowSize.user_balances,
      user_tasks: (tasksResult.count || 0) * estimatedRowSize.user_tasks,
      invite_codes: (invitesResult.count || 0) * estimatedRowSize.invite_codes,
      redemption_codes: (codesResult.count || 0) * estimatedRowSize.redemption_codes,
    };

    const totalEstimatedSize = Object.values(estimatedSize).reduce((a, b) => a + b, 0);
    const maxStorage = 500 * 1024 * 1024; // 500MB
    const storageUsagePercent = (totalEstimatedSize / maxStorage) * 100;

    // 构建健康报告
    const healthReport = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        tables: {
          users: {
            count: usersResult.count || 0,
            estimatedSize: formatBytes(estimatedSize.user_balances),
          },
          tasks: {
            count: tasksResult.count || 0,
            estimatedSize: formatBytes(estimatedSize.user_tasks),
          },
          inviteCodes: {
            count: invitesResult.count || 0,
            estimatedSize: formatBytes(estimatedSize.invite_codes),
          },
          redemptionCodes: {
            count: codesResult.count || 0,
            estimatedSize: formatBytes(estimatedSize.redemption_codes),
          },
        },
        storage: {
          used: formatBytes(totalEstimatedSize),
          max: '500 MB',
          usagePercent: storageUsagePercent.toFixed(2) + '%',
          warning: storageUsagePercent > 80 
            ? '⚠️ 存储使用率超过80%，建议清理历史任务数据' 
            : undefined,
        },
      },
      business: {
        totalBalance,
        totalUsed,
        activeRateLimits: rateLimitStats.activeEntries,
      },
      rateLimit: rateLimitStats,
      recommendations: generateRecommendations({
        storageUsagePercent,
        userCount: usersResult.count || 0,
        taskCount: tasksResult.count || 0,
      }),
    };

    // 如果存储超过阈值，标记为 warning
    if (storageUsagePercent > 90) {
      healthReport.status = 'warning';
    }

    return NextResponse.json(healthReport);

  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * 格式化字节数
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 生成优化建议
 */
function generateRecommendations(data: {
  storageUsagePercent: number;
  userCount: number;
  taskCount: number;
}): string[] {
  const recommendations: string[] = [];

  if (data.storageUsagePercent > 80) {
    recommendations.push('存储空间使用率较高，建议清理 30 天前的任务记录');
  }

  if (data.taskCount > 10000) {
    recommendations.push('任务记录过多，建议启用自动清理策略或升级数据库');
  }

  if (data.userCount > 100) {
    recommendations.push('用户数量增长良好，建议监控并发请求量');
  }

  if (recommendations.length === 0) {
    recommendations.push('系统运行正常，继续保持监控');
  }

  return recommendations;
}
