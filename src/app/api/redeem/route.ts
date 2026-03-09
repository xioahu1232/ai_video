import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 兑换码兑换
export async function POST(request: NextRequest) {
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

    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: '请输入兑换码' },
        { status: 400 }
      );
    }

    // 格式化兑换码（去除空格，转大写）
    const normalizedCode = code.trim().toUpperCase();

    // 查询兑换码
    const { data: redemptionCode, error: codeError } = await supabase
      .from('redemption_codes')
      .select('*')
      .eq('code', normalizedCode)
      .single();

    if (codeError || !redemptionCode) {
      return NextResponse.json(
        { error: '兑换码不存在' },
        { status: 400 }
      );
    }

    // 检查是否已使用
    if (redemptionCode.is_used) {
      return NextResponse.json(
        { error: '该兑换码已被使用' },
        { status: 400 }
      );
    }

    // 检查是否过期
    if (redemptionCode.expires_at && new Date(redemptionCode.expires_at) < new Date()) {
      return NextResponse.json(
        { error: '该兑换码已过期' },
        { status: 400 }
      );
    }

    // 获取或创建用户余额记录
    let { data: userBalance, error: balanceError } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!userBalance && balanceError?.code === 'PGRST116') {
      const { data: newBalance, error: createError } = await supabase
        .from('user_balances')
        .insert({
          user_id: user.id,
          balance: redemptionCode.amount,
          total_used: 0,
          total_purchased: redemptionCode.amount,
        })
        .select()
        .single();

      if (createError) {
        console.error('Create balance error:', createError);
        return NextResponse.json(
          { error: '兑换失败' },
          { status: 500 }
        );
      }

      userBalance = newBalance;
    } else if (balanceError) {
      console.error('Get balance error:', balanceError);
      return NextResponse.json(
        { error: '兑换失败' },
        { status: 500 }
      );
    } else {
      // 更新用户余额
      const { error: updateError } = await supabase
        .from('user_balances')
        .update({
          balance: userBalance.balance + redemptionCode.amount,
          total_purchased: userBalance.total_purchased + redemptionCode.amount,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Update balance error:', updateError);
        return NextResponse.json(
          { error: '兑换失败' },
          { status: 500 }
        );
      }
    }

    // 标记兑换码已使用
    const { error: markUsedError } = await supabase
      .from('redemption_codes')
      .update({
        is_used: true,
        used_by: user.id,
        used_at: new Date().toISOString(),
      })
      .eq('id', redemptionCode.id);

    if (markUsedError) {
      console.error('Mark code used error:', markUsedError);
      // 回滚余额更新
      await supabase
        .from('user_balances')
        .update({
          balance: userBalance.balance,
          total_purchased: userBalance.total_purchased,
        })
        .eq('user_id', user.id);

      return NextResponse.json(
        { error: '兑换失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `兑换成功！获得 ${redemptionCode.amount} 次使用额度`,
      amount: redemptionCode.amount,
      newBalance: userBalance.balance + redemptionCode.amount,
    });
  } catch (error) {
    console.error('Redeem error:', error);
    return NextResponse.json(
      { error: '兑换失败，请稍后重试' },
      { status: 500 }
    );
  }
}
