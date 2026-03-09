import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 登录日志查询API
 * 
 * GET /api/admin/login-logs
 * 
 * 查询参数：
 * - page: 页码（默认1）
 * - limit: 每页数量（默认20，最大100）
 * - email: 邮箱筛选
 * - success: 成功状态筛选
 * - startDate: 开始日期
 * - endDate: 结束日期
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

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const email = searchParams.get('email');
    const success = searchParams.get('success');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 构建查询
    let query = supabase
      .from('login_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // 应用筛选
    if (email) {
      query = query.ilike('email', `%${email}%`);
    }
    if (success !== null && success !== '') {
      query = query.eq('success', success === 'true');
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // 分页
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: logs, error: logsError, count } = await query;

    if (logsError) {
      console.error('Query login logs error:', logsError);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    // 统计数据
    const { data: stats } = await supabase
      .from('login_logs')
      .select('success, login_type');

    const totalLogins = stats?.length || 0;
    const successLogins = stats?.filter(s => s.success).length || 0;
    const failedLogins = totalLogins - successLogins;
    const adminLogins = stats?.filter(s => s.login_type === 'admin').length || 0;
    const userLogins = stats?.filter(s => s.login_type === 'user').length || 0;

    // 最近失败的登录（可能的安全威胁）
    const { data: recentFailures } = await supabase
      .from('login_logs')
      .select('email, ip_address, created_at')
      .eq('success', false)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      stats: {
        total: totalLogins,
        success: successLogins,
        failed: failedLogins,
        successRate: totalLogins > 0 ? (successLogins / totalLogins * 100).toFixed(1) : '0',
        adminLogins,
        userLogins,
      },
      recentFailures,
    });
  } catch (error) {
    console.error('Get login logs error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
