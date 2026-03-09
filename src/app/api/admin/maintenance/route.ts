import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 数据维护接口
 * 
 * POST /api/admin/maintenance
 * 
 * 功能：
 * - backup: 导出数据备份
 * - cleanup: 清理过期数据
 * - stats: 获取维护统计
 */

interface MaintenanceRequest {
  action: 'backup' | 'cleanup' | 'stats';
  options?: {
    daysToKeep?: number;  // 清理时保留的天数
    tables?: string[];    // 要操作的表
  };
}

export async function POST(request: NextRequest) {
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

    const body: MaintenanceRequest = await request.json();
    const { action, options = {} } = body;

    switch (action) {
      case 'backup':
        return await handleBackup(supabase, options);
      case 'cleanup':
        return await handleCleanup(supabase, options);
      case 'stats':
        return await handleStats(supabase);
      default:
        return NextResponse.json({ error: '未知操作' }, { status: 400 });
    }

  } catch (error) {
    console.error('Maintenance error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '操作失败',
    }, { status: 500 });
  }
}

/**
 * 数据备份
 */
async function handleBackup(
  supabase: ReturnType<typeof getSupabaseClient>,
  options: { tables?: string[] }
) {
  const tables = options.tables || ['user_balances', 'user_tasks', 'invite_codes', 'redemption_codes'];
  const backup: Record<string, unknown[]> = {};
  const timestamp = new Date().toISOString();

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10000); // 限制每次导出数量

    if (error) {
      console.error(`Backup ${table} error:`, error);
      backup[table] = [];
    } else {
      backup[table] = data || [];
    }
  }

  return NextResponse.json({
    success: true,
    timestamp,
    tables: tables,
    counts: {
      user_balances: backup['user_balances']?.length || 0,
      user_tasks: backup['user_tasks']?.length || 0,
      invite_codes: backup['invite_codes']?.length || 0,
      redemption_codes: backup['redemption_codes']?.length || 0,
    },
    data: backup,
    downloadFilename: `backup-${timestamp.split('T')[0]}.json`,
  });
}

/**
 * 数据清理
 */
async function handleCleanup(
  supabase: ReturnType<typeof getSupabaseClient>,
  options: { daysToKeep?: number; tables?: string[] }
) {
  const daysToKeep = options.daysToKeep || 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  const cutoffISO = cutoffDate.toISOString();

  const results: Record<string, { deleted: number; error?: string }> = {};

  // 清理过期的用户任务（超过指定天数）
  const { data: oldTasks, error: tasksError } = await supabase
    .from('user_tasks')
    .delete()
    .lt('created_at', cutoffISO)
    .select('id');

  if (tasksError) {
    results['user_tasks'] = { deleted: 0, error: tasksError.message };
  } else {
    results['user_tasks'] = { deleted: oldTasks?.length || 0 };
  }

  // 清理过期的已使用邀请码（超过90天）
  const inviteCutoff = new Date();
  inviteCutoff.setDate(inviteCutoff.getDate() - 90);
  
  const { data: oldInvites, error: invitesError } = await supabase
    .from('invite_codes')
    .delete()
    .eq('is_used', true)
    .lt('used_at', inviteCutoff.toISOString())
    .select('id');

  if (invitesError) {
    results['invite_codes'] = { deleted: 0, error: invitesError.message };
  } else {
    results['invite_codes'] = { deleted: oldInvites?.length || 0 };
  }

  // 清理过期的已使用兑换码（超过90天）
  const { data: oldCodes, error: codesError } = await supabase
    .from('redemption_codes')
    .delete()
    .eq('is_used', true)
    .lt('used_at', inviteCutoff.toISOString())
    .select('id');

  if (codesError) {
    results['redemption_codes'] = { deleted: 0, error: codesError.message };
  } else {
    results['redemption_codes'] = { deleted: oldCodes?.length || 0 };
  }

  return NextResponse.json({
    success: true,
    message: `数据清理完成，保留了最近 ${daysToKeep} 天的任务记录`,
    cutoffDate: cutoffISO,
    results,
    totalDeleted: Object.values(results).reduce((sum, r) => sum + r.deleted, 0),
  });
}

/**
 * 维护统计
 */
async function handleStats(supabase: ReturnType<typeof getSupabaseClient>) {
  // 获取各表统计
  const [
    tasksStats,
    unusedInvites,
    unusedCodes,
  ] = await Promise.all([
    // 任务时间分布
    supabase
      .from('user_tasks')
      .select('created_at')
      .order('created_at', { ascending: false }),
    // 未使用的邀请码
    supabase
      .from('invite_codes')
      .select('id')
      .eq('is_used', false),
    // 未使用的兑换码
    supabase
      .from('redemption_codes')
      .select('id, amount')
      .eq('is_used', false),
  ]);

  // 计算任务时间分布
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const tasks = tasksStats.data || [];
  const tasksLast24h = tasks.filter(t => new Date(t.created_at) > oneDayAgo).length;
  const tasksLast7d = tasks.filter(t => new Date(t.created_at) > oneWeekAgo).length;
  const tasksLast30d = tasks.filter(t => new Date(t.created_at) > oneMonthAgo).length;
  const tasksOlder = tasks.filter(t => new Date(t.created_at) <= oneMonthAgo).length;

  // 计算未使用兑换码总价值
  const unusedCodesValue = (unusedCodes.data || []).reduce((sum, c) => sum + (c.amount || 0), 0);

  return NextResponse.json({
    success: true,
    tasks: {
      total: tasks.length,
      last24h: tasksLast24h,
      last7d: tasksLast7d,
      last30d: tasksLast30d,
      olderThan30d: tasksOlder,
      potentialSavings: `${tasksOlder} 条旧记录可以清理`,
    },
    invites: {
      unused: unusedInvites.data?.length || 0,
    },
    codes: {
      unused: unusedCodes.data?.length || 0,
      totalValue: unusedCodesValue,
    },
    recommendations: [
      tasksOlder > 100 ? `建议清理 ${tasksOlder} 条超过30天的任务记录` : null,
      unusedInvites.data?.length && unusedInvites.data.length > 100 ? `有 ${unusedInvites.data.length} 个未使用的邀请码` : null,
    ].filter(Boolean),
  });
}
