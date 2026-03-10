'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Users,
  Ticket,
  Gift,
  BarChart3,
  LogOut,
  Menu,
  X,
  Loader2,
  Copy,
  Check,
  Trash2,
  Eye,
  RefreshCw,
  Activity,
  Database,
  HardDrive,
  AlertTriangle,
  Download,
  TrendingUp,
} from 'lucide-react';
import AnalyticsPanel from '@/components/AnalyticsPanel';

// 管理员登录表单
function AdminLogin({ onLogin }: { onLogin: (token: string, user: AdminUser) => void }) {
  const [email, setEmail] = useState('admin@changfeng.com');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem('admin_token', data.session.access_token);
        localStorage.setItem('admin_user', JSON.stringify(data.user));
        onLogin(data.session.access_token, data.user);
      } else {
        setError(data.error || '登录失败');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('登录失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a192f] via-[#1a3a6b] to-[#0a192f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8 border-b border-gray-100">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-[#1a3a6b] to-[#4fa3d1] rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-center text-gray-800">管理员登录</h1>
            <p className="text-center text-gray-500 text-sm mt-1">长风跨境 · AI视频提示词生成器</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">管理员邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 px-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4fa3d1] text-gray-800"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入管理员密码"
                className="w-full h-12 px-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4fa3d1] text-gray-800"
                required
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 rounded-xl text-red-500 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-[#1a3a6b] to-[#4fa3d1] text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  登录中...
                </>
              ) : (
                '登录管理后台'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// 类型定义
interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface InviteCode {
  id: string;
  code: string;
  batch_id: string;
  description: string;
  is_used: boolean;
  used_by_email: string;
  created_at: string;
  used_at: string;
  expires_at: string;
}

interface RedemptionCode {
  id: string;
  code: string;
  amount: number;
  batch_id: string;
  description: string;
  is_used: boolean;
  used_by: string;
  created_at: string;
  used_at: string;
  expires_at: string;
}

interface User {
  id: string;
  user_id: string;
  balance: number;
  total_used: number;
  total_purchased: number;
  role: string;
  created_at: string;
  email?: string;
}

interface Stats {
  totalUsers: number;
  totalTasks: number;
  totalInviteCodes: number;
  usedInviteCodes: number;
  totalRedemptionCodes: number;
  usedRedemptionCodes: number;
}

// 管理员仪表盘
function AdminDashboard({ token, user, onLogout }: { token: string; user: AdminUser; onLogout: () => void }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'invites' | 'redemption' | 'users' | 'health' | 'config'>('analytics');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [redemptionCodes, setRedemptionCodes] = useState<RedemptionCode[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 生成表单状态
  const [generateCount, setGenerateCount] = useState(10);
  const [generateAmount, setGenerateAmount] = useState(10);
  const [generateDescription, setGenerateDescription] = useState('');
  const [generateExpiresDays, setGenerateExpiresDays] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);

  // 加载统计数据
  useEffect(() => {
    loadStats();
    loadInviteCodes();
    loadRedemptionCodes();
    loadUsers();
  }, [token]);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Load stats error:', err);
    }
  };

  const loadInviteCodes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/invites', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setInviteCodes(data.codes || []);
      }
    } catch (err) {
      console.error('Load invite codes error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRedemptionCodes = async () => {
    try {
      const res = await fetch('/api/admin/codes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setRedemptionCodes(data.codes || []);
      }
    } catch (err) {
      console.error('Load redemption codes error:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Load users error:', err);
    }
  };

  const handleGenerateCodes = async (type: 'invite' | 'redemption') => {
    setIsGenerating(true);
    try {
      const endpoint = type === 'invite' ? '/api/admin/invites' : '/api/admin/codes';
      const body = type === 'invite'
        ? {
            secret: 'changfeng-admin-2024',
            count: generateCount,
            description: generateDescription,
            expiresInDays: generateExpiresDays,
          }
        : {
            secret: 'changfeng-admin-2024',
            count: generateCount,
            amount: generateAmount,
            description: generateDescription,
            expiresInDays: generateExpiresDays,
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        alert(`成功生成 ${data.codes.length} 个${type === 'invite' ? '邀请码' : '兑换码'}！`);
        if (type === 'invite') {
          loadInviteCodes();
        } else {
          loadRedemptionCodes();
        }
        loadStats();
        setGenerateDescription('');
      } else {
        alert(data.error || '生成失败');
      }
    } catch (err) {
      console.error('Generate codes error:', err);
      alert('生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const menuItems = [
    { id: 'analytics', icon: TrendingUp, label: '数据分析' },
    { id: 'overview', icon: BarChart3, label: '数据概览' },
    { id: 'invites', icon: Gift, label: '邀请码管理' },
    { id: 'redemption', icon: Ticket, label: '兑换码管理' },
    { id: 'users', icon: Users, label: '用户管理' },
    { id: 'config', icon: Database, label: '系统配置' },
    { id: 'health', icon: Activity, label: '系统健康' },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a192f] via-[#1a3a6b] to-[#0a192f]">
      {/* 移动端菜单按钮 */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center text-white"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* 侧边栏 */}
      <div
        className={`fixed left-0 top-0 h-full w-64 bg-white/10 backdrop-blur-xl border-r border-white/10 transform transition-transform z-40 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-[#4fa3d1] to-[#1a3a6b] rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold">管理后台</h1>
              <p className="text-white/60 text-xs">长风跨境</p>
            </div>
          </div>
        </div>

        <nav className="px-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                activeTab === item.id
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4 px-4">
            <div className="w-8 h-8 bg-gradient-to-br from-[#4fa3d1] to-[#1a3a6b] rounded-full flex items-center justify-center text-white text-sm font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user.name}</p>
              <p className="text-white/60 text-xs truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>退出登录</span>
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8">
        {/* 数据分析面板 */}
        {activeTab === 'analytics' && (
          <AnalyticsPanel token={token} />
        )}

        {/* 数据概览 */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">数据概览</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-white/70 text-sm">注册用户</span>
                </div>
                <p className="text-3xl font-bold text-white">{stats?.totalUsers || 0}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-green-400" />
                  </div>
                  <span className="text-white/70 text-sm">生成任务</span>
                </div>
                <p className="text-3xl font-bold text-white">{stats?.totalTasks || 0}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <Gift className="w-5 h-5 text-purple-400" />
                  </div>
                  <span className="text-white/70 text-sm">邀请码使用</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  {stats?.usedInviteCodes || 0} / {stats?.totalInviteCodes || 0}
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                    <Ticket className="w-5 h-5 text-orange-400" />
                  </div>
                  <span className="text-white/70 text-sm">兑换码使用</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  {stats?.usedRedemptionCodes || 0} / {stats?.totalRedemptionCodes || 0}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 邀请码管理 */}
        {activeTab === 'invites' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">邀请码管理</h2>

            {/* 生成表单 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">生成新邀请码</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-white/70 text-sm mb-2 block">数量</label>
                  <input
                    type="number"
                    value={generateCount}
                    onChange={(e) => setGenerateCount(Number(e.target.value))}
                    min={1}
                    max={1000}
                    className="w-full h-10 px-4 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#4fa3d1]"
                  />
                </div>
                <div>
                  <label className="text-white/70 text-sm mb-2 block">描述</label>
                  <input
                    type="text"
                    value={generateDescription}
                    onChange={(e) => setGenerateDescription(e.target.value)}
                    placeholder="如：第一批邀请码"
                    className="w-full h-10 px-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#4fa3d1]"
                  />
                </div>
                <div>
                  <label className="text-white/70 text-sm mb-2 block">有效期（天）</label>
                  <input
                    type="number"
                    value={generateExpiresDays}
                    onChange={(e) => setGenerateExpiresDays(Number(e.target.value))}
                    min={1}
                    max={365}
                    className="w-full h-10 px-4 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#4fa3d1]"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => handleGenerateCodes('invite')}
                    disabled={isGenerating}
                    className="w-full h-10 bg-gradient-to-r from-[#4fa3d1] to-[#1a3a6b] text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Gift className="w-4 h-4" />
                    )}
                    生成邀请码
                  </button>
                </div>
              </div>
            </div>

            {/* 邀请码列表 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">邀请码列表</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      if (!confirm('确定要删除所有已使用的邀请码吗？此操作不可恢复。')) return;
                      try {
                        const res = await fetch('/api/admin/invites/used', {
                          method: 'DELETE',
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        const data = await res.json();
                        if (data.success) {
                          alert(data.message);
                          loadInviteCodes();
                        } else {
                          alert(data.error || '删除失败');
                        }
                      } catch (err) {
                        console.error('Delete used invite codes error:', err);
                        alert('删除失败');
                      }
                    }}
                    className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除已使用
                  </button>
                  <button
                    onClick={loadInviteCodes}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-4 text-white/70 text-sm font-medium">邀请码</th>
                      <th className="text-left p-4 text-white/70 text-sm font-medium">描述</th>
                      <th className="text-left p-4 text-white/70 text-sm font-medium">状态</th>
                      <th className="text-left p-4 text-white/70 text-sm font-medium">使用者</th>
                      <th className="text-left p-4 text-white/70 text-sm font-medium">创建时间</th>
                      <th className="text-left p-4 text-white/70 text-sm font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inviteCodes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-white/50">
                          暂无邀请码
                        </td>
                      </tr>
                    ) : (
                      inviteCodes.map((code) => (
                        <tr key={code.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="p-4">
                            <span className="text-white font-mono text-sm">{code.code}</span>
                          </td>
                          <td className="p-4 text-white/70 text-sm">{code.description || '-'}</td>
                          <td className="p-4">
                            {code.is_used ? (
                              <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                                已使用
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                                未使用
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-white/70 text-sm">{code.used_by_email || '-'}</td>
                          <td className="p-4 text-white/50 text-xs">{formatDate(code.created_at)}</td>
                          <td className="p-4">
                            <button
                              onClick={() => copyToClipboard(code.code, code.id)}
                              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
                            >
                              {copiedId === code.id ? (
                                <Check className="w-4 h-4 text-green-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 兑换码管理 */}
        {activeTab === 'redemption' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">兑换码管理</h2>

            {/* 生成表单 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">生成新兑换码</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="text-white/70 text-sm mb-2 block">数量</label>
                  <input
                    type="number"
                    value={generateCount}
                    onChange={(e) => setGenerateCount(Number(e.target.value))}
                    min={1}
                    max={1000}
                    className="w-full h-10 px-4 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#4fa3d1]"
                  />
                </div>
                <div>
                  <label className="text-white/70 text-sm mb-2 block">面额（次数）</label>
                  <input
                    type="number"
                    value={generateAmount}
                    onChange={(e) => setGenerateAmount(Number(e.target.value))}
                    min={1}
                    max={10000}
                    className="w-full h-10 px-4 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#4fa3d1]"
                  />
                </div>
                <div>
                  <label className="text-white/70 text-sm mb-2 block">描述</label>
                  <input
                    type="text"
                    value={generateDescription}
                    onChange={(e) => setGenerateDescription(e.target.value)}
                    placeholder="如：100次套餐"
                    className="w-full h-10 px-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#4fa3d1]"
                  />
                </div>
                <div>
                  <label className="text-white/70 text-sm mb-2 block">有效期（天）</label>
                  <input
                    type="number"
                    value={generateExpiresDays}
                    onChange={(e) => setGenerateExpiresDays(Number(e.target.value))}
                    min={1}
                    max={365}
                    className="w-full h-10 px-4 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#4fa3d1]"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => handleGenerateCodes('redemption')}
                    disabled={isGenerating}
                    className="w-full h-10 bg-gradient-to-r from-[#4fa3d1] to-[#1a3a6b] text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Ticket className="w-4 h-4" />
                    )}
                    生成兑换码
                  </button>
                </div>
              </div>
            </div>

            {/* 兑换码列表 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">兑换码列表</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      if (!confirm('确定要删除所有已使用的兑换码吗？此操作不可恢复。')) return;
                      try {
                        const res = await fetch('/api/admin/codes/used', {
                          method: 'DELETE',
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        const data = await res.json();
                        if (data.success) {
                          alert(data.message);
                          loadRedemptionCodes();
                        } else {
                          alert(data.error || '删除失败');
                        }
                      } catch (err) {
                        console.error('Delete used redemption codes error:', err);
                        alert('删除失败');
                      }
                    }}
                    className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除已使用
                  </button>
                  <button
                    onClick={loadRedemptionCodes}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-4 text-white/70 text-sm font-medium">兑换码</th>
                      <th className="text-left p-4 text-white/70 text-sm font-medium">面额</th>
                      <th className="text-left p-4 text-white/70 text-sm font-medium">描述</th>
                      <th className="text-left p-4 text-white/70 text-sm font-medium">状态</th>
                      <th className="text-left p-4 text-white/70 text-sm font-medium">创建时间</th>
                      <th className="text-left p-4 text-white/70 text-sm font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {redemptionCodes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-white/50">
                          暂无兑换码
                        </td>
                      </tr>
                    ) : (
                      redemptionCodes.map((code) => (
                        <tr key={code.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="p-4">
                            <span className="text-white font-mono text-sm">{code.code}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-[#4fa3d1] font-semibold">{code.amount}次</span>
                          </td>
                          <td className="p-4 text-white/70 text-sm">{code.description || '-'}</td>
                          <td className="p-4">
                            {code.is_used ? (
                              <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                                已使用
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                                未使用
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-white/50 text-xs">{formatDate(code.created_at)}</td>
                          <td className="p-4">
                            <button
                              onClick={() => copyToClipboard(code.code, code.id)}
                              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
                            >
                              {copiedId === code.id ? (
                                <Check className="w-4 h-4 text-green-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 用户管理 */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">用户管理</h2>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-4 text-white/70 text-sm font-medium">用户ID</th>
                      <th className="text-left p-4 text-white/70 text-sm font-medium">邮箱</th>
                      <th className="text-left p-4 text-white/70 text-sm font-medium">角色</th>
                      <th className="text-left p-4 text-white/70 text-sm font-medium">余额</th>
                      <th className="text-left p-4 text-white/70 text-sm font-medium">已使用</th>
                      <th className="text-left p-4 text-white/70 text-sm font-medium">已购买</th>
                      <th className="text-left p-4 text-white/70 text-sm font-medium">注册时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-white/50">
                          暂无用户
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="p-4">
                            <span className="text-white/70 font-mono text-xs">{u.user_id.slice(0, 8)}...</span>
                          </td>
                          <td className="p-4 text-white text-sm">{u.email || '-'}</td>
                          <td className="p-4">
                            {u.role === 'admin' ? (
                              <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                                管理员
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                                用户
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className="text-[#4fa3d1] font-semibold">{u.balance}次</span>
                          </td>
                          <td className="p-4 text-white/70 text-sm">{u.total_used}次</td>
                          <td className="p-4 text-white/70 text-sm">{u.total_purchased}次</td>
                          <td className="p-4 text-white/50 text-xs">{formatDate(u.created_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 系统配置 */}
        {activeTab === 'config' && (
          <ConfigPanel token={token} />
        )}

        {/* 系统健康监控 */}
        {activeTab === 'health' && (
          <HealthMonitor token={token} />
        )}
      </div>
    </div>
  );
}

// 健康监控组件
interface HealthData {
  status: string;
  timestamp: string;
  database: {
    connected: boolean;
    tables: Record<string, { count: number; estimatedSize: string }>;
    storage: {
      used: string;
      max: string;
      usagePercent: string;
      warning?: string;
    };
  };
  business: {
    totalBalance: number;
    totalUsed: number;
    activeRateLimits: number;
  };
  rateLimit: {
    totalEntries: number;
    activeEntries: number;
    topUsers: Array<{ key: string; count: number }>;
  };
  recommendations: string[];
}

function HealthMonitor({ token }: { token: string }) {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [maintStats, setMaintStats] = useState<{
    success?: boolean;
    recommendations?: (string | null)[];
    tasks?: { total: number; olderThan30d: number };
    invites?: { unused: number };
    codes?: { unused: number; totalValue: number };
  } | null>(null);

  const loadHealthData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/health', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setHealthData(data);
    } catch (err) {
      console.error('Load health data error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMaintStats = async () => {
    try {
      const res = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'stats' }),
      });
      const data = await res.json();
      setMaintStats(data);
    } catch (err) {
      console.error('Load maintenance stats error:', err);
    }
  };

  useEffect(() => {
    loadHealthData();
    loadMaintStats();
  }, [token]);

  const handleBackup = async () => {
    if (!confirm('确定要导出数据备份吗？备份数据将包含所有用户信息。')) return;
    
    setIsBackingUp(true);
    try {
      const res = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'backup' }),
      });
      const data = await res.json();
      
      if (data.success) {
        // 创建下载链接
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.downloadFilename;
        a.click();
        window.URL.revokeObjectURL(url);
        alert(`备份成功！导出了 ${Object.values(data.counts as Record<string, number>).reduce((a, b) => a + b, 0)} 条记录`);
      }
    } catch (err) {
      console.error('Backup error:', err);
      alert('备份失败');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleCleanup = async () => {
    if (!confirm('确定要清理过期数据吗？将删除超过30天的任务记录和已使用超过90天的邀请码/兑换码。')) return;
    
    setIsCleaningUp(true);
    try {
      const res = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'cleanup', options: { daysToKeep: 30 } }),
      });
      const data = await res.json();
      
      if (data.success) {
        alert(`清理完成！共删除 ${data.totalDeleted} 条记录`);
        loadHealthData();
        loadMaintStats();
      }
    } catch (err) {
      console.error('Cleanup error:', err);
      alert('清理失败');
    } finally {
      setIsCleaningUp(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  const storageWarning = healthData?.database?.storage?.warning;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">系统健康监控</h2>
        <button
          onClick={loadHealthData}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* 存储告警 */}
      {storageWarning && (
        <div className="bg-orange-500/20 border border-orange-500/30 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-400" />
          <span className="text-orange-200">{storageWarning}</span>
        </div>
      )}

      {/* 快捷操作 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={handleBackup}
          disabled={isBackingUp}
          className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/20 transition-colors text-left group"
        >
          <div className="flex items-center gap-3 mb-2">
            <Download className="w-5 h-5 text-blue-400" />
            <span className="text-white font-semibold">数据备份</span>
          </div>
          <p className="text-white/60 text-sm">导出所有数据为 JSON 文件</p>
          {isBackingUp && <Loader2 className="w-4 h-4 text-white animate-spin mt-2" />}
        </button>

        <button
          onClick={handleCleanup}
          disabled={isCleaningUp}
          className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/20 transition-colors text-left group"
        >
          <div className="flex items-center gap-3 mb-2">
            <Trash2 className="w-5 h-5 text-red-400" />
            <span className="text-white font-semibold">数据清理</span>
          </div>
          <p className="text-white/60 text-sm">清理超过30天的历史记录</p>
          {isCleaningUp && <Loader2 className="w-4 h-4 text-white animate-spin mt-2" />}
        </button>
      </div>

      {/* 数据库状态 */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold text-white">数据库状态</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {healthData?.database?.tables && Object.entries(healthData.database.tables).map(([name, info]) => (
            <div key={name} className="bg-white/5 rounded-xl p-4">
              <p className="text-white/70 text-sm mb-1">{name}</p>
              <p className="text-xl font-bold text-white">{info.count} 条</p>
              <p className="text-white/50 text-xs">{info.estimatedSize}</p>
            </div>
          ))}
        </div>

        {/* 存储使用情况 */}
        <div className="bg-white/5 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-white/70" />
              <span className="text-white/70 text-sm">存储使用</span>
            </div>
            <span className="text-white font-semibold">
              {healthData?.database?.storage?.used} / {healthData?.database?.storage?.max}
            </span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                parseFloat(healthData?.database?.storage?.usagePercent || '0') > 80
                  ? 'bg-orange-500'
                  : 'bg-green-500'
              }`}
              style={{ width: healthData?.database?.storage?.usagePercent }}
            />
          </div>
          <p className="text-white/50 text-xs mt-2">
            使用率：{healthData?.database?.storage?.usagePercent}
          </p>
        </div>
      </div>

      {/* 限流状态 */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">请求限流状态</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-white/70 text-sm mb-1">活跃限流记录</p>
            <p className="text-xl font-bold text-white">{healthData?.rateLimit?.activeEntries || 0}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-white/70 text-sm mb-1">总余额（次）</p>
            <p className="text-xl font-bold text-white">{healthData?.business?.totalBalance || 0}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-white/70 text-sm mb-1">总使用量（次）</p>
            <p className="text-xl font-bold text-white">{healthData?.business?.totalUsed || 0}</p>
          </div>
        </div>

        {healthData?.rateLimit?.topUsers && healthData.rateLimit.topUsers.length > 0 && (
          <div className="mt-4">
            <p className="text-white/70 text-sm mb-2">高频请求用户</p>
            <div className="space-y-2">
              {healthData.rateLimit.topUsers.slice(0, 5).map((user, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                  <span className="text-white/70 text-sm">{user.key}</span>
                  <span className="text-white font-medium">{user.count} 次/分钟</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 维护建议 */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">系统建议</h3>
        <ul className="space-y-2">
          {healthData?.recommendations?.map((rec, idx) => (
            <li key={idx} className="text-white/70 text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
              {rec as string}
            </li>
          ))}
        </ul>

        {maintStats?.recommendations && Array.isArray(maintStats.recommendations) && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-white/70 text-sm mb-2">优化建议</p>
            <ul className="space-y-2">
              {((maintStats.recommendations as string[]) || []).filter((r): r is string => Boolean(r)).map((rec, idx) => (
                <li key={idx} className="text-orange-300/80 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// 系统配置面板组件
function ConfigPanel({ token }: { token: string }) {
  const [configs, setConfigs] = useState<Array<{ key: string; value: string; description?: string; hasValue?: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/config', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.configs) {
        setConfigs(data.configs);
      }
    } catch (err) {
      console.error('Failed to fetch configs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, [token]);

  const handleSave = async (key: string, value: string, description?: string) => {
    setSaving(key);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key, value, description }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: '配置已保存' });
        setEditKey(null);
        setEditValue('');
        fetchConfigs();
      } else {
        setMessage({ type: 'error', text: data.error || '保存失败' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: '保存失败，请重试' });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">系统配置</h2>
        <button
          onClick={fetchConfigs}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          刷新
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">API 配置</h3>
          <p className="text-white/50 text-sm mt-1">配置 Coze API Key 和工作流 ID，配置后立即生效</p>
        </div>
        
        <div className="divide-y divide-white/10">
          {configs.map((config) => (
            <div key={config.key} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-white font-medium">{config.key === 'coze_api_key' ? 'Coze API Key' : config.key}</p>
                  <p className="text-white/50 text-sm">{config.description}</p>
                </div>
                {config.hasValue && (
                  <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full">已配置</span>
                )}
              </div>
              
              {editKey === config.key ? (
                <div className="space-y-3">
                  <input
                    type={config.key === 'coze_api_key' ? 'password' : 'text'}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder={`请输入${config.key === 'coze_api_key' ? 'API Key' : config.key}`}
                    className="w-full h-10 px-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#4fa3d1]"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(config.key, editValue, config.description)}
                      disabled={saving === config.key}
                      className="px-4 py-2 bg-[#4fa3d1] text-white rounded-lg hover:bg-[#3d8ab8] transition-colors disabled:opacity-50"
                    >
                      {saving === config.key ? '保存中...' : '保存'}
                    </button>
                    <button
                      onClick={() => { setEditKey(null); setEditValue(''); }}
                      className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="text-white/70 text-sm flex-1">
                    {config.hasValue ? `当前值: ${config.value}` : '未配置'}
                  </p>
                  <button
                    onClick={() => { setEditKey(config.key); setEditValue(''); }}
                    className="px-3 py-1.5 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20 transition-colors"
                  >
                    {config.hasValue ? '修改' : '配置'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-300 font-medium">注意事项</p>
            <ul className="text-yellow-200/70 text-sm mt-1 space-y-1">
              <li>• API Key 配置后立即生效，无需重启服务</li>
              <li>• 数据库配置优先级高于环境变量配置</li>
              <li>• 请妥善保管 API Key，不要泄露给他人</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// 主页面组件
export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token');
    const savedUser = localStorage.getItem('admin_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (newToken: string, newUser: AdminUser) => {
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setToken(null);
    setUser(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a192f] via-[#1a3a6b] to-[#0a192f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!token || !user) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return <AdminDashboard token={token} user={user} onLogout={handleLogout} />;
}
