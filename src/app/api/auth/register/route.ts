import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, inviteCode } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: '邮箱和密码为必填项' },
        { status: 400 }
      );
    }

    if (!inviteCode) {
      return NextResponse.json(
        { error: '邀请码为必填项' },
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

    // 验证邀请码
    const normalizedInviteCode = inviteCode.trim().toUpperCase();
    
    const { data: inviteCodeRecord, error: inviteCodeError } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', normalizedInviteCode)
      .single();

    if (inviteCodeError || !inviteCodeRecord) {
      return NextResponse.json(
        { error: '邀请码不存在' },
        { status: 400 }
      );
    }

    // 检查邀请码是否已使用
    if (inviteCodeRecord.is_used) {
      return NextResponse.json(
        { error: '该邀请码已被使用' },
        { status: 400 }
      );
    }

    // 检查邀请码是否过期
    if (inviteCodeRecord.expires_at && new Date(inviteCodeRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { error: '该邀请码已过期' },
        { status: 400 }
      );
    }

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

    // 标记邀请码已使用
    const { error: markInviteCodeError } = await supabase
      .from('invite_codes')
      .update({
        is_used: true,
        used_by: data.user.id,
        used_by_email: email,
        used_at: new Date().toISOString(),
      })
      .eq('id', inviteCodeRecord.id);

    if (markInviteCodeError) {
      console.error('Mark invite code used error:', markInviteCodeError);
      // 不影响注册流程，但记录错误
    }

    // 为新用户创建余额记录，赠送5次免费体验
    // 同时保存用户邮箱和姓名，便于管理后台显示
    const { error: balanceError } = await supabase
      .from('user_balances')
      .insert({
        user_id: data.user.id,
        email: email,
        name: name || email.split('@')[0],
        balance: 5, // 赠送5次免费体验
        total_used: 0,
        total_purchased: 5, // 记录为赠送
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
      message: '注册成功，获得5次免费体验额度',
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}
