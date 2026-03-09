import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 删除已使用的邀请码
 * 
 * DELETE /api/admin/invites/used
 * 
 * 功能：删除所有 is_used = true 的邀请码
 * 需要管理员权限
 */
export async function DELETE(request: NextRequest) {
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

    // 检查是否是管理员
    const { data: userBalance } = await supabase
      .from('user_balances')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userBalance || userBalance.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }

    // 先统计要删除的记录数
    const { data: usedCodes, error: countError } = await supabase
      .from('invite_codes')
      .select('id')
      .eq('is_used', true);

    if (countError) {
      console.error('Count used invite codes error:', countError);
      return NextResponse.json({ error: '统计已使用邀请码失败' }, { status: 500 });
    }

    const count = usedCodes?.length || 0;

    if (count === 0) {
      return NextResponse.json({
        success: true,
        message: '没有需要删除的已使用邀请码',
        deletedCount: 0,
      });
    }

    // 执行删除
    const { error: deleteError } = await supabase
      .from('invite_codes')
      .delete()
      .eq('is_used', true);

    if (deleteError) {
      console.error('Delete used invite codes error:', deleteError);
      return NextResponse.json({ error: '删除已使用邀请码失败' }, { status: 500 });
    }

    console.log(`[Admin] Deleted ${count} used invite codes by ${user.email}`);

    return NextResponse.json({
      success: true,
      message: `成功删除 ${count} 个已使用的邀请码`,
      deletedCount: count,
    });
  } catch (error) {
    console.error('Delete used invite codes error:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
