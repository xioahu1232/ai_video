import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 从环境变量获取管理员账户配置（安全）
const getAdminCredentials = () => ({
  email: process.env.ADMIN_EMAIL || 'admin@changfeng.com',
  password: process.env.ADMIN_PASSWORD || '',
  name: process.env.ADMIN_NAME || '管理员',
});

// 获取客户端真实IP
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  return 'unknown';
}

// 记录登录日志
async function logLoginAttempt(
  supabase: ReturnType<typeof getSupabaseClient>,
  data: {
    email: string;
    success: boolean;
    ipAddress: string;
    userAgent: string;
    errorMessage?: string;
  }
) {
  try {
    await supabase.from('login_logs').insert({
      email: data.email,
      login_type: 'admin',
      success: data.success,
      ip_address: data.ipAddress,
      user_agent: data.userAgent,
      error_message: data.errorMessage,
    });
  } catch (error) {
    console.error('Failed to log login attempt:', error);
  }
}

export async function POST(request: NextRequest) {
  const adminCredentials = getAdminCredentials();
  
  // 检查环境变量是否配置
  if (!adminCredentials.password) {
    console.error('ADMIN_PASSWORD not configured in environment variables');
    return NextResponse.json(
      { error: '管理员账户未配置' },
      { status: 500 }
    );
  }
  
  try {
    const { email, password } = await request.json();
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    if (!email || !password) {
      return NextResponse.json(
        { error: '请输入邮箱和密码' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 验证管理员账户
    const isAdmin = 
      email.toLowerCase() === adminCredentials.email.toLowerCase() && 
      password === adminCredentials.password;

    if (!isAdmin) {
      // 记录失败日志
      await logLoginAttempt(supabase, {
        email,
        success: false,
        ipAddress: clientIP,
        userAgent,
        errorMessage: '邮箱或密码错误',
      });
      
      return NextResponse.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      );
    }

    // 检查管理员是否已在auth.users中注册
    let authData;

    // 尝试登录
    const signInResult = await supabase.auth.signInWithPassword({
      email: adminCredentials.email,
      password: adminCredentials.password,
    });

    if (signInResult.error) {
      // 如果用户不存在，创建管理员账户
      if (signInResult.error.message.includes('Invalid login credentials')) {
        const signUpResult = await supabase.auth.signUp({
          email: adminCredentials.email,
          password: adminCredentials.password,
          options: {
            data: {
              name: adminCredentials.name,
              role: 'admin',
            },
          },
        });

        if (signUpResult.error) {
          console.error('Create admin error:', signUpResult.error);
          await logLoginAttempt(supabase, {
            email,
            success: false,
            ipAddress: clientIP,
            userAgent,
            errorMessage: '管理员账户初始化失败',
          });
          return NextResponse.json(
            { error: '管理员账户初始化失败' },
            { status: 500 }
          );
        }

        authData = signUpResult.data;

        // 创建管理员余额记录
        await supabase.from('user_balances').upsert({
          user_id: authData.user?.id,
          email: adminCredentials.email,
          name: adminCredentials.name,
          balance: 999999,
          total_used: 0,
          total_purchased: 999999,
          role: 'admin',
        });
      } else {
        console.error('Admin login error:', signInResult.error);
        await logLoginAttempt(supabase, {
          email,
          success: false,
          ipAddress: clientIP,
          userAgent,
          errorMessage: signInResult.error.message,
        });
        return NextResponse.json(
          { error: '登录失败' },
          { status: 500 }
        );
      }
    } else {
      authData = signInResult.data;
    }

    // 记录成功日志
    await logLoginAttempt(supabase, {
      email: adminCredentials.email,
      success: true,
      ipAddress: clientIP,
      userAgent,
    });

    // 返回登录信息
    return NextResponse.json({
      success: true,
      user: {
        id: authData.user?.id,
        email: adminCredentials.email,
        name: adminCredentials.name,
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
