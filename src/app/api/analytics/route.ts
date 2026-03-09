import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 数据埋点API
 * 
 * POST /api/analytics
 * 
 * 请求体：
 * - eventType: 事件类型（page_view, click, submit, error 等）
 * - eventName: 事件名称
 * - eventCategory: 事件分类（可选）
 * - eventData: 事件详情（JSON字符串，可选）
 */

// 获取客户端信息
function getClientInfo(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // 解析设备类型
  let deviceType = 'desktop';
  const ua = userAgent.toLowerCase();
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/tablet|ipad|playbook|silk/i.test(ua)) {
    deviceType = 'tablet';
  }

  return {
    ipAddress: forwarded?.split(',')[0].trim() || realIP || 'unknown',
    userAgent,
    deviceType,
  };
}

// 不需要认证的事件（公开事件）
const PUBLIC_EVENTS = ['page_view', 'session_start', 'error'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, eventName, eventCategory, eventData, pageUrl, referrer, sessionId } = body;

    if (!eventType || !eventName) {
      return NextResponse.json(
        { error: '事件类型和事件名称为必填项' },
        { status: 400 }
      );
    }

    const clientInfo = getClientInfo(request);
    const supabase = getSupabaseClient();

    // 尝试获取用户ID（如果已登录）
    let userId = null;
    const authHeader = request.headers.get('authorization');
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const clientWithToken = getSupabaseClient(token);
      const { data: { user } } = await clientWithToken.auth.getUser();
      userId = user?.id || null;
    }

    // 记录事件
    const { error } = await supabase.from('analytics_events').insert({
      user_id: userId,
      session_id: sessionId,
      event_type: eventType,
      event_name: eventName,
      event_category: eventCategory,
      event_data: typeof eventData === 'object' ? JSON.stringify(eventData) : eventData,
      page_url: pageUrl,
      referrer,
      user_agent: clientInfo.userAgent,
      ip_address: clientInfo.ipAddress,
      device_type: clientInfo.deviceType,
    });

    if (error) {
      console.error('Analytics event error:', error);
      // 埋点失败不影响用户体验，静默处理
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics error:', error);
    // 埋点失败不影响用户体验，返回成功
    return NextResponse.json({ success: true });
  }
}

/**
 * 获取埋点统计数据（管理员权限）
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 构建查询
    let query = supabase
      .from('analytics_events')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: events, count } = await query.limit(1000);

    // 统计分析
    const eventTypeCount: Record<string, number> = {};
    const eventNameCount: Record<string, number> = {};
    const deviceTypeCount: Record<string, number> = {};
    const hourlyCount: Record<number, number> = {};
    const dailyCount: Record<string, number> = {};

    events?.forEach((event: any) => {
      // 事件类型统计
      eventTypeCount[event.event_type] = (eventTypeCount[event.event_type] || 0) + 1;
      
      // 事件名称统计
      eventNameCount[event.event_name] = (eventNameCount[event.event_name] || 0) + 1;
      
      // 设备类型统计
      if (event.device_type) {
        deviceTypeCount[event.device_type] = (deviceTypeCount[event.device_type] || 0) + 1;
      }
      
      // 时间分布
      const date = new Date(event.created_at);
      const hour = date.getHours();
      const day = date.toISOString().split('T')[0];
      hourlyCount[hour] = (hourlyCount[hour] || 0) + 1;
      dailyCount[day] = (dailyCount[day] || 0) + 1;
    });

    return NextResponse.json({
      total: count,
      eventTypeCount,
      eventNameCount,
      deviceTypeCount,
      hourlyCount,
      dailyCount,
      recentEvents: events?.slice(0, 50),
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
