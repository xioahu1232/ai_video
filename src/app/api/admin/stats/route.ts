import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取管理员统计数据
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseClient(token);

    // 验证用户身份
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 检查是否是管理员
    const { data: userBalance } = await supabase
      .from('user_balances')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userBalance || userBalance.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    // 并行获取统计数据
    const [
      usersResult,
      tasksResult,
      inviteCodesResult,
      usedInviteCodesResult,
      redemptionCodesResult,
      usedRedemptionCodesResult,
    ] = await Promise.all([
      supabase.from('user_balances').select('id', { count: 'exact', head: true }),
      supabase.from('user_tasks').select('id', { count: 'exact', head: true }),
      supabase.from('invite_codes').select('id', { count: 'exact', head: true }),
      supabase.from('invite_codes').select('id', { count: 'exact', head: true }).eq('is_used', true),
      supabase.from('redemption_codes').select('id', { count: 'exact', head: true }),
      supabase.from('redemption_codes').select('id', { count: 'exact', head: true }).eq('is_used', true),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: usersResult.count || 0,
        totalTasks: tasksResult.count || 0,
        totalInviteCodes: inviteCodesResult.count || 0,
        usedInviteCodes: usedInviteCodesResult.count || 0,
        totalRedemptionCodes: redemptionCodesResult.count || 0,
        usedRedemptionCodes: usedRedemptionCodesResult.count || 0,
      },
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 });
  }
}
