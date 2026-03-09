'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Video,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  BarChart3,
  RefreshCw,
  Loader2,
  Zap,
  User,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface AnalyticsData {
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
  trends: {
    hourly: Array<{ hour: number; count: number }>;
    daily: Array<{ date: string; tasks: number; users: number; successRate: number }>;
  };
  topUsers: Array<{
    userId: string;
    userEmail?: string;
    userName?: string;
    totalTasks: number;
    todayTasks: number;
    successRate: number;
    lastActive: string;
  }>;
  errors: Array<{
    error: string;
    count: number;
    lastOccurrence: string;
  }>;
  realtime: {
    activeUsers: number;
    pendingTasks: number;
    processingTasks: number;
    lastHourTasks: number;
  };
  business: {
    totalBalance: number;
    totalUsed: number;
    totalPurchased: number;
    activeUsersCount: number;
    newUsersToday: number;
    newUsersThisWeek: number;
  };
}

interface AnalyticsPanelProps {
  token: string;
}

export default function AnalyticsPanel({ token }: AnalyticsPanelProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/analytics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success) {
        setData(result.data);
        setLastUpdate(new Date());
      } else {
        setError(result.error || '获取数据失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // 每5分钟自动刷新
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [token]);

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/20 rounded-2xl p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-red-300">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-red-500/30 rounded-lg text-red-200 hover:bg-red-500/40 transition-colors"
        >
          重试
        </button>
      </div>
    );
  }

  if (!data) return null;

  // 计算变化率
  const taskChange = data.overview.yesterday.tasks > 0
    ? ((data.overview.today.tasks - data.overview.yesterday.tasks) / data.overview.yesterday.tasks * 100).toFixed(1)
    : '0';
  const userChange = data.overview.yesterday.users > 0
    ? ((data.overview.today.users - data.overview.yesterday.users) / data.overview.yesterday.users * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">数据分析面板</h2>
          {lastUpdate && (
            <p className="text-white/50 text-sm mt-1">
              最后更新：{lastUpdate.toLocaleTimeString('zh-CN')}
            </p>
          )}
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 核心指标卡片 - 今日数据 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="今日生成"
          value={data.overview.today.tasks}
          suffix="个视频"
          icon={Video}
          color="blue"
          change={taskChange}
          changeLabel="vs 昨日"
        />
        <MetricCard
          title="今日活跃用户"
          value={data.overview.today.users}
          suffix="人"
          icon={Users}
          color="green"
          change={userChange}
          changeLabel="vs 昨日"
        />
        <MetricCard
          title="今日成功率"
          value={data.overview.today.successRate}
          suffix="%"
          icon={CheckCircle}
          color="purple"
        />
        <MetricCard
          title="人均生成"
          value={data.overview.today.avgTasksPerUser}
          suffix="个"
          icon={BarChart3}
          color="orange"
        />
      </div>

      {/* 对比数据 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/70 text-sm">昨日数据</span>
            <Calendar className="w-4 h-4 text-white/50" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-white/60 text-sm">生成量</span>
              <span className="text-white font-semibold">{data.overview.yesterday.tasks} 个</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60 text-sm">活跃用户</span>
              <span className="text-white font-semibold">{data.overview.yesterday.users} 人</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60 text-sm">成功率</span>
              <span className="text-white font-semibold">{data.overview.yesterday.successRate}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/70 text-sm">本周数据</span>
            <TrendingUp className="w-4 h-4 text-white/50" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-white/60 text-sm">生成量</span>
              <span className="text-white font-semibold">{data.overview.thisWeek.tasks} 个</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60 text-sm">活跃用户</span>
              <span className="text-white font-semibold">{data.overview.thisWeek.users} 人</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60 text-sm">成功率</span>
              <span className="text-white font-semibold">{data.overview.thisWeek.successRate}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/70 text-sm">本月数据</span>
            <Activity className="w-4 h-4 text-white/50" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-white/60 text-sm">生成量</span>
              <span className="text-white font-semibold">{data.overview.thisMonth.tasks} 个</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60 text-sm">活跃用户</span>
              <span className="text-white font-semibold">{data.overview.thisMonth.users} 人</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60 text-sm">成功率</span>
              <span className="text-white font-semibold">{data.overview.thisMonth.successRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 实时状态 & 小时分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 实时状态 */}
        <div className="bg-gradient-to-br from-[#4fa3d1]/20 to-[#1a3a6b]/20 rounded-2xl p-6 border border-[#4fa3d1]/30">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-[#4fa3d1]" />
            <h3 className="text-lg font-semibold text-white">实时状态</h3>
            <span className="ml-auto flex items-center gap-1 text-xs text-emerald-400">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              在线
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/20 rounded-xl p-4">
              <p className="text-white/60 text-xs mb-1">最近1小时</p>
              <p className="text-2xl font-bold text-white">{data.realtime.lastHourTasks}</p>
              <p className="text-white/50 text-xs">个任务</p>
            </div>
            <div className="bg-black/20 rounded-xl p-4">
              <p className="text-white/60 text-xs mb-1">活跃用户</p>
              <p className="text-2xl font-bold text-white">{data.realtime.activeUsers}</p>
              <p className="text-white/50 text-xs">人在线</p>
            </div>
            <div className="bg-black/20 rounded-xl p-4">
              <p className="text-white/60 text-xs mb-1">等待中</p>
              <p className="text-2xl font-bold text-amber-400">{data.realtime.pendingTasks}</p>
              <p className="text-white/50 text-xs">个任务</p>
            </div>
            <div className="bg-black/20 rounded-xl p-4">
              <p className="text-white/60 text-xs mb-1">处理中</p>
              <p className="text-2xl font-bold text-blue-400">{data.realtime.processingTasks}</p>
              <p className="text-white/50 text-xs">个任务</p>
            </div>
          </div>
        </div>

        {/* 今日小时分布 */}
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-white/70" />
            <h3 className="text-lg font-semibold text-white">今日时段分布</h3>
          </div>
          <div className="h-40 flex items-end gap-1">
            {data.trends.hourly.map((item) => {
              const maxCount = Math.max(...data.trends.hourly.map(h => h.count), 1);
              const height = (item.count / maxCount) * 100;
              const currentHour = new Date().getHours();
              const isCurrentHour = item.hour === currentHour;
              
              return (
                <div
                  key={item.hour}
                  className="flex-1 flex flex-col items-center justify-end group"
                >
                  <div
                    className={`w-full rounded-t transition-all ${
                      isCurrentHour
                        ? 'bg-gradient-to-t from-[#4fa3d1] to-[#60b5e8]'
                        : 'bg-white/20 group-hover:bg-white/30'
                    }`}
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${item.hour}:00 - ${item.count}个任务`}
                  />
                  {item.hour % 6 === 0 && (
                    <span className="text-white/40 text-xs mt-1">{item.hour}:00</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 用户排行 & 错误统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 用户排行 */}
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-white/70" />
            <h3 className="text-lg font-semibold text-white">用户排行榜 TOP 10</h3>
          </div>
          <div className="space-y-2">
            {data.topUsers.slice(0, 10).map((user, index) => (
              <div
                key={user.userId}
                className="flex items-center gap-3 p-3 bg-black/20 rounded-xl hover:bg-black/30 transition-colors"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 ? 'bg-yellow-500/30 text-yellow-400' :
                  index === 1 ? 'bg-gray-400/30 text-gray-300' :
                  index === 2 ? 'bg-orange-500/30 text-orange-400' :
                  'bg-white/10 text-white/60'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {user.userName || user.userEmail || '未知用户'}
                  </p>
                  <p className="text-white/50 text-xs">
                    今日 {user.todayTasks} 个 · 成功率 {user.successRate}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold">{user.totalTasks}</p>
                  <p className="text-white/50 text-xs">总任务</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 错误统计 */}
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h3 className="text-lg font-semibold text-white">错误统计 TOP 5</h3>
          </div>
          {data.errors.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
              <p className="text-emerald-400">太棒了！没有错误记录</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.errors.slice(0, 5).map((err, index) => (
                <div
                  key={index}
                  className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-red-400 font-semibold">{err.count} 次</span>
                    <span className="text-white/40 text-xs">
                      {new Date(err.lastOccurrence).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <p className="text-white/70 text-sm truncate" title={err.error}>
                    {err.error}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 业务指标 */}
      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl p-6 border border-amber-500/20">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-semibold text-white">业务指标</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-white">{data.business.totalBalance.toLocaleString()}</p>
            <p className="text-white/60 text-sm">总剩余额度</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white">{data.business.totalUsed.toLocaleString()}</p>
            <p className="text-white/60 text-sm">总消耗次数</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white">{data.business.totalPurchased.toLocaleString()}</p>
            <p className="text-white/60 text-sm">总购买次数</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white">{data.business.activeUsersCount}</p>
            <p className="text-white/60 text-sm">活跃用户数</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-emerald-400">{data.business.newUsersToday}</p>
            <p className="text-white/60 text-sm">今日新增用户</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-400">{data.business.newUsersThisWeek}</p>
            <p className="text-white/60 text-sm">本周新增用户</p>
          </div>
        </div>
      </div>

      {/* 每日趋势 */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-white/70" />
          <h3 className="text-lg font-semibold text-white">近7天趋势</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-white/50 text-sm">
                <th className="text-left p-2">日期</th>
                <th className="text-right p-2">任务数</th>
                <th className="text-right p-2">用户数</th>
                <th className="text-right p-2">成功率</th>
              </tr>
            </thead>
            <tbody>
              {data.trends.daily.map((day) => (
                <tr key={day.date} className="border-t border-white/5">
                  <td className="p-2 text-white">{day.date}</td>
                  <td className="p-2 text-right text-white font-medium">{day.tasks}</td>
                  <td className="p-2 text-right text-white">{day.users}</td>
                  <td className="p-2 text-right">
                    <span className={`font-medium ${
                      day.successRate >= 90 ? 'text-emerald-400' :
                      day.successRate >= 70 ? 'text-amber-400' :
                      'text-red-400'
                    }`}>
                      {day.successRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// 指标卡片组件
function MetricCard({
  title,
  value,
  suffix,
  icon: Icon,
  color,
  change,
  changeLabel,
}: {
  title: string;
  value: number | string;
  suffix?: string;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'purple' | 'orange';
  change?: string;
  changeLabel?: string;
}) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400',
    green: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30 text-emerald-400',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30 text-purple-400',
    orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/30 text-orange-400',
  };

  const isPositiveChange = change && parseFloat(change) >= 0;

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color].split(' ').slice(0, 2).join(' ')} rounded-2xl p-5 border ${colorClasses[color].split(' ')[2]}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-white/70 text-sm">{title}</span>
        <Icon className={`w-5 h-5 ${colorClasses[color].split(' ')[3]}`} />
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-white">{value}</span>
        {suffix && <span className="text-white/60 text-sm mb-1">{suffix}</span>}
      </div>
      {change && (
        <div className="mt-2 flex items-center gap-1">
          {isPositiveChange ? (
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-red-400" />
          )}
          <span className={`text-sm ${isPositiveChange ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositiveChange ? '+' : ''}{change}%
          </span>
          {changeLabel && <span className="text-white/40 text-xs">{changeLabel}</span>}
        </div>
      )}
    </div>
  );
}
