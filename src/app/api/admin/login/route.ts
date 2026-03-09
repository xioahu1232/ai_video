import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 管理员账户配置（生产环境应存储在数据库或环境变量中）
const ADMIN_ACCOUNTS = [
  {
    email: 'admin@changfeng.com',
    password: 'Admin@2024',
    name: '长风跨境管理员',
  },
];

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: '请输入邮箱和密码' },
        { status: 400 }
      );
    }

    // 验证管理员账户
    const admin = ADMIN_ACCOUNTS.find(
      (a) => a.email.toLowerCase() === email.toLowerCase() && a.password === password
    );

    if (!admin) {
      return NextResponse.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseClient();

    // 检查管理员是否已在auth.users中注册
    let authData;
    let authError;

    // 尝试登录
    const signInResult = await supabase.auth.signInWithPassword({
      email: admin.email,
      password: admin.password,
    });

    if (signInResult.error) {
      // 如果用户不存在，创建管理员账户
      if (signInResult.error.message.includes('Invalid login credentials')) {
        const signUpResult = await supabase.auth.signUp({
          email: admin.email,
          password: admin.password,
          options: {
            data: {
              name: admin.name,
              role: 'admin',
            },
          },
        });

        if (signUpResult.error) {
          console.error('Create admin error:', signUpResult.error);
          return NextResponse.json(
            { error: '管理员账户初始化失败' },
            { status: 500 }
          );
        }

        authData = signUpResult.data;

        // 创建管理员余额记录
        await supabase.from('user_balances').upsert({
          user_id: authData.user?.id,
          balance: 999999, // 管理员无限额度
          total_used: 0,
          total_purchased: 999999,
          role: 'admin',
        });
      } else {
        console.error('Admin login error:', signInResult.error);
        return NextResponse.json(
          { error: '登录失败' },
          { status: 500 }
        );
      }
    } else {
      authData = signInResult.data;
    }

    // 返回登录信息
    return NextResponse.json({
      success: true,
      user: {
        id: authData.user?.id,
        email: admin.email,
        name: admin.name,
        role: 'admin',
      },
      session: {
        access_token: authData.session?.access_token,
        refresh_token: authData.session?.refresh_token,
        expires_at: authData.session?.expires_at,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: '登录失败' },
      { status: 500 }
    );
  }
}
