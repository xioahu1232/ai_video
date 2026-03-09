import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取用户列表
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

    // 获取用户列表（关联auth.users获取邮箱）
    const { data: users, error } = await supabase
      .from('user_balances')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Get users error:', error);
      return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 });
    }

    // 获取每个用户的邮箱
    const usersWithEmail = await Promise.all(
      (users || []).map(async (u) => {
        try {
          // 通过admin API获取用户邮箱需要特殊权限，这里使用invite_codes表中的记录来关联
          const { data: inviteRecord } = await supabase
            .from('invite_codes')
            .select('used_by_email')
            .eq('used_by', u.user_id)
            .single();

          return {
            ...u,
            email: inviteRecord?.used_by_email || null,
          };
        } catch {
          return { ...u, email: null };
        }
      })
    );

    return NextResponse.json({
      success: true,
      users: usersWithEmail,
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 });
  }
}
