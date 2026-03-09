import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取用户余额
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const supabase = getSupabaseClient(token);

    // 验证用户
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: '登录已过期，请重新登录' },
        { status: 401 }
      );
    }

    // 获取或创建用户余额记录
    let { data: balance, error } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // 如果没有记录，创建一个
    if (!balance && error?.code === 'PGRST116') {
      const { data: newBalance, error: createError } = await supabase
        .from('user_balances')
        .insert({
          user_id: user.id,
          balance: 0,
          total_used: 0,
          total_purchased: 0,
        })
        .select()
        .single();

      if (createError) {
        console.error('Create balance error:', createError);
        return NextResponse.json(
          { error: '初始化余额失败' },
          { status: 500 }
        );
      }

      balance = newBalance;
    } else if (error) {
      console.error('Get balance error:', error);
      return NextResponse.json(
        { error: '获取余额失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      balance: {
        balance: balance.balance,
        totalUsed: balance.total_used,
        totalPurchased: balance.total_purchased,
      },
    });
  } catch (error) {
    console.error('Get balance error:', error);
    return NextResponse.json(
      { error: '获取余额失败' },
      { status: 500 }
    );
  }
}
