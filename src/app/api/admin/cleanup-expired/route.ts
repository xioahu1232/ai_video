import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 清理过期任务记录 API
 * 
 * POST /api/cleanup-expired-tasks
 * 
 * 功能：
 * - 删除已过期的任务记录（expires_at < now 且 expires_at IS NOT NULL）
 * - 只删除未收藏的记录（starred = false）
 * - 需要管理员权限
 * 
 * 调用方式：
 * 1. 管理员手动触发
 * 2. 定时任务（如 cron job）自动触发
 * 3. 前端页面加载时可选触发
 */
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

    // 检查是否是管理员
    const { data: userBalance } = await supabase
      .from('user_balances')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userBalance || userBalance.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }

    // 删除过期任务
    // 条件：expires_at IS NOT NULL AND expires_at < now AND starred = false
    const now = new Date().toISOString();
    
    // 先统计要删除的记录数
    const { data: expiredTasks, error: countError } = await supabase
      .from('user_tasks')
      .select('id')
      .not('expires_at', 'is', null)
      .lt('expires_at', now)
      .eq('starred', false);

    if (countError) {
      console.error('Count expired tasks error:', countError);
      return NextResponse.json({ error: '统计过期记录失败' }, { status: 500 });
    }

    const count = expiredTasks?.length || 0;

    if (count === 0) {
      return NextResponse.json({
        success: true,
        message: '没有需要清理的过期记录',
        deletedCount: 0,
      });
    }

    // 执行删除
    const { error: deleteError } = await supabase
      .from('user_tasks')
      .delete()
      .not('expires_at', 'is', null)
      .lt('expires_at', now)
      .eq('starred', false);

    if (deleteError) {
      console.error('Delete expired tasks error:', deleteError);
      return NextResponse.json({ error: '删除过期记录失败' }, { status: 500 });
    }

    console.log(`[Cleanup] Deleted ${count} expired tasks at ${now}`);

    return NextResponse.json({
      success: true,
      message: `成功清理 ${count} 条过期记录`,
      deletedCount: count,
      cleanedAt: now,
    });
  } catch (error) {
    console.error('Cleanup expired tasks error:', error);
    return NextResponse.json({ error: '清理过期记录失败' }, { status: 500 });
  }
}

/**
 * GET 方法：获取过期任务统计（不执行删除）
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

    // 检查是否是管理员
    const { data: userBalance } = await supabase
      .from('user_balances')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userBalance || userBalance.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // 统计过期任务
    const { data: expiredTasks } = await supabase
      .from('user_tasks')
      .select('id, user_id, created_at, expires_at')
      .not('expires_at', 'is', null)
      .lt('expires_at', now)
      .eq('starred', false);

    // 统计即将过期的任务（24小时内）
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data: expiringTasks } = await supabase
      .from('user_tasks')
      .select('id, user_id, created_at, expires_at')
      .not('expires_at', 'is', null)
      .gte('expires_at', now)
      .lt('expires_at', tomorrow)
      .eq('starred', false);

    // 统计收藏的任务（永久保存）
    const { count: starredCount } = await supabase
      .from('user_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('starred', true);

    return NextResponse.json({
      success: true,
      stats: {
        expiredCount: expiredTasks?.length || 0,
        expiringIn24hCount: expiringTasks?.length || 0,
        starredCount: starredCount || 0,
      },
    });
  } catch (error) {
    console.error('Get expired tasks stats error:', error);
    return NextResponse.json({ error: '获取统计失败' }, { status: 500 });
  }
}
