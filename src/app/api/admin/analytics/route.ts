import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 详细数据分析API
 * 
 * GET /api/admin/analytics
 * 
 * 返回详细的数据分析报告，包括：
 * - 今日/昨日/本周/本月统计
 * - 按小时分布的任务量
 * - 使用量前列的用户
 * - 成功率/失败率
 * - 错误统计
 * - 用户增长趋势
 */

interface UserStats {
  userId: string;
  userEmail?: string;
  userName?: string;
  totalTasks: number;
  todayTasks: number;
  successRate: number;
  lastActive: string;
}

interface HourlyStats {
  hour: number;
  count: number;
}

interface DailyStats {
  date: string;
  tasks: number;
  users: number;
  successRate: number;
}

interface ErrorStats {
  error: string;
  count: number;
  lastOccurrence: string;
}

interface AnalyticsData {
  // 核心指标
  overview: {
    today: {
      tasks: number;
      users: number;
      successRate: number;
      avgTasksPerUser: number;
    };
    yesterday: {
      tasks: number;
      users: number;
      successRate: number;
    };
    thisWeek: {
      tasks: number;
      users: number;
      successRate: number;
    };
    thisMonth: {
      tasks: number;
      users: number;
      successRate: number;
    };
    allTime: {
      tasks: number;
      users: number;
      successRate: number;
    };
  };
  
  // 趋势数据
  trends: {
    hourly: HourlyStats[];
    daily: DailyStats[];
  };
  
  // 用户排行
  topUsers: UserStats[];
  
  // 错误统计
  errors: ErrorStats[];
  
  // 实时状态
  realtime: {
    activeUsers: number;
    pendingTasks: number;
    processingTasks: number;
    lastHourTasks: number;
  };
  
  // 业务指标
  business: {
    totalBalance: number;
    totalUsed: number;
    totalPurchased: number;
    activeUsersCount: number;
    newUsersToday: number;
    newUsersThisWeek: number;
  };
}

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

    // 获取时间范围
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // 并行获取所有数据
    const [
      allTasks,
      todayTasks,
      yesterdayTasks,
      weekTasks,
      monthTasks,
      allUsers,
      todayUsers,
      weekUsers,
      errors,
      hourlyTasks,
      dailyTasks,
      topUsersData,
      businessData,
      realtimeData,
    ] = await Promise.all([
      // 所有任务
      supabase.from('user_tasks').select('id, user_id, status, error, created_at'),
      
      // 今日任务
      supabase.from('user_tasks')
        .select('id, user_id, status, error')
        .gte('created_at', todayStart.toISOString()),
      
      // 昨日任务
      supabase.from('user_tasks')
        .select('id, user_id, status')
        .gte('created_at', yesterdayStart.toISOString())
        .lt('created_at', todayStart.toISOString()),
      
      // 本周任务
      supabase.from('user_tasks')
        .select('id, user_id, status')
        .gte('created_at', weekStart.toISOString()),
      
      // 本月任务
      supabase.from('user_tasks')
        .select('id, user_id, status')
        .gte('created_at', monthStart.toISOString()),
      
      // 所有用户
      supabase.from('user_balances').select('user_id, balance, total_used, total_purchased, created_at'),
      
      // 今日新用户
      supabase.from('user_balances')
        .select('user_id')
        .gte('created_at', todayStart.toISOString()),
      
      // 本周新用户
      supabase.from('user_balances')
        .select('user_id')
        .gte('created_at', weekStart.toISOString()),
      
      // 错误统计
      supabase.from('user_tasks')
        .select('error, created_at')
        .not('error', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100),
      
      // 小时分布（今日）
      supabase.from('user_tasks')
        .select('created_at')
        .gte('created_at', todayStart.toISOString()),
      
      // 每日统计（最近7天）
      supabase.from('user_tasks')
        .select('id, user_id, status, created_at')
        .gte('created_at', weekStart.toISOString()),
      
      // 用户使用排行
      supabase.from('user_tasks')
        .select('user_id, status, created_at')
        .order('created_at', { ascending: false }),
      
      // 业务数据
      supabase.from('user_balances')
        .select('balance, total_used, total_purchased'),
      
      // 实时数据
      Promise.all([
        supabase.from('user_tasks')
          .select('user_id')
          .gte('created_at', hourAgo.toISOString()),
        supabase.from('user_tasks')
          .select('id')
          .eq('status', 'pending'),
        supabase.from('user_tasks')
          .select('id')
          .eq('status', 'processing'),
      ]),
    ]);

    // 计算成功率
    const calculateSuccessRate = (tasks: Array<{ status: string }>) => {
      if (tasks.length === 0) return 0;
      const success = tasks.filter(t => t.status === 'completed').length;
      return Math.round((success / tasks.length) * 100);
    };

    // 计算唯一用户数
    const getUniqueUsers = (tasks: Array<{ user_id: string }>) => {
      return new Set(tasks.map(t => t.user_id)).size;
    };

    // 处理小时分布
    const processHourlyStats = (tasks: Array<{ created_at: string }>): HourlyStats[] => {
      const hourCounts: Record<number, number> = {};
      for (let i = 0; i < 24; i++) hourCounts[i] = 0;
      
      tasks.forEach(task => {
        const hour = new Date(task.created_at).getHours();
        hourCounts[hour]++;
      });
      
      return Object.entries(hourCounts).map(([hour, count]) => ({
        hour: parseInt(hour),
        count,
      }));
    };

    // 处理每日统计
    const processDailyStats = (tasks: Array<{ id: string; user_id: string; status: string; created_at: string }>): DailyStats[] => {
      const dayMap: Record<string, { tasks: number; users: Set<string>; success: number; total: number }> = {};
      
      tasks.forEach(task => {
        const date = task.created_at.split('T')[0];
        if (!dayMap[date]) {
          dayMap[date] = { tasks: 0, users: new Set(), success: 0, total: 0 };
        }
        dayMap[date].tasks++;
        dayMap[date].users.add(task.user_id);
        dayMap[date].total++;
        if (task.status === 'completed') dayMap[date].success++;
      });
      
      return Object.entries(dayMap)
        .map(([date, data]) => ({
          date,
          tasks: data.tasks,
          users: data.users.size,
          successRate: data.total > 0 ? Math.round((data.success / data.total) * 100) : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    };

    // 处理用户排行
    const processTopUsers = async (tasks: Array<{ user_id: string; status: string; created_at: string }>): Promise<UserStats[]> => {
      const userMap: Record<string, { total: number; today: number; success: number; lastActive: string }> = {};
      
      tasks.forEach(task => {
        if (!userMap[task.user_id]) {
          userMap[task.user_id] = { total: 0, today: 0, success: 0, lastActive: '' };
        }
        userMap[task.user_id].total++;
        userMap[task.user_id].lastActive = task.created_at;
        if (task.status === 'completed') userMap[task.user_id].success++;
        if (new Date(task.created_at) >= todayStart) {
          userMap[task.user_id].today++;
        }
      });
      
      // 获取用户邮箱
      const userIds = Object.keys(userMap);
      const { data: userDetails } = await supabase.auth.admin.listUsers();
      
      const userEmailMap: Record<string, { email: string; name: string }> = {};
      userDetails?.users?.forEach(u => {
        userEmailMap[u.id] = {
          email: u.email || '',
          name: u.user_metadata?.name || u.email?.split('@')[0] || '',
        };
      });
      
      return Object.entries(userMap)
        .map(([userId, data]) => ({
          userId,
          userEmail: userEmailMap[userId]?.email,
          userName: userEmailMap[userId]?.name,
          totalTasks: data.total,
          todayTasks: data.today,
          successRate: data.total > 0 ? Math.round((data.success / data.total) * 100) : 0,
          lastActive: data.lastActive,
        }))
        .sort((a, b) => b.totalTasks - a.totalTasks)
        .slice(0, 20);
    };

    // 处理错误统计
    const processErrors = (tasks: Array<{ error: string; created_at: string }>): ErrorStats[] => {
      const errorMap: Record<string, { count: number; lastOccurrence: string }> = {};
      
      tasks.forEach(task => {
        const errorMsg = task.error?.substring(0, 100) || 'Unknown error';
        if (!errorMap[errorMsg]) {
          errorMap[errorMsg] = { count: 0, lastOccurrence: '' };
        }
        errorMap[errorMsg].count++;
        errorMap[errorMsg].lastOccurrence = task.created_at;
      });
      
      return Object.entries(errorMap)
        .map(([error, data]) => ({
          error,
          count: data.count,
          lastOccurrence: data.lastOccurrence,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    };

    // 计算业务指标
    const calculateBusiness = (users: Array<{ balance: number; total_used: number; total_purchased: number }>) => {
      return {
        totalBalance: users.reduce((sum, u) => sum + (u.balance || 0), 0),
        totalUsed: users.reduce((sum, u) => sum + (u.total_used || 0), 0),
        totalPurchased: users.reduce((sum, u) => sum + (u.total_purchased || 0), 0),
        activeUsersCount: users.filter(u => u.total_used > 0).length,
      };
    };

    // 组装数据
    const topUsers = await processTopUsers(topUsersData.data || []);
    const business = calculateBusiness(businessData.data || []);
    const [lastHourTasks, pendingTasks, processingTasks] = realtimeData;

    const analyticsData: AnalyticsData = {
      overview: {
        today: {
          tasks: todayTasks.data?.length || 0,
          users: getUniqueUsers(todayTasks.data || []),
          successRate: calculateSuccessRate(todayTasks.data || []),
          avgTasksPerUser: todayTasks.data?.length 
            ? Math.round((todayTasks.data.length / getUniqueUsers(todayTasks.data || [])) * 10) / 10 
            : 0,
        },
        yesterday: {
          tasks: yesterdayTasks.data?.length || 0,
          users: getUniqueUsers(yesterdayTasks.data || []),
          successRate: calculateSuccessRate(yesterdayTasks.data || []),
        },
        thisWeek: {
          tasks: weekTasks.data?.length || 0,
          users: getUniqueUsers(weekTasks.data || []),
          successRate: calculateSuccessRate(weekTasks.data || []),
        },
        thisMonth: {
          tasks: monthTasks.data?.length || 0,
          users: getUniqueUsers(monthTasks.data || []),
          successRate: calculateSuccessRate(monthTasks.data || []),
        },
        allTime: {
          tasks: allTasks.data?.length || 0,
          users: allUsers.data?.length || 0,
          successRate: calculateSuccessRate(allTasks.data || []),
        },
      },
      trends: {
        hourly: processHourlyStats(hourlyTasks.data || []),
        daily: processDailyStats(dailyTasks.data || []),
      },
      topUsers,
      errors: processErrors(errors.data || []),
      realtime: {
        activeUsers: getUniqueUsers(lastHourTasks.data || []),
        pendingTasks: pendingTasks.data?.length || 0,
        processingTasks: processingTasks.data?.length || 0,
        lastHourTasks: lastHourTasks.data?.length || 0,
      },
      business: {
        ...business,
        newUsersToday: todayUsers.data?.length || 0,
        newUsersThisWeek: weekUsers.data?.length || 0,
      },
    };

    return NextResponse.json({
      success: true,
      data: analyticsData,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '获取分析数据失败',
    }, { status: 500 });
  }
}
