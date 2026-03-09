import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: '邮箱和密码为必填项' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码长度至少为6位' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 使用 Supabase Auth 注册用户
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split('@')[0],
        },
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        return NextResponse.json(
          { error: '该邮箱已被注册' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: '注册失败，请重试' },
        { status: 500 }
      );
    }

    // 为新用户创建余额记录，赠送1次免费体验
    const { error: balanceError } = await supabase
      .from('user_balances')
      .insert({
        user_id: data.user.id,
        balance: 1, // 赠送1次免费体验
        total_used: 0,
        total_purchased: 1, // 记录为赠送
      });

    if (balanceError) {
      console.error('Create balance error:', balanceError);
      // 不影响注册流程，只记录错误
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || email.split('@')[0],
      },
      message: '注册成功，获得1次免费体验额度',
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}
